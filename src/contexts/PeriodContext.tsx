import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { PeriodType, PeriodPreset } from '../components/PeriodFilter';
import {
  formatDateISO,
  getStartDateFromPeriod,
  getEndDateFromPeriod,
  getDaysFromPeriod,
  getHoursFromPeriod,
  lastNDaysRange,
} from '../lib/periodUtils';

export interface PeriodQueryParams {
  start_date: string;
  end_date: string;
  days: number;
}

interface PeriodContextType {
  period: PeriodType;
  setPeriod: (period: PeriodType) => void;
  getDays: () => number;
  getHours: () => number;
  getStartDate: () => Date;
  getEndDate: () => Date;
  getPeriodQueryParams: () => PeriodQueryParams;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

function defaultPeriod(): PeriodType {
  const { startDate, endDate } = lastNDaysRange(7);
  return { type: 'custom', custom: { startDate, endDate } };
}

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<PeriodType>(defaultPeriod);

  const getHours = useCallback((): number => getHoursFromPeriod(period), [period]);

  const getDays = useCallback((): number => getDaysFromPeriod(period), [period]);

  const getStartDate = useCallback((): Date => getStartDateFromPeriod(period), [period]);

  const getEndDate = useCallback((): Date => getEndDateFromPeriod(period), [period]);

  const getPeriodQueryParams = useCallback((): PeriodQueryParams => {
    const start = getStartDateFromPeriod(period);
    const end = getEndDateFromPeriod(period);
    return {
      start_date: formatDateISO(start),
      end_date: formatDateISO(end),
      days: getDaysFromPeriod(period),
    };
  }, [period]);

  return (
    <PeriodContext.Provider
      value={{
        period,
        setPeriod,
        getDays,
        getHours,
        getStartDate,
        getEndDate,
        getPeriodQueryParams,
      }}
    >
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  const context = useContext(PeriodContext);
  if (context === undefined) {
    throw new Error('usePeriod must be used within a PeriodProvider');
  }
  return context;
}

export type { PeriodPreset };
