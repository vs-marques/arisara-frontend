/**
 * Caminho: src/components/settings/AvatarUploader.tsx
 * Descrição: Componente para upload de avatar do usuário
 * Versão: 1.0 – 2025-12-17
 */

import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Loader2, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { uploadAvatar } from "@/services/profileService";
import { toast } from "sonner";

interface AvatarUploaderProps {
  currentAvatarUrl?: string | null;
  userName?: string;
  onUploadSuccess?: (newAvatarUrl: string) => void;
}

export default function AvatarUploader({
  currentAvatarUrl,
  userName,
  onUploadSuccess,
}: AvatarUploaderProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.");
      return;
    }

    // Validar tamanho (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Tamanho máximo: 5MB.");
      return;
    }

    // Mostrar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setIsUploading(true);
    try {
      const response = await uploadAvatar(file);
      toast.success("Avatar atualizado com sucesso!");
      onUploadSuccess?.(response.avatar_url);
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer upload do avatar");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarClick = () => {
    if (displayUrl && !isUploading) {
      setIsPreviewOpen(true);
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;
  const initials =
    userName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <>
      <div className="flex items-center gap-4">
        {/* Avatar Display */}
        <div className="relative">
          <div 
            className={`h-20 w-20 rounded-full overflow-hidden border-2 border-white/10 bg-white/5 flex items-center justify-center ${
              displayUrl ? "cursor-pointer" : ""
            }`}
            onClick={handleAvatarClick}
          >
            {displayUrl ? (
              <img
                src={displayUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-semibold text-white/60">
                {initials}
              </span>
            )}
          </div>

          {/* Preview Overlay - Mostra ícone de olho no hover */}
          {displayUrl && !isUploading && (
            <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
              <Eye className="h-6 w-6 text-white" />
            </div>
          )}
        </div>

      {/* Upload Button */}
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={triggerFileInput}
          disabled={isUploading}
          className="border-white/10 hover:bg-white/5 hover:text-white"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('settings.profile.avatar.uploading')}
            </>
          ) : (
            <>
              <Camera className="h-4 w-4 mr-2" />
              {t('settings.profile.avatar.changePhoto')}
            </>
          )}
        </Button>
        <p className="text-xs text-gray-500">{t('settings.profile.avatar.hint')}</p>
      </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Modal de Preview da Imagem */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl w-full p-0 bg-transparent border-none shadow-none">
          <div className="relative w-full">
            {/* Blur Background - Cobre toda a área do modal */}
            {displayUrl && (
              <div 
                className="absolute inset-0 -m-6 bg-black/70 backdrop-blur-xl"
                style={{
                  backgroundImage: `url(${displayUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(40px) brightness(0.5)',
                }}
              />
            )}
            
            {/* Close Button */}
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors backdrop-blur-sm"
              aria-label="Fechar preview"
            >
              <X className="h-5 w-5 text-white" />
            </button>

            {/* Imagem Expandida */}
            {displayUrl && (
              <div className="relative z-20 flex items-center justify-center min-h-[60vh] p-8">
                <img
                  src={displayUrl}
                  alt="Avatar Preview"
                  className="max-w-full max-h-[70vh] rounded-lg shadow-2xl object-contain"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
