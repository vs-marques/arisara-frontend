import type { ElementType } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: ElementType;
  trend: {
    value: string;
    isPositive: boolean;
  };
}

export default function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  const trendColor = trend.isPositive ? 'text-emerald-400' : 'text-rose-400';
  const trendPrefix = trend.isPositive ? '▲' : '▼';

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-6 py-6 transition-transform duration-300 ease-out hover:-translate-y-1 hover:border-[#EC4899]/50 hover:shadow-[0_30px_80px_-50px_rgba(236,72,153,0.65)]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-40" aria-hidden="true" />
      <div className="relative flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium uppercase tracking-[0.2em] text-gray-400">
            {title}
          </span>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <Icon className="h-5 w-5 text-[#EC4899]" />
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <span className="text-4xl font-semibold text-white">{value}</span>
          <span className={`text-xs font-semibold ${trendColor}`}>
            {trendPrefix} {trend.value}
          </span>
        </div>
      </div>
    </div>
  );
}

