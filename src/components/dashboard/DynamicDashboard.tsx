/**
 * Caminho: src/components/dashboard/DynamicDashboard.tsx
 * Descrição: Componente principal do dashboard dinâmico
 * Data: 18/09/2025
 * Versão: 1.0
 */

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDynamicDashboard } from '@/hooks/useDynamicDashboard';
import { useWidgetRegistry } from '@/hooks/useWidgetRegistry';
import { Card, GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Plus, 
  Grid3X3, 
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import StatWidget from './StatWidget';
import DashboardConfigModal from './DashboardConfigModal';
import ImobiliariaManagementCards from '@/components/financial/ImobiliariaManagementCards';
import type { DashboardWidget } from '@/types/Dashboard';

const DynamicDashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    preferences, 
    loading, 
    error, 
    savePreferences, 
    resetToDefault,
    addWidget,
    removeWidget 
  } = useDynamicDashboard();
  
  const { availableWidgets, widgetStats } = useWidgetRegistry();
  const [showConfigModal, setShowConfigModal] = useState(false);

  // =====================================================
  // RENDERIZAR WIDGET BASEADO NO TIPO
  // =====================================================

  const renderWidget = (widget: DashboardWidget) => {
    switch (widget.type) {
      case 'stat':
        return (
          <StatWidget
            key={widget.id}
            widget={widget as any}
            data={{
              value: '1,234', // TODO: Buscar dados reais
              change: '12% desde o último mês',
              trend: 'up'
            }}
          />
        );
      
      case 'recent':
        return (
          <GlassCard key={widget.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                {widget.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Atividade recente 1</span>
                  <Badge variant="outline">Hoje</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Atividade recente 2</span>
                  <Badge variant="outline">Ontem</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Atividade recente 3</span>
                  <Badge variant="outline">2 dias</Badge>
                </div>
              </div>
            </CardContent>
          </GlassCard>
        );
      
      default:
        return (
          <GlassCard key={widget.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                {widget.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Widget não implementado ainda</p>
            </CardContent>
          </GlassCard>
        );
    }
  };

  // =====================================================
  // ESTADOS DE LOADING E ERRO
  // =====================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Carregando dashboard personalizado...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Erro ao carregar dashboard: {error}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">Nenhuma configuração de dashboard encontrada</p>
      </div>
    );
  }

  // =====================================================
  // RENDERIZAÇÃO PRINCIPAL
  // =====================================================

  const { layout } = preferences;
  const visibleWidgets = layout.widgets.filter(widget => widget.visible);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header do Dashboard */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Personalizado</h1>
          <p className="text-gray-600">
            Bem-vindo, {user?.full_name || user?.username} • 
            {visibleWidgets.length} widgets ativos
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Grid3X3 className="w-3 h-3" />
            <span>{visibleWidgets.length} widgets</span>
          </Badge>
          
          <Button
            variant="outline"
            onClick={() => setShowConfigModal(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
          
          <Button
            variant="outline"
            onClick={resetToDefault}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Resetar
          </Button>
        </div>
      </div>

      {/* Estatísticas dos Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm text-gray-600">Total de Widgets</span>
            </div>
            <p className="text-2xl font-bold">{widgetStats.total}</p>
          </CardContent>
        </GlassCard>
        
        <GlassCard>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-gray-600">Disponíveis</span>
            </div>
            <p className="text-2xl font-bold">{widgetStats.available}</p>
          </CardContent>
        </GlassCard>
        
        <GlassCard>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span className="text-sm text-gray-600">Ativos</span>
            </div>
            <p className="text-2xl font-bold">{visibleWidgets.length}</p>
          </CardContent>
        </GlassCard>
        
        <GlassCard>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-600 rounded-full" />
              <span className="text-sm text-gray-600">Categorias</span>
            </div>
            <p className="text-2xl font-bold">{widgetStats.byCategory.length}</p>
          </CardContent>
        </GlassCard>
      </div>

      {/* Cards de Gestão da Imobiliária */}
      {(user?.role === 'superadmin' || user?.role === 'admin') && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Gestão da Imobiliária</h2>
            <ImobiliariaManagementCards showCreditarButton={true} />
          </div>
        </div>
      )}

      {/* Grid de Widgets */}
      {visibleWidgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleWidgets.map(widget => renderWidget(widget))}
        </div>
      ) : (
        <GlassCard className="text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <Grid3X3 className="h-12 w-12 text-gray-400" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum widget ativo
                </h3>
                <p className="text-gray-600 mb-4">
                  Adicione widgets ao seu dashboard para começar
                </p>
                <Button onClick={() => setShowConfigModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Widgets
                </Button>
              </div>
            </div>
          </CardContent>
        </GlassCard>
      )}

      {/* Modal de Configuração */}
      <DashboardConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={savePreferences}
        availableWidgets={availableWidgets}
        currentPreferences={preferences}
      />
    </div>
  );
};

export default DynamicDashboard;
