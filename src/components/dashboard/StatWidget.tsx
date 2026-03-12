/**
 * Caminho: src/components/dashboard/StatWidget.tsx
 * Descrição: Componente de widget de estatística
 * Data: 18/09/2025
 * Versão: 1.0
 */

import React from 'react';
import { Card, GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Building2, 
  DollarSign, 
  Upload, 
  Target, 
  Heart,
  Coins,
  Gift,
  FileText,
  Clock,
  TrendingUp,
  ShoppingCart,
  User,
  Bell,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import type { StatWidget } from '@/types/Dashboard';

interface StatWidgetProps {
  widget: StatWidget;
  data?: {
    value: string;
    change: string;
    trend?: 'up' | 'down' | 'neutral';
  };
  loading?: boolean;
}

// Mapeamento de ícones
const iconMap: Record<string, React.ComponentType<any>> = {
  Users,
  Building2,
  DollarSign,
  Upload,
  Target,
  Heart,
  Coins,
  Gift,
  FileText,
  Clock,
  TrendingUp,
  ShoppingCart,
  User,
  Bell,
  Activity,
};

// Mapeamento de cores
const colorMap: Record<string, string> = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  yellow: 'text-yellow-600',
  red: 'text-red-600',
  gray: 'text-gray-600',
};

const StatWidget: React.FC<StatWidgetProps> = ({ 
  widget, 
  data, 
  loading = false 
}) => {
  const IconComponent = iconMap[widget.config?.icon || 'Target'] || Target;
  const colorClass = colorMap[widget.config?.color || 'blue'] || 'text-blue-600';

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <ArrowDown className="h-3 w-3 text-red-500" />;
      default:
        return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <GlassCard className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 animate-pulse">
            {widget.title}
          </CardTitle>
          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
        </CardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {widget.title}
        </CardTitle>
        <IconComponent className={`h-4 w-4 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1">
          {data?.value || widget.config?.value || '0'}
        </div>
        <div className="flex items-center space-x-1">
          {data?.change && (
            <>
              {getTrendIcon(data.trend)}
              <span className={`text-xs ${getTrendColor(data.trend)}`}>
                {data.change}
              </span>
            </>
          )}
          {!data?.change && widget.config?.change && (
            <>
              {widget.config?.showTrend !== false && getTrendIcon('neutral')}
              <span className="text-xs text-gray-600">
                {widget.config.change}
              </span>
            </>
          )}
        </div>
      </CardContent>
    </GlassCard>
  );
};

export default StatWidget;
