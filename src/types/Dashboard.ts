/**
 * Caminho: src/types/Dashboard.ts
 * Descrição: Tipos TypeScript para sistema de dashboard dinâmico
 * Data: 18/09/2025
 * Versão: 1.0
 */

import type { Role } from './User';

// =====================================================
// TIPOS BASE DE WIDGETS
// =====================================================

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export type WidgetSizeType = 'small' | 'medium' | 'large' | 'xlarge';
export type WidgetType = 'stat' | 'chart' | 'table' | 'recent' | 'custom';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  component: string;
  roles: Role[];
  size: WidgetSizeType;
  position: WidgetPosition;
  visible: boolean;
  config?: Record<string, any>;
  data?: any;
}

export interface DashboardLayout {
  widgets: DashboardWidget[];
  settings: DashboardSettings;
}

export interface DashboardSettings {
  theme: 'light' | 'dark';
  density: 'compact' | 'comfortable' | 'spacious';
  columns: number;
  gap: number;
}

export interface UserDashboardPreferences {
  layout: DashboardLayout;
  version: string;
  lastUpdated: string;
}

// =====================================================
// TIPOS DE WIDGETS ESPECÍFICOS
// =====================================================

export interface StatWidget extends DashboardWidget {
  type: 'stat';
  config: {
    icon: string;
    value: string;
    change: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: string;
  };
}

export interface ChartWidget extends DashboardWidget {
  type: 'chart';
  config: {
    chartType: 'line' | 'bar' | 'pie' | 'area';
    data: any[];
    xAxis?: string;
    yAxis?: string;
    colors?: string[];
  };
}

export interface TableWidget extends DashboardWidget {
  type: 'table';
  config: {
    columns: Array<{
      key: string;
      title: string;
      type: 'string' | 'number' | 'date' | 'boolean';
    }>;
    data: any[];
    pagination?: boolean;
    pageSize?: number;
  };
}

export interface RecentWidget extends DashboardWidget {
  type: 'recent';
  config: {
    items: Array<{
      id: string;
      title: string;
      description: string;
      date: string;
      status: string;
      value?: string;
    }>;
    maxItems: number;
  };
}

// =====================================================
// TIPOS PARA REGISTRO DE WIDGETS
// =====================================================

export interface WidgetRegistry {
  [key: string]: WidgetDefinition;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  type: WidgetType;
  component: string;
  roles: Role[];
  defaultSize: WidgetSizeType;
  category: string;
  icon: string;
  configSchema?: Record<string, any>;
}

// =====================================================
// TIPOS PARA CONFIGURAÇÃO
// =====================================================

export interface WidgetConfigModal {
  isOpen: boolean;
  selectedWidgets: string[];
  availableWidgets: WidgetDefinition[];
  currentLayout: DashboardLayout;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  role: Role;
  widgets: Array<{
    widgetId: string;
    position: WidgetPosition;
    size: WidgetSizeType;
    visible: boolean;
  }>;
}

// =====================================================
// TIPOS PARA API
// =====================================================

export interface DashboardPreferencesResponse {
  success: boolean;
  data: UserDashboardPreferences;
  timestamp: string;
}

export interface SaveDashboardPreferencesRequest {
  preferences: UserDashboardPreferences;
}

export interface SaveDashboardPreferencesResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

// =====================================================
// TIPOS PARA DRAG & DROP
// =====================================================

export interface DragDropContext {
  draggedWidget: DashboardWidget | null;
  dropTarget: string | null;
  isDragging: boolean;
}

export interface GridLayoutProps {
  widgets: DashboardWidget[];
  onWidgetMove: (widgetId: string, newPosition: WidgetPosition) => void;
  onWidgetResize: (widgetId: string, newSize: WidgetSizeType) => void;
  onWidgetRemove: (widgetId: string) => void;
  onWidgetToggle: (widgetId: string, visible: boolean) => void;
}

// =====================================================
// TIPOS PARA HOOKS
// =====================================================

export interface UseDashboardReturn {
  preferences: UserDashboardPreferences | null;
  loading: boolean;
  error: string | null;
  savePreferences: (preferences: UserDashboardPreferences) => Promise<void>;
  resetToDefault: () => Promise<void>;
  addWidget: (widgetId: string) => void;
  removeWidget: (widgetId: string) => void;
  moveWidget: (widgetId: string, position: WidgetPosition) => void;
  updateWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void;
}

export interface UseWidgetRegistryReturn {
  availableWidgets: WidgetDefinition[];
  widgetsByRole: Record<Role, WidgetDefinition[]>;
  getWidgetDefinition: (widgetId: string) => WidgetDefinition | undefined;
  isWidgetAvailableForRole: (widgetId: string, role: Role) => boolean;
}

// =====================================================
// CONSTANTES E ENUMS
// =====================================================

export const WIDGET_SIZES: Record<WidgetSizeType, WidgetSize> = {
  small: { width: 2, height: 1 },
  medium: { width: 4, height: 2 },
  large: { width: 6, height: 3 },
  xlarge: { width: 8, height: 4 },
};

export const WIDGET_CATEGORIES = {
  STATS: 'Estatísticas',
  CHARTS: 'Gráficos',
  TABLES: 'Tabelas',
  RECENT: 'Atividades Recentes',
  CUSTOM: 'Personalizados',
} as const;

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'superadmin_default',
    name: 'Dashboard Administrador',
    description: 'Layout padrão para superadministradores',
    role: 'superadmin',
    widgets: [
      { widgetId: 'total_users', position: { x: 0, y: 0 }, size: 'medium', visible: true },
      { widgetId: 'total_companies', position: { x: 4, y: 0 }, size: 'medium', visible: true },
      { widgetId: 'total_rewards', position: { x: 8, y: 0 }, size: 'medium', visible: true },
      { widgetId: 'recent_activity', position: { x: 0, y: 2 }, size: 'large', visible: true },
    ],
  },
  {
    id: 'provider_default',
    name: 'Dashboard Provedor',
    description: 'Layout padrão para provedores',
    role: 'provider',
    widgets: [
      { widgetId: 'provider_rewards', position: { x: 0, y: 0 }, size: 'medium', visible: true },
      { widgetId: 'company_status', position: { x: 4, y: 0 }, size: 'medium', visible: true },
      { widgetId: 'recent_imports', position: { x: 0, y: 2 }, size: 'large', visible: true },
    ],
  },
  {
    id: 'consumer_default',
    name: 'Dashboard Consumidor',
    description: 'Layout padrão para consumidores',
    role: 'consumer',
    widgets: [
      { widgetId: 'points_balance', position: { x: 0, y: 0 }, size: 'medium', visible: true },
      { widgetId: 'recent_rewards', position: { x: 4, y: 0 }, size: 'medium', visible: true },
      { widgetId: 'recent_transactions', position: { x: 0, y: 2 }, size: 'large', visible: true },
    ],
  },
  {
    id: 'supplier_default',
    name: 'Dashboard Fornecedor',
    description: 'Layout padrão para fornecedores',
    role: 'supplier',
    widgets: [
      { widgetId: 'supplier_sales', position: { x: 0, y: 0 }, size: 'medium', visible: true },
      { widgetId: 'company_info', position: { x: 4, y: 0 }, size: 'medium', visible: true },
      { widgetId: 'recent_sales', position: { x: 0, y: 2 }, size: 'large', visible: true },
    ],
  },
];
