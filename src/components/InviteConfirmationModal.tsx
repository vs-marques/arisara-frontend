// src/components/InviteConfirmationModal.tsx
// Versão: 1.0
// Data: 19/10/2025
// Descrição: Modal de confirmação para envio de convites

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Mail, Loader2, Users } from 'lucide-react'

interface Usuario {
  id: string
  email: string
  full_name: string
  role_display: string
  sector?: string
}

interface InviteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (message: string) => void
  selectedUsers: Usuario[]
  inviting: boolean
}

const InviteConfirmationModal: React.FC<InviteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedUsers,
  inviting
}) => {
  const [message, setMessage] = useState('')

  const handleConfirm = () => {
    onConfirm(message)
  }

  const handleClose = () => {
    if (!inviting) {
      setMessage('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-green-600" />
            Confirmar Envio de Convites
          </DialogTitle>
          <DialogDescription>
            Você está prestes a enviar convites para {selectedUsers.length} usuário(s).
            Eles receberão um email com link para completar o cadastro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo dos usuários */}
          <div>
            <Label className="text-sm font-medium">Usuários selecionados:</Label>
            <div className="mt-2 max-h-40 overflow-y-auto border rounded-md p-3">
              <div className="space-y-2">
                {selectedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex-1">
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{user.role_display}</Badge>
                      {user.sector && (
                        <Badge variant="secondary">{user.sector}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mensagem personalizada */}
          <div>
            <Label htmlFor="message">Mensagem personalizada (opcional)</Label>
            <Textarea
              id="message"
              placeholder="Digite uma mensagem personalizada que será incluída no email de convite..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Informações importantes */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 mt-0.5">
                <Users className="h-4 w-4" />
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Informações importantes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Os usuários receberão um email com link personalizado</li>
                  <li>O link expira em 7 dias</li>
                  <li>Os formulários serão pré-preenchidos automaticamente</li>
                  <li>O status de acesso será atualizado para "Convidado"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={inviting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={inviting}
            className="bg-green-600 hover:bg-green-700"
          >
            {inviting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Enviar Convites
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default InviteConfirmationModal
