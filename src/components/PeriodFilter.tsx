import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  formatDateISO,
  formatPeriodRangeLabel,
  lastNDaysRange,
  startOfDay,
  endOfDay,
} from '@/lib/periodUtils';

export type PeriodPreset = '30m' | '1h' | '12h' | '1d' | '7d' | '30d';

export interface CustomPeriod {
  startDate: Date;
  endDate: Date;
}

export type PeriodType =
  | { type: 'preset'; preset: PeriodPreset }
  | { type: 'custom'; custom: CustomPeriod };

interface PeriodFilterProps {
  value: PeriodType;
  onChange: (period: PeriodType) => void;
  startDate: Date;
  endDate: Date;
  className?: string;
  buttonClassName?: string;
}

const QUICK_RANGES = [
  { days: 7, labelKey: 'dashboard.period.last7Days' as const },
  { days: 30, labelKey: 'dashboard.period.last30Days' as const },
];

const BUTTON_SURFACE =
  'rounded-xl border border-white/10 bg-white/[0.03] shadow-[0_24px_60px_-55px_rgba(0,0,0,0.55)]';

/** Fundo opaco no popover para não vazar o conteúdo do dashboard por baixo. */
const POPOVER_SURFACE =
  'rounded-xl border border-white/10 bg-[#0c0c0c] shadow-[0_24px_60px_-55px_rgba(0,0,0,0.55)]';

export default function PeriodFilter({
  value: _value,
  onChange,
  startDate,
  endDate,
  className,
  buttonClassName,
}: PeriodFilterProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(() => formatDateISO(startDate));
  const [customEnd, setCustomEnd] = useState(() => formatDateISO(endDate));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setCustomStart(formatDateISO(startDate));
    setCustomEnd(formatDateISO(endDate));
  }, [startDate, endDate]);

  const rangeLabel = formatPeriodRangeLabel(startDate, endDate, i18n.language);

  const applyQuickRange = (days: number) => {
    const { startDate: s, endDate: e } = lastNDaysRange(days);
    onChange({ type: 'custom', custom: { startDate: s, endDate: e } });
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customStart || !customEnd) return;
    const startDateParsed = startOfDay(new Date(customStart + 'T00:00:00'));
    const endDateParsed = endOfDay(new Date(customEnd + 'T00:00:00'));
    if (startDateParsed > endDateParsed) {
      alert(t('dashboard.period.invalidRange'));
      return;
    }
    const diffDays = Math.ceil(
      (endDateParsed.getTime() - startDateParsed.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 365) {
      alert(t('dashboard.period.maxRange'));
      return;
    }
    if (endDateParsed > endOfDay(new Date())) {
      alert(t('dashboard.period.noFuture'));
      return;
    }
    onChange({
      type: 'custom',
      custom: { startDate: startDateParsed, endDate: endDateParsed },
    });
    setOpen(false);
  };

  const maxDate = formatDateISO(new Date());

  return (
    <div className={cn('relative w-full min-w-[280px] max-w-[340px]', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full px-4 py-3 text-center text-sm font-medium text-white/90 transition-all hover:border-pink-500/30 hover:bg-white/[0.05]',
          BUTTON_SURFACE,
          buttonClassName
        )}
      >
        <span className="block whitespace-nowrap">{rangeLabel}</span>
      </button>

      {open && (
        <div className={cn('absolute right-0 top-full z-[9999] mt-2 w-full p-4', POPOVER_SURFACE)}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">{t('dashboard.period.title')}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/50 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {QUICK_RANGES.map((q) => (
              <button
                key={q.days}
                type="button"
                onClick={() => applyQuickRange(q.days)}
                className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-pink-500/40 hover:text-white"
              >
                {t(q.labelKey)}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-white/50">{t('dashboard.period.from')}</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                max={maxDate}
                className="input-date-dark w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-pink-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">{t('dashboard.period.to')}</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                max={maxDate}
                min={customStart || undefined}
                className="input-date-dark w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-pink-500/50 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={applyCustom}
              className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 py-2 text-sm font-medium text-white hover:shadow-lg"
            >
              {t('dashboard.period.apply')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
