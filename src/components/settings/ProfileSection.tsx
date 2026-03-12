/**
 * Caminho: src/components/settings/ProfileSection.tsx
 * Descrição: Seção de perfil do usuário (informações pessoais e contato)
 * Versão: 1.0 – 2025-12-17
 */

import React, { useState, useEffect } from "react";
import { Save, Loader2, Lock, AlertCircle, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/datepicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import AvatarUploader from "./AvatarUploader";
import {
  ProfileResponse,
  getMyProfile,
  updateMyProfile,
  updateBirthDate,
  requestEmailChange,
  verifyEmailChange,
} from "@/services/profileService";

export default function ProfileSection() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDateInput, setBirthDateInput] = useState("");

  // Birth date confirmation dialog
  const [showBirthDateDialog, setShowBirthDateDialog] = useState(false);
  const [isUpdatingBirthDate, setIsUpdatingBirthDate] = useState(false);

  // Email change verification flow
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingNewEmail, setPendingNewEmail] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getMyProfile();
      setProfile(data);
      setEmail(data.email);
      setPhone(data.phone || "");
      setBirthDateInput(data.birth_date || "");
    } catch (error: any) {
      console.error("settings.profile_load_error", { error: error instanceof Error ? error.message : String(error) });
      toast.error(error.message || t('settings.profile.toasts.errorLoadingProfile'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      // Atualizar apenas telefone (email requer verificação separada)
      const updated = await updateMyProfile({
        phone: phone.trim() || undefined,
      });
      setProfile(updated);
      setPhone(updated.phone || "");
      toast.success(t('settings.profile.toasts.phoneUpdated'));
    } catch (error: any) {
      toast.error(error.message || t('settings.profile.toasts.errorUpdatingProfile'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!newEmail.trim()) {
      toast.error(t('settings.profile.toasts.enterNewEmail'));
      return;
    }

    if (newEmail.trim().toLowerCase() === email.toLowerCase()) {
      toast.error(t('settings.profile.toasts.emailMustDiffer'));
      return;
    }

    setIsRequestingEmailChange(true);
    try {
      await requestEmailChange(newEmail.trim());
      setPendingNewEmail(newEmail.trim());
      toast.success(t('settings.profile.toasts.verificationSent'));
    } catch (error: any) {
      toast.error(error.message || t('settings.profile.toasts.errorRequestingEmailChange'));
    } finally {
      setIsRequestingEmailChange(false);
    }
  };

  const handleVerifyEmailChange = async () => {
    if (!pendingNewEmail || !verificationCode.trim()) {
      toast.error(t('settings.profile.toasts.enterVerificationCode'));
      return;
    }

    setIsVerifyingEmail(true);
    try {
      const updated = await verifyEmailChange(
        pendingNewEmail,
        verificationCode.trim()
      );
      setProfile(updated);
      setEmail(updated.email);
      setNewEmail("");
      setVerificationCode("");
      setPendingNewEmail(null);
      toast.success(t('settings.profile.toasts.emailUpdated'));
    } catch (error: any) {
      toast.error(error.message || t('settings.profile.toasts.errorVerifyingCode'));
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const cancelEmailChange = () => {
    setNewEmail("");
    setVerificationCode("");
    setPendingNewEmail(null);
  };

  const handleBirthDateSave = () => {
    if (!birthDateInput) {
      toast.error(t('settings.profile.toasts.selectBirthDate'));
      return;
    }
    setShowBirthDateDialog(true);
  };

  const confirmBirthDateUpdate = async () => {
    setIsUpdatingBirthDate(true);
    try {
      const updated = await updateBirthDate(birthDateInput);
      setProfile(updated);
      toast.success(t('settings.profile.toasts.birthDateSet'));
      setShowBirthDateDialog(false);
    } catch (error: any) {
      toast.error(error.message || t('settings.profile.toasts.errorUpdatingBirthDate'));
    } finally {
      setIsUpdatingBirthDate(false);
    }
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return "";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return phone;
  };

  const handleAvatarUploadSuccess = (newAvatarUrl: string) => {
    if (profile) {
      setProfile({ ...profile, avatar_url: newAvatarUrl });
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <p className="text-white/60 text-center">{t('settings.profile.toasts.errorLoadingProfile')}</p>
      </div>
    );
  }

  return (
    <>
      {/* Informações Pessoais */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-lg">
        <div className="flex items-center gap-2 mb-6">
          <svg
            className="h-5 w-5 text-white/80"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-white">
            {t('settings.profile.personalInfo.title')}
          </h2>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          {t('settings.profile.personalInfo.subtitle')}
        </p>

        {/* Avatar Upload */}
        <div className="mb-6">
          <AvatarUploader
            currentAvatarUrl={profile.avatar_url}
            userName={profile.name || profile.username}
            onUploadSuccess={handleAvatarUploadSuccess}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome Completo (read-only) */}
          <div>
            <Label className="text-white/80 mb-2 flex items-center gap-2">
              {t('settings.profile.personalInfo.fields.fullName')}
              <Lock className="h-3 w-3 text-gray-500" />
            </Label>
            <Input
              value={profile.name || profile.username}
              disabled
              className="bg-white/5 border-white/10 text-white/60 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('settings.profile.personalInfo.hints.locked')}
            </p>
          </div>

          {/* Perfil/Role */}
          {profile.company && (
            <div>
              <Label className="text-white/80 mb-2">{t('settings.profile.personalInfo.fields.profile')}</Label>
              <Input
                value={profile.company.name || t('settings.profile.personalInfo.placeholders.user')}
                disabled
                className="bg-white/5 border-white/10 text-white/60 cursor-not-allowed"
              />
            </div>
          )}

          {/* CPF (read-only) */}
          <div>
            <Label className="text-white/80 mb-2 flex items-center gap-2">
              {t('settings.profile.personalInfo.fields.cpf')}
              <Lock className="h-3 w-3 text-gray-500" />
            </Label>
            <Input
              value={formatCPF(profile.cpf || "")}
              disabled
              className="bg-white/5 border-white/10 text-white/60 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('settings.profile.personalInfo.hints.locked')}
            </p>
          </div>

          {/* Data de Nascimento (once-editable) */}
          <div>
            <Label className="text-white/80 mb-2 flex items-center gap-2">
              {t('settings.profile.personalInfo.fields.birthDate')}
              {profile.birth_date_locked && (
                <Lock className="h-3 w-3 text-gray-500" />
              )}
              {!profile.birth_date_locked && (
                <Calendar className="h-3 w-3 text-[#EC4899]" />
              )}
            </Label>
            <div className="flex gap-2">
              <DatePicker
                value={birthDateInput || undefined}
                onChange={(date) => setBirthDateInput(date)}
                disabled={profile.birth_date_locked}
                maxDate={new Date().toISOString().split("T")[0]} // Today
                className="flex-1"
              />
              {!profile.birth_date_locked &&
                birthDateInput &&
                birthDateInput !== profile.birth_date && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleBirthDateSave}
                    className="shrink-0 bg-[#EC4899] hover:bg-[#EC4899]/90"
                  >
                    <Save className="h-4 w-4 " />
                  </Button>
                )}
            </div>
            {profile.birth_date_locked ? (
              <p className="text-xs text-gray-500 mt-1">
                {t('settings.profile.personalInfo.hints.birthDateLocked')}
              </p>
            ) : (
              <p className="text-xs text-[#EC4899] mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {t('settings.profile.personalInfo.hints.birthDateOnce')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Informações de Contato */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-lg">
        <div className="flex items-center gap-2 mb-6">
          <svg
            className="h-5 w-5 text-white/80"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-white">
            {t('settings.profile.contactInfo.title')}
          </h2>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          {t('settings.profile.contactInfo.subtitle')}
        </p>

        <div className="space-y-6">
          {/* Email - Current (read-only) */}
          <div>
            <Label htmlFor="current-email" className="text-white/80 mb-2">
              {t('settings.profile.contactInfo.fields.currentEmail')}
            </Label>
            <Input
              id="current-email"
              type="email"
              value={email}
              disabled
              className="bg-white/5 border-white/10 text-white/60 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('settings.profile.contactInfo.hints.emailChangeInfo')}
            </p>
          </div>

          {/* Email Change Flow */}
          {!pendingNewEmail ? (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <Label htmlFor="new-email" className="text-white/80 mb-2">
                {t('settings.profile.contactInfo.fields.newEmail')}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder={t('settings.profile.contactInfo.placeholders.newEmail')}
                />
                <Button
                  type="button"
                  onClick={handleRequestEmailChange}
                  disabled={isRequestingEmailChange || !newEmail.trim()}
                  className="shrink-0 bg-[#EC4899] text-white hover:bg-[#EC4899]/90"
                >
                  {isRequestingEmailChange ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('settings.profile.contactInfo.buttons.requesting')}
                    </>
                  ) : (
                    t('settings.profile.contactInfo.buttons.requestChange')
                  )}
                </Button>
              </div>
              <p className="text-xs text-[#EC4899] mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {t('settings.profile.contactInfo.hints.verificationSent', { email })}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#EC4899]/10 border border-[#EC4899]/20">
              <Label htmlFor="verification-code" className="text-white/80 mb-2">
                {t('settings.profile.contactInfo.fields.verificationCode')}
              </Label>
              <p className="text-sm text-[#EC4899] mb-3">
                {t('settings.profile.contactInfo.hints.codeSentTo', { email })}
              </p>
              <p className="text-xs text-gray-400 mb-3">
                {t('settings.profile.contactInfo.hints.newEmailIs', { email: pendingNewEmail })}
              </p>
              <div className="space-y-3">
                <Input
                  id="verification-code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder={t('settings.profile.contactInfo.placeholders.verificationCode')}
                  maxLength={10}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleVerifyEmailChange}
                    disabled={isVerifyingEmail || !verificationCode.trim()}
                    className="flex-1 bg-[#EC4899] text-white hover:bg-[#EC4899]/90"
                  >
                    {isVerifyingEmail ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('settings.profile.contactInfo.buttons.verifying')}
                      </>
                    ) : (
                      t('settings.profile.contactInfo.buttons.verify')
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEmailChange}
                    disabled={isVerifyingEmail}
                    className="border-white/10"
                  >
                    {t('settings.profile.contactInfo.buttons.cancel')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Telefone */}
          <div>
            <Label htmlFor="phone" className="text-white/80 mb-2">
              {t('settings.profile.contactInfo.fields.phone')}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder={t('settings.profile.contactInfo.placeholders.phone')}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveProfile}
            disabled={isSaving || phone === (profile.phone || "")}
            className="min-w-[140px] bg-[#EC4899] text-white hover:bg-[#EC4899]/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('settings.profile.contactInfo.buttons.saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t('settings.profile.contactInfo.buttons.savePhone')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Birth Date Confirmation Dialog */}
      <Dialog open={showBirthDateDialog} onOpenChange={setShowBirthDateDialog}>
        <DialogContent className="bg-[#0f0f10] border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {t('settings.profile.birthDateDialog.title')}
            </DialogTitle>
            <DialogDescription className="text-gray-400" dangerouslySetInnerHTML={{
              __html: t('settings.profile.birthDateDialog.description')
            }} />
          </DialogHeader>
          <div className="py-4">
            <p className="text-white/80 text-center text-lg">
              {(() => {
                // Parse date string (YYYY-MM-DD) to avoid timezone issues
                const [year, month, day] = birthDateInput
                  .split("-")
                  .map(Number);
                const date = new Date(year, month - 1, day);
                return date.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                });
              })()}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBirthDateDialog(false)}
              disabled={isUpdatingBirthDate}
              className="border-white/10"
            >
              {t('settings.profile.birthDateDialog.buttons.cancel')}
            </Button>
            <Button
              onClick={confirmBirthDateUpdate}
              disabled={isUpdatingBirthDate}
              className="bg-[#EC4899] text-white hover:bg-[#EC4899]/90"
            >
              {isUpdatingBirthDate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('settings.profile.birthDateDialog.buttons.confirming')}
                </>
              ) : (
                t('settings.profile.birthDateDialog.buttons.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
