import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface HourlyHeatmapData {
  matrix: number[][];
  max_value: number;
  total_starts: number;
  timezone: string;
  start_date: string;
  end_date: string;
}

interface ConversationsHourlyHeatmapProps {
  data: HourlyHeatmapData | null;
  loading?: boolean;
  className?: string;
}

const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function cellColor(intensity: number): string {
  if (intensity <= 0) return 'rgba(255,255,255,0.04)';
  const alpha = 0.15 + intensity * 0.85;
  return `rgba(59, 130, 246, ${alpha})`;
}

export default function ConversationsHourlyHeatmap({
  data,
  loading = false,
  className,
}: ConversationsHourlyHeatmapProps) {
  const { t } = useTranslation();

  const maxVal = useMemo(() => {
    if (!data?.matrix?.length) return 0;
    return data.max_value > 0 ? data.max_value : 1;
  }, [data]);

  const hourLabels = useMemo(
    () => Array.from({ length: 24 }, (_, h) => (h % 6 === 0 ? `${h}h` : '')),
    []
  );

  if (loading) {
    return (
      <div
        className={cn(
          'rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_60px_-55px_rgba(0,0,0,0.5)]',
          className
        )}
      >
        <div className="mb-4 h-6 w-64 animate-pulse rounded bg-white/10" />
        <div className="h-48 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_60px_-55px_rgba(0,0,0,0.5)]',
        className
      )}
    >
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-white">{t('dashboard.hourlyHeatmap.title')}</h3>
        {data && (
          <span className="text-xs text-white/40">
            {t('dashboard.hourlyHeatmap.total', { count: data.total_starts })}
          </span>
        )}
      </div>
      <p className="mb-5 text-sm text-white/50">{t('dashboard.hourlyHeatmap.subtitle')}</p>

      {!data || data.total_starts === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 py-12 text-center text-sm text-white/40">
          {t('dashboard.hourlyHeatmap.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div
              className="grid gap-[3px]"
              style={{
                gridTemplateColumns: '48px repeat(24, minmax(0, 1fr))',
              }}
            >
              <div />
              {hourLabels.map((label, h) => (
                <div key={`h-${h}`} className="text-center text-[10px] text-white/35">
                  {label}
                </div>
              ))}

              {data.matrix.map((row, dow) => (
                <Fragment key={`row-${dow}`}>
                  <div className="flex items-center pr-2 text-xs font-medium text-white/60">
                    {t(`dashboard.hourlyHeatmap.dow.${DOW_KEYS[dow]}`)}
                  </div>
                  {row.map((val, hour) => {
                    const intensity = maxVal > 0 ? val / maxVal : 0;
                    return (
                      <div
                        key={`${dow}-${hour}`}
                        title={t('dashboard.hourlyHeatmap.cellTooltip', {
                          day: t(`dashboard.hourlyHeatmap.dow.${DOW_KEYS[dow]}`),
                          hour,
                          value: val.toFixed(1),
                        })}
                        className="aspect-square min-h-[14px] rounded-sm transition-colors"
                        style={{ backgroundColor: cellColor(intensity) }}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-white/40">
              <span>{t('dashboard.hourlyHeatmap.less')}</span>
              <div className="flex gap-0.5">
                {[0, 0.25, 0.5, 0.75, 1].map((i) => (
                  <div
                    key={i}
                    className="h-3 w-5 rounded-sm"
                    style={{ backgroundColor: cellColor(i) }}
                  />
                ))}
              </div>
              <span>{t('dashboard.hourlyHeatmap.more')}</span>
            </div>
            <p className="mt-2 text-right text-[10px] text-white/30">
              {t('dashboard.hourlyHeatmap.timezone', { tz: data.timezone })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
