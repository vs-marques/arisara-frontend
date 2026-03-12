/**
 * Caminho: src/components/dashboard/DashboardConfigModal.tsx
 * Descrição: Modal de configuração do dashboard
 * Data: 18/09/2025
 * Versão: 1.0
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Settings, 
  Plus, 
  Minus, 
  Grid3X3,
  BarChart3,
  Table,
  Clock,
  Check
} from 'lucide-react';
import type { 
  UserDashboardPreferences, 
  WidgetDefinition 
} from '@/types/Dashboard';

interface DashboardConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: UserDashboardPreferences) => void;
  availableWidgets: WidgetDefinition[];
  currentPreferences: UserDashboardPreferences;
}

const DashboardConfigModal: React.FC<DashboardConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  availableWidgets,
  currentPreferences,
}) => {
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(
    currentPreferences.layout.widgets.map(w => w.id)
  );

  // =====================================================
  // GERENCIAR SELEÇÃO DE WIDGETS
  // =====================================================

  const toggleWidget = (widgetId: string) => {
    setSelectedWidgets(prev => 
      prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  // =====================================================
  // AGRUPAR WIDGETS POR CATEGORIA
  // =====================================================

  const widgetsByCategory = availableWidgets.reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = [];
    }
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<string, WidgetDefinition[]>);

  // =====================================================
  // OBTER ÍCONE POR TIPO
  // =====================================================

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'stat':
        return <BarChart3 className="w-4 h-4" />;
      case 'chart':
        return <BarChart3 className="w-4 h-4" />;
      case 'table':
        return <Table className="w-4 h-4" />;
      case 'recent':
        return <Clock className="w-4 h-4" />;
      default:
        return <Grid3X3 className="w-4 h-4" />;
    }
  };

  // =====================================================
  // SALVAR CONFIGURAÇÕES
  // =====================================================

  const handleSave = () => {
    // TODO: Implementar lógica de salvamento
    // Por enquanto, apenas fechar o modal
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Configurar Dashboard</span>
          </DialogTitle>
          <DialogDescription>
            Personalize seu dashboard selecionando os widgets que deseja visualizar.
            Arraste e solte para reorganizar (em breve).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {availableWidgets.length}
                </p>
                <p className="text-sm text-gray-600">Disponíveis</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {selectedWidgets.length}
                </p>
                <p className="text-sm text-gray-600">Selecionados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {Object.keys(widgetsByCategory).length}
                </p>
                <p className="text-sm text-gray-600">Categorias</p>
              </CardContent>
            </Card>
          </div>

          {/* Widgets por Categoria */}
          {Object.entries(widgetsByCategory).map(([category, widgets]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <span>{category}</span>
                <Badge variant="outline">{widgets.length}</Badge>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {widgets.map(widget => {
                  const isSelected = selectedWidgets.includes(widget.id);
                  
                  return (
                    <Card
                      key={widget.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleWidget(widget.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {getTypeIcon(widget.type)}
                              <h4 className="font-medium">{widget.name}</h4>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {widget.description}
                            </p>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {widget.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {widget.defaultSize}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            {isSelected ? (
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardConfigModal;
