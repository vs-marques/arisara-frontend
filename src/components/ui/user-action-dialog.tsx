/**
 * Caminho: src/components/ui/user-action-dialog.tsx
 * Descrição: Modal de ação do usuário com cores dinâmicas para tema escuro
 * Versão: 1.3.0 – 2025-01-27
 * Histórico de Modificações:
 * - 2025-01-27: Ampliado espaçamento vertical das caixas de ação
 * - 2025-01-27: Aplicado glassmorphism nas caixas do tema claro
 * - 2025-01-27: Implementado cores dinâmicas para tema escuro
 * - 2025-07-24: Criação inicial do modal
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { AlertTriangle, UserX, Trash2, Shield } from 'lucide-react';

interface UserActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onDeactivate: () => void;
  onDelete: () => void;
}

export const UserActionDialog: React.FC<UserActionDialogProps> = ({
  open,
  onOpenChange,
  userName,
  onDeactivate,
  onDelete
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            Ação para "{userName}"
          </DialogTitle>
          <DialogDescription className="text-left space-y-4">
            <p>
              Escolha como deseja proceder com o participante <strong>{userName}</strong>:
            </p>
            
            <div className="space-y-6">
              {/* Opção 1: Desativar */}
              <div className="border rounded-lg p-6 glass-card border-blue-200 dark:border-blue-700">
                <div className="flex items-start gap-3">
                  <UserX className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Desativar Temporariamente</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                      O participante será desativado mas pode ser reativado posteriormente.
                    </p>
                    <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                      <li>• Acesso ao sistema será bloqueado</li>
                      <li>• Cadastro permanece visível na lista</li>
                      <li>• Pode ser reativado a qualquer momento</li>
                      <li>• Dados são preservados</li>
                    </ul>
                  </div>
                </div>
                <Button 
                  onClick={onDeactivate}
                  className="mt-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white w-full"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Desativar
                </Button>
              </div>

              {/* Opção 2: Excluir */}
              <div className="border rounded-lg p-6 glass-card border-red-200 dark:border-red-700">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">Excluir Definitivamente</h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                      O participante será excluído e removido da lista permanentemente.
                    </p>
                    <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                      <li>• Acesso ao sistema será bloqueado</li>
                      <li>• Cadastro será ocultado da lista</li>
                      <li>• Exclusão definitiva após 30 dias</li>
                      <li>• <strong>Esta ação não pode ser desfeita</strong></li>
                    </ul>
                  </div>
                </div>
                <Button 
                  onClick={onDelete}
                  className="mt-3 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 