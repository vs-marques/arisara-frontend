import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ArisaraSwitch } from './ui/nyoka-switch';
import { Label } from './ui/label';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [notifications, setNotifications] = useState(true);
  const [mfa, setMfa] = useState(true);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md border border-white/10 bg-[#111]/95 text-white backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">
            Preferências rápidas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/90">Notificações</p>
              <p className="text-xs text-gray-500">Receba alertas sobre novas atividades</p>
            </div>
            <ArisaraSwitch
              checked={notifications}
              onCheckedChange={setNotifications}
              id="notifications-toggle"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="mfa-toggle" className="space-y-1">
              <p className="text-sm font-medium text-white/90">MFA obrigatório</p>
              <span className="text-xs text-gray-500">
                Reforce a segurança para todos os administradores
              </span>
            </Label>
            <ArisaraSwitch
              id="mfa-toggle"
              checked={mfa}
              onCheckedChange={setMfa}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

