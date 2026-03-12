import { createContext, useContext, useState, ReactNode } from 'react';
import { PeriodType, PeriodPreset } from '../components/PeriodFilter';

interface PeriodContextType {
  period: PeriodType;
  setPeriod: (period: PeriodType) => void;
  getDays: () => number;
  getHours: () => number;
  getStartDate: () => Date;
  getEndDate: () => Date;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<PeriodType>({ type: 'preset', preset: '30d' });

  const getHours = (): number => {
    if (period.type === 'preset') {
      const hoursMap: Record<PeriodPreset, number> = {
        '30m': 0.5,
        '1h': 1,
        '12h': 12,
        '1d': 24,
        '7d': 168,
        '30d': 720
      };
      return hoursMap[period.preset];
    } else {
      const diffTime = period.custom.endDate.getTime() - period.custom.startDate.getTime();
      return diffTime / (1000 * 60 * 60);
    }
  };

  const getDays = (): number => {
    if (period.type === 'preset') {
      const daysMap: Record<PeriodPreset, number> = {
        '30m': 1, // Mínimo de 1 dia para queries SQL
        '1h': 1,
        '12h': 1,
        '1d': 1,
        '7d': 7,
        '30d': 30
      };
      return daysMap[period.preset];
    } else {
      const diffTime = period.custom.endDate.getTime() - period.custom.startDate.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  };

  const getStartDate = (): Date => {
    if (period.type === 'preset') {
      const endDate = new Date();
      const startDate = new Date();
      const hours = getHours();
      startDate.setTime(endDate.getTime() - hours * 60 * 60 * 1000);
      return startDate;
    } else {
      return period.custom.startDate;
    }
  };

  const getEndDate = (): Date => {
    if (period.type === 'preset') {
      return new Date();
    } else {
      return period.custom.endDate;
    }
  };

  return (
    <PeriodContext.Provider value={{ period, setPeriod, getDays, getHours, getStartDate, getEndDate }}>
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

