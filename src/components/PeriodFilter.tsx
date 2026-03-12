import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PeriodPreset = '30m' | '1h' | '12h' | '1d' | '7d' | '30d';

export interface CustomPeriod {
  startDate: Date;
  endDate: Date;
}

export type PeriodType = {
  type: 'preset';
  preset: PeriodPreset;
} | {
  type: 'custom';
  custom: CustomPeriod;
};

interface PeriodFilterProps {
  value: PeriodType;
  onChange: (period: PeriodType) => void;
  className?: string;
  buttonClassName?: string;
}

const PERIOD_KEYS: Record<PeriodPreset, string> = {
  '30m': 'common.periodFilter.period30m',
  '1h': 'common.periodFilter.period1h',
  '12h': 'common.periodFilter.period12h',
  '1d': 'common.periodFilter.period1d',
  '7d': 'common.periodFilter.period7d',
  '30d': 'common.periodFilter.period30d',
};

export default function PeriodFilter({ value, onChange, className, buttonClassName }: PeriodFilterProps) {
  const { t, i18n } = useTranslation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const locale = i18n.language === 'th' ? 'th-TH' : i18n.language === 'pt' ? 'pt-BR' : i18n.language === 'es' ? 'es' : 'en';

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetSelect = (preset: PeriodPreset) => {
    onChange({ type: 'preset', preset });
    setShowDropdown(false);
    setShowCustomPicker(false);
  };

  const handleCustomApply = () => {
    if (!customStart || !customEnd) return;
    
    const startDate = new Date(customStart);
    const endDate = new Date(customEnd);
    
    // Validações
    if (startDate > endDate) {
      alert(t('common.periodFilter.startBeforeEnd'));
      return;
    }
    
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      alert(t('common.periodFilter.max365Days'));
      return;
    }
    
    if (diffDays < 1) {
      alert(t('common.periodFilter.min1Day'));
      return;
    }
    
    if (endDate > new Date()) {
      alert(t('common.periodFilter.endNotFuture'));
      return;
    }
    
    onChange({
      type: 'custom',
      custom: {
        startDate,
        endDate
      }
    });
    setShowCustomPicker(false);
  };

  const handleCustomCancel = () => {
    setShowCustomPicker(false);
    setCustomStart('');
    setCustomEnd('');
  };

  const getPeriodLabel = () => {
    if (value.type === 'preset') {
      return t(PERIOD_KEYS[value.preset]);
    } else {
      const start = value.custom.startDate.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
      const end = value.custom.endDate.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
      return `${start} - ${end}`;
    }
  };

  // Converter para formato YYYY-MM-DD para input date
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const presets: Array<{ value: PeriodPreset; labelKey: string }> = [
    { value: '30m', labelKey: PERIOD_KEYS['30m'] },
    { value: '1h', labelKey: PERIOD_KEYS['1h'] },
    { value: '12h', labelKey: PERIOD_KEYS['12h'] },
    { value: '1d', labelKey: PERIOD_KEYS['1d'] },
    { value: '7d', labelKey: PERIOD_KEYS['7d'] },
    { value: '30d', labelKey: PERIOD_KEYS['30d'] },
  ];

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          'flex min-w-[160px] items-center justify-between gap-2 rounded-xl px-4 py-2 border border-white/10 bg-white/[0.05] text-white/80 transition-all hover:border-pink-500/30 hover:text-white',
          buttonClassName
        )}
      >
        <span className="text-sm font-medium">{getPeriodLabel()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 z-[9999] glass-panel rounded-xl p-2 border border-white/20 bg-black/98 backdrop-blur-xl shadow-xl min-w-[180px]">
          <div className="space-y-1">
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetSelect(preset.value)}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                  value.type === 'preset' && value.preset === preset.value
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/15'
                }`}
              >
                {t(preset.labelKey)}
              </button>
            ))}
            <div className="h-px bg-white/10 my-2" />
            <button
              onClick={() => {
                setShowCustomPicker(true);
                setShowDropdown(false);
              }}
              className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all text-left flex items-center gap-2 ${
                value.type === 'custom'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/15'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {value.type === 'custom' ? getPeriodLabel() : t('common.periodFilter.custom')}
            </button>
          </div>
        </div>
      )}

      {/* Custom Period Picker */}
      {showCustomPicker && (
        <div className="absolute top-full right-0 mt-2 z-[9999] glass-panel rounded-xl p-4 border border-white/20 bg-black/98 backdrop-blur-xl shadow-xl min-w-[320px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{t('common.periodFilter.customPeriodTitle')}</h3>
            <button
              onClick={handleCustomCancel}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-white/60 mb-1">{t('common.periodFilter.from')}</label>
              <input
                type="date"
                value={customStart || (value.type === 'custom' ? formatDateForInput(value.custom.startDate) : '')}
                onChange={(e) => setCustomStart(e.target.value)}
                max={formatDateForInput(new Date())}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white focus:outline-none focus:border-pink-500/50 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm text-white/60 mb-1">{t('common.periodFilter.to')}</label>
              <input
                type="date"
                value={customEnd || (value.type === 'custom' ? formatDateForInput(value.custom.endDate) : '')}
                onChange={(e) => setCustomEnd(e.target.value)}
                max={formatDateForInput(new Date())}
                min={customStart || undefined}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white focus:outline-none focus:border-pink-500/50 transition-colors"
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCustomApply}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium hover:shadow-lg transition-all"
              >
                {t('common.periodFilter.apply')}
              </button>
              <button
                onClick={handleCustomCancel}
                className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white/60 hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

