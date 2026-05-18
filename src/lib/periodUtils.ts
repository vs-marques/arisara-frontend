/** Helpers de período compartilhados (dashboard, analytics). */

import type { PeriodPreset, PeriodType } from '../components/PeriodFilter';

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatPeriodRangeLabel(
  start: Date,
  end: Date,
  locale: string = 'pt-BR'
): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };
  const a = start.toLocaleDateString(locale, opts);
  const b = end.toLocaleDateString(locale, opts);
  return `${a} - ${b}`;
}

export function lastNDaysRange(n: number): { startDate: Date; endDate: Date } {
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(new Date());
  startDate.setDate(startDate.getDate() - (n - 1));
  return { startDate, endDate };
}

export function getHoursFromPeriod(period: PeriodType): number {
  if (period.type === 'preset') {
    const hoursMap: Record<PeriodPreset, number> = {
      '30m': 0.5,
      '1h': 1,
      '12h': 12,
      '1d': 24,
      '7d': 168,
      '30d': 720,
    };
    return hoursMap[period.preset];
  }
  const diffTime = period.custom.endDate.getTime() - period.custom.startDate.getTime();
  return diffTime / (1000 * 60 * 60);
}

export function getDaysFromPeriod(period: PeriodType): number {
  if (period.type === 'preset') {
    const daysMap: Record<PeriodPreset, number> = {
      '30m': 1,
      '1h': 1,
      '12h': 1,
      '1d': 1,
      '7d': 7,
      '30d': 30,
    };
    return daysMap[period.preset];
  }
  const diffTime = period.custom.endDate.getTime() - period.custom.startDate.getTime();
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

export function getStartDateFromPeriod(period: PeriodType): Date {
  if (period.type === 'preset') {
    const endDate = new Date();
    const startDate = new Date();
    const hours = getHoursFromPeriod(period);
    startDate.setTime(endDate.getTime() - hours * 60 * 60 * 1000);
    return startDate;
  }
  return period.custom.startDate;
}

export function getEndDateFromPeriod(period: PeriodType): Date {
  if (period.type === 'preset') {
    return new Date();
  }
  return period.custom.endDate;
}
