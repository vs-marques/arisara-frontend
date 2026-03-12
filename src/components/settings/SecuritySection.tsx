/**
 * Caminho: src/components/settings/SecuritySection.tsx
 * Descrição: Seção de segurança (MFA e alteração de senha)
 * Versão: 1.0 – 2025-12-17
 */

import React, { useState, useEffect } from "react";
import {
  Shield,
  Key,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArisaraSwitch } from "@/components/ui/nyoka-switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ProfileResponse,
  getMyProfile,
  toggleMFA,
  changePassword,
} from "@/services/profileService";
import {
  validatePassword,
  getPasswordStrengthColor,
  getPasswordStrengthText,
} from "@/utils/passwordValidation";

export default function SecuritySection() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // MFA State
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isTogglingMFA, setIsTogglingMFA] = useState(false);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [pendingMFAState, setPendingMFAState] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getMyProfile();
      setProfile(data);
      setMfaEnabled(data.mfa_enabled);
    } catch (error: any) {
      console.error("settings.security_load_error", { error: error instanceof Error ? error.message : String(error) });
      toast.error(
        error.message || t('settings.security.mfa.toasts.errorLoading')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFAToggle = (checked: boolean) => {
    setPendingMFAState(checked);
    setShowMFADialog(true);
  };

  const confirmMFAToggle = async () => {
    setIsTogglingMFA(true);
    try {
      const updated = await toggleMFA(pendingMFAState);
      setProfile(updated);
      setMfaEnabled(updated.mfa_enabled);
      toast.success(
        pendingMFAState
          ? t('settings.security.mfa.toasts.enabled')
          : t('settings.security.mfa.toasts.disabled')
      );
      setShowMFADialog(false);
    } catch (error: any) {
      toast.error(error.message || t('settings.security.mfa.toasts.error'));
      // Revert switch state
      setMfaEnabled(!pendingMFAState);
    } finally {
      setIsTogglingMFA(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!currentPassword.trim()) {
      toast.error(t('settings.security.password.errors.enterCurrentPassword'));
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('settings.security.password.errors.passwordsDoNotMatch'));
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      // Limpar campos
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast.success(t('settings.security.password.toasts.changed'));
    } catch (error: any) {
      toast.error(error.message || t('settings.security.password.toasts.error'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const passwordValidation = validatePassword(newPassword);
  const isPasswordFormValid =
    currentPassword.trim() &&
    passwordValidation.isValid &&
    newPassword === confirmPassword;

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* MFA Section */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-lg">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-5 w-5 text-white/80" />
          <h2 className="text-xl font-semibold text-white">
            {t('settings.security.mfa.title')}
          </h2>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          {t('settings.security.mfa.subtitle')}
        </p>

        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex-1">
            <h3 className="text-white font-medium mb-1">
              {t('settings.security.mfa.toggle.label')}
            </h3>
            <p className="text-sm text-gray-400">
              {t('settings.security.mfa.toggle.description')}
            </p>
          </div>
          <ArisaraSwitch
            checked={mfaEnabled}
            onCheckedChange={handleMFAToggle}
            disabled={isTogglingMFA}
          />
        </div>

        {profile && profile.mfa_enabled && (
          <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-green-400 text-sm font-medium">{t('settings.security.mfa.status.enabled')}</p>
              <p className="text-green-400/80 text-xs mt-1">
                {t('settings.security.mfa.status.enabledDescription')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Password Change Section */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-lg">
        <div className="flex items-center gap-2 mb-6">
          <Key className="h-5 w-5 text-white/80" />
          <h2 className="text-xl font-semibold text-white">{t('settings.security.password.title')}</h2>
        </div>
        <p className="text-sm text-gray-400 mb-6">{t('settings.security.password.subtitle')}</p>

        <form onSubmit={handlePasswordChange} className="space-y-6">
          {/* Current Password */}
          <div>
            <Label htmlFor="current-password" className="text-white/80 mb-2">
              {t('settings.security.password.fields.currentPassword')}
            </Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white pr-10"
                placeholder={t('settings.security.password.placeholders.currentPassword')}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <Label htmlFor="new-password" className="text-white/80 mb-2">
              {t('settings.security.password.fields.newPassword')}
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white pr-10"
                placeholder={t('settings.security.password.placeholders.newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Password Strength */}
            {newPassword && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${getPasswordStrengthColor(
                        passwordValidation.strength
                      )}`}
                      style={{
                        width:
                          passwordValidation.strength === "strong"
                            ? "100%"
                            : passwordValidation.strength === "medium"
                            ? "66%"
                            : "33%",
                      }}
                    />
                  </div>
                  <span className="text-xs text-white/60 min-w-[60px]">
                    {getPasswordStrengthText(passwordValidation.strength)}
                  </span>
                </div>

                {passwordValidation.errors.length > 0 && (
                  <div className="space-y-1">
                    {passwordValidation.errors.map((error, index) => (
                      <p
                        key={index}
                        className="text-xs text-red-400 flex items-center gap-1"
                      >
                        <AlertCircle className="h-3 w-3" />
                        {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirm-password" className="text-white/80 mb-2">
              {t('settings.security.password.fields.confirmPassword')}
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white pr-10"
                placeholder={t('settings.security.password.placeholders.confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {t('settings.security.password.errors.passwordsDoNotMatch')}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={!isPasswordFormValid || isChangingPassword}
              className="min-w-[140px] bg-[#EC4899] text-white hover:bg-[#EC4899]/90"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('settings.security.password.buttons.changing')}
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  {t('settings.security.password.buttons.change')}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* MFA Confirmation Dialog */}
      <Dialog open={showMFADialog} onOpenChange={setShowMFADialog}>
        <DialogContent className="bg-[#0f0f10] border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {pendingMFAState ? t('settings.security.mfa.dialog.titleEnable') : t('settings.security.mfa.dialog.titleDisable')}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {pendingMFAState
                ? t('settings.security.mfa.dialog.descriptionEnable')
                : t('settings.security.mfa.dialog.descriptionDisable')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMFADialog(false);
                setMfaEnabled(!pendingMFAState);
              }}
              disabled={isTogglingMFA}
              className="border-white/10"
            >
              {t('settings.security.mfa.dialog.buttons.cancel')}
            </Button>
            <Button onClick={confirmMFAToggle} disabled={isTogglingMFA}>
              {isTogglingMFA ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('settings.security.mfa.dialog.buttons.confirming')}
                </>
              ) : (
                t('settings.security.mfa.dialog.buttons.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
