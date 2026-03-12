/**
 * Caminho: src/config/widgetRegistry.ts
 * Descrição: Registro de widgets disponíveis por role
 * Data: 18/09/2025
 * Versão: 1.0
 */

import type { WidgetRegistry, WidgetDefinition, Role } from '@/types/Dashboard';

// =====================================================
// REGISTRO DE WIDGETS DISPONÍVEIS
// =====================================================

export const WIDGET_REGISTRY: WidgetRegistry = {
  // =====================================================
  // WIDGETS PARA SUPERADMIN
  // =====================================================
  
  total_users: {
    id: 'total_users',
    name: 'Total de Usuários',
    description: 'Exibe o número total de usuários ativos no sistema',
    type: 'stat',
    component: 'StatWidget',
    roles: ['superadmin'],
    defaultSize: 'medium',
    category: 'Estatísticas',
    icon: 'Users',
    configSchema: {
      icon: { type: 'string', default: 'Users' },
      showTrend: { type: 'boolean', default: true },
      color: { type: 'string', default: 'blue' },
    },
  },

  total_companies: {
    id: 'total_companies',
    name: 'Empresas Ativas',
    description: 'Mostra o número de empresas cadastradas e ativas',
    type: 'stat',
    component: 'StatWidget',
    roles: ['superadmin'],
    defaultSize: 'medium',
    category: 'Estatísticas',
    icon: 'Building2',
    configSchema: {
      icon: { type: 'string', default: 'Building2' },
      showTrend: { type: 'boolean', default: true },
      color: { type: 'string', default: 'green' },
    },
  },

  total_rewards: {
    id: 'total_rewards',
    name: 'Total de Recompensas',
    description: 'Valor total em recompensas concedidas',
    type: 'stat',
    component: 'StatWidget',
    roles: ['superadmin'],
    defaultSize: 'medium',
    category: 'Estatísticas',
    icon: 'DollarSign',
    configSchema: {
      icon: { type: 'string', default: 'DollarSign' },
      showTrend: { type: 'boolean', default: true },
      color: { type: 'string', default: 'purple' },
    },
  },

  total_imports: {
    id: 'total_imports',
    name: 'Importações Realizadas',
    description: 'Número de importações processadas no sistema',
    type: 'stat',
    component: 'StatWidget',
    roles: ['superadmin'],
    defaultSize: 'medium',
    category: 'Estatísticas',
    icon: 'Upload',
    configSchema: {
      icon: { type: 'string', default: 'Upload' },
      showTrend: { type: 'boolean', default: true },
      color: { type: 'string', default: 'orange' },
    },
  },

  recent_activity: {
    id: 'recent_activity',
    name: 'Atividades Recentes',
    description: 'Últimas atividades do sistema',
    type: 'recent',
    component: 'RecentWidget',
    roles: ['superadmin'],
    defaultSize: 'large',
    category: 'Atividades Recentes',
    icon: 'Activity',
    configSchema: {
      maxItems: { type: 'number', default: 10 },
      showTimestamp: { type: 'boolean', default: true },
    },
  },

  system_health: {
    id: 'system_health',
    name: 'Saúde do Sistema',
    description: 'Status de saúde dos componentes do sistema',
    type: 'stat',
    component: 'StatWidget',
    roles: ['superadmin'],
    defaultSize: 'small',
    category: 'Estatísticas',
    icon: 'Heart',
    configSchema: {
      icon: { type: 'string', default: 'Heart' },
      showTrend: { type: 'boolean', default: false },
      color: { type: 'string', default: 'green' },
    },
  },

  // =====================================================
  // WIDGETS PARA PROVIDER
  // =====================================================

  provider_rewards: {
    id: 'provider_rewards',
    name: 'Recompensas Concedidas',
    description: 'Valor total de recompensas concedidas pela empresa',
    type: 'stat',
    component: 'StatWidget',
    roles: ['provider'],
    defaultSize: 'medium',
    category: 'Estatísticas',
    icon: 'DollarSign',
    configSchema: {
      icon: { type: 'string', default: 'DollarSign' },
      showTrend: { type: 'boolean', default: true },
      color: { type: 'string', default: 'blue' },
    },
  },

  company_status: {
    id: 'company_status',
    name: 'Status da Empresa',
    description: 'Status atual da empresa no sistema',
    type: 'stat',
    component: 'StatWidget',
    roles: ['provider'],
    defaultSize: 'medium',
    category: 'Estatísticas',
    icon: 'Target',
    configSchema: {
      icon: { type: 'string', default: 'Target' },
      showTrend: { type: 'boolean', default: false },
      color: { type: 'string', default: 'green' },
    },
  },

  recent_imports: {
    id: 'recent_imports',
    name: 'Importações Recentes',
    description: 'Últimas importações realizadas pela empresa',
    type: 'recent',
    component: 'RecentWidget',
    roles: ['provider'],
    defaultSize: 'large',
    category: 'Atividades Recentes',
    icon: 'Upload',
    configSchema: {
      maxItems: { type: 'number', default: 5 },
      showTimestamp: { type: 'boolean', default: true },
    },
  },

  linked_users: {
    id: 'linked_users',
    name: 'Usuários Vinculados',
    description: 'Número de usuários vinculados à empresa',
    type: 'stat',
    component: 'StatWidget',
    roles: ['provider'],
    defaultSize: 'small',
    category: 'Estatísticas',
    icon: 'Users',
    configSchema: {
      icon: { type: 'string', default: 'Users' },
      showTrend: { type: 'boolean', default: true },
      color: { type: 'string', default: 'purple' },
    },
  },

  // =====================================================
  // WIDGETS PARA CONSUMER
  // =====================================================

  points_balance: {
    id: 'points_balance',
    name: 'Saldo de Pontos',
    description: 'Pontos disponíveis para uso',
    type: 'stat',
    component: 'StatWidget',
    roles: ['consumer'],
    defaultSize: 'medium',
    category: 'Estatísticas',
    icon: 'Coins',
    configSchema: {
      icon: { type: 'string', default: 'Coins' },
      showTrend: { type: 'boolean', default: true },
      color: { type: 'string', default: 'yellow' },
    },
  },

  recent_rewards: {
    id: 'recent_rewards',
    name: 'Recompensas Recentes',
    description: 'Últimas recompensas recebidas',
    type: 'recent',
    component: 'RecentWidget',
    roles: ['consumer'],
    defaultSize: 'medium',
    category: 'Atividades Recentes',
    icon: 'Gift',
    configSchema: {
      maxItems: { type: 'number', default: 5 },
      showTimestamp: { type: 'boolean', default: true },
    },
  },

  recent_transactions: {
    id: 'recent_transactions',
    name: 'Transações Recentes',
    description: 'Histórico de transações recentes',
    type: 'recent',
    component: 'RecentWidget',
    roles: ['consumer'],
    defaultSize: 'large',
    category: 'Atividades Recentes',
    icon: 'FileText',
    configSchema: {
      maxItems: { type: 'number', default: 10 },
      showTimestamp: { type: 'boolean', default: true },
    },
  },

  pending_rewards: {
    id: 'pending_rewards',
    name: 'Recompensas Pendentes',
    description: 'Recompensas aguardando liberação',
    type: 'stat',
    component: 'StatWidget',
    roles: ['consumer'],
    defaultSize: 'small',
    category: 'Estatísticas',
    icon: 'Clock',
    configSchema: {
      icon: { type: 'string', default: 'Clock' },
      showTrend: { type: 'boolean', default: false },
      color: { type: 'string', default: 'orange' },
    },
  },

  // =====================================================
  // WIDGETS PARA SUPPLIER
  // =====================================================

  supplier_sales: {
    id: 'supplier_sales',
    name: 'Vendas do Mês',
    description: 'Total de vendas realizadas no mês atual',
    type: 'stat',
    component: 'StatWidget',
    roles: ['supplier'],
    defaultSize: 'medium',
    category: 'Estatísticas',
    icon: 'TrendingUp',
    configSchema: {
      icon: { type: 'string', default: 'TrendingUp' },
      showTrend: { type: 'boolean', default: true },
      color: { type: 'string', default: 'green' },
    },
  },

  company_info: {
    id: 'company_info',
    name: 'Informações da Empresa',
    description: 'Dados básicos da empresa vinculada',
    type: 'stat',
    component: 'StatWidget',
    roles: ['supplier'],
    defaultSize: 'medium',
    category: 'Estatísticas',
    icon: 'Building2',
    configSchema: {
      icon: { type: 'string', default: 'Building2' },
      showTrend: { type: 'boolean', default: false },
      color: { type: 'string', default: 'blue' },
    },
  },

  recent_sales: {
    id: 'recent_sales',
    name: 'Vendas Recentes',
    description: 'Últimas vendas realizadas',
    type: 'recent',
    component: 'RecentWidget',
    roles: ['supplier'],
    defaultSize: 'large',
    category: 'Atividades Recentes',
    icon: 'ShoppingCart',
    configSchema: {
      maxItems: { type: 'number', default: 8 },
      showTimestamp: { type: 'boolean', default: true },
    },
  },

  pending_commissions: {
    id: 'pending_commissions',
    name: 'Comissões Pendentes',
    description: 'Comissões aguardando pagamento',
    type: 'stat',
    component: 'StatWidget',
    roles: ['supplier'],
    defaultSize: 'small',
    category: 'Estatísticas',
    icon: 'DollarSign',
    configSchema: {
      icon: { type: 'string', default: 'DollarSign' },
      showTrend: { type: 'boolean', default: false },
      color: { type: 'string', default: 'purple' },
    },
  },

  // =====================================================
  // WIDGETS COMPARTILHADOS
  // =====================================================

  profile_summary: {
    id: 'profile_summary',
    name: 'Resumo do Perfil',
    description: 'Informações básicas do usuário',
    type: 'stat',
    component: 'StatWidget',
    roles: ['superadmin', 'provider', 'consumer', 'supplier'],
    defaultSize: 'small',
    category: 'Estatísticas',
    icon: 'User',
    configSchema: {
      icon: { type: 'string', default: 'User' },
      showTrend: { type: 'boolean', default: false },
      color: { type: 'string', default: 'gray' },
    },
  },

  notifications: {
    id: 'notifications',
    name: 'Notificações',
    description: 'Notificações e alertas do sistema',
    type: 'recent',
    component: 'RecentWidget',
    roles: ['superadmin', 'provider', 'consumer', 'supplier'],
    defaultSize: 'medium',
    category: 'Atividades Recentes',
    icon: 'Bell',
    configSchema: {
      maxItems: { type: 'number', default: 5 },
      showTimestamp: { type: 'boolean', default: true },
    },
  },
};

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Obtém widgets disponíveis para um role específico
 */
export function getWidgetsByRole(role: Role): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter(widget => 
    widget.roles.includes(role)
  );
}

/**
 * Obtém widget por ID
 */
export function getWidgetById(widgetId: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[widgetId];
}

/**
 * Verifica se um widget está disponível para um role
 */
export function isWidgetAvailableForRole(widgetId: string, role: Role): boolean {
  const widget = WIDGET_REGISTRY[widgetId];
  return widget ? widget.roles.includes(role) : false;
}

/**
 * Obtém widgets agrupados por categoria
 */
export function getWidgetsByCategory(role: Role): Record<string, WidgetDefinition[]> {
  const widgets = getWidgetsByRole(role);
  const grouped: Record<string, WidgetDefinition[]> = {};
  
  widgets.forEach(widget => {
    if (!grouped[widget.category]) {
      grouped[widget.category] = [];
    }
    grouped[widget.category].push(widget);
  });
  
  return grouped;
}

/**
 * Obtém widgets por tipo
 */
export function getWidgetsByType(role: Role, type: string): WidgetDefinition[] {
  return getWidgetsByRole(role).filter(widget => widget.type === type);
}
