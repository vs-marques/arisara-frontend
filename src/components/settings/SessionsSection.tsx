/**
 * Caminho: src/components/settings/SessionsSection.tsx
 * Descrição: Seção de sessões ativas do usuário
 * Versão: 1.0 – 2025-12-17
 */

import React, { useState, useEffect } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  Loader2,
  Trash2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
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
  SessionResponse,
  listMySessions,
  revokeSession,
  revokeAllOtherSessions,
} from "@/services/sessionService";

export default function SessionsSection() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      console.debug("settings.sessions_loading");
      const data = await listMySessions();
      setSessions(data.sessions || []);
      if (data.sessions && data.sessions.length === 0) {
        console.debug("settings.sessions_empty", { total: data.total });
      }
    } catch (error: any) {
      console.error("settings.sessions_load_error", {
        message: error.message,
        status: error.status,
        detail: error.detail,
      });
      toast.error(error.message || t('settings.sessions.toasts.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeClick = (sessionId: string) => {
    setSessionToRevoke(sessionId);
    setShowRevokeDialog(true);
  };

  const confirmRevoke = async () => {
    if (!sessionToRevoke) return;

    setIsRevoking(true);
    try {
      await revokeSession(sessionToRevoke);
      toast.success(t('settings.sessions.toasts.revoked'));
      // Reload sessions
      await loadSessions();
      setShowRevokeDialog(false);
      setSessionToRevoke(null);
    } catch (error: any) {
      if (error.message.includes("sessão atual")) {
        toast.error(t('settings.sessions.toasts.cannotRevokeCurrent'));
      } else {
        toast.error(error.message || t('settings.sessions.toasts.errorRevoking'));
      }
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRevokeAllClick = () => {
    setShowRevokeAllDialog(true);
  };

  const confirmRevokeAll = async () => {
    setIsRevoking(true);
    try {
      const result = await revokeAllOtherSessions();
      toast.success(result.message);
      // Reload sessions
      await loadSessions();
      setShowRevokeAllDialog(false);
    } catch (error: any) {
      toast.error(error.message || t('settings.sessions.toasts.errorRevokingAll'));
    } finally {
      setIsRevoking(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-5 w-5 text-[#EC4899]" />;
      case "tablet":
        return <Tablet className="h-5 w-5 text-purple-400" />;
      default:
        return <Monitor className="h-5 w-5 text-green-400" />;
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return t('settings.sessions.timeAgo.unknown');
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getRelativeTime = (dateString?: string | null) => {
    if (!dateString) return t('settings.sessions.timeAgo.unknown');
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('settings.sessions.timeAgo.now');
    if (diffMins < 60) return t('settings.sessions.timeAgo.minutes', { count: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t('settings.sessions.timeAgo.hours', { count: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    return t('settings.sessions.timeAgo.days', { count: diffDays });
  };

  // Detect current session (most recently used)
  const currentSessionId = sessions.length > 0 ? sessions[0].id : null;

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
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
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
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-white">
                {t('settings.sessions.title')}
              </h2>
            </div>
            <p className="text-sm text-gray-400">
              {t('settings.sessions.subtitle')}
            </p>
          </div>

          {sessions.length > 1 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRevokeAllClick}
              className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('settings.sessions.buttons.revokeAll')}
            </Button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">{t('settings.sessions.noSessions')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, index) => {
              const isCurrentSession = session.id === currentSessionId;

              return (
                <div
                  key={session.id}
                  className={`p-6 rounded-xl border ${
                    isCurrentSession
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Device Icon */}
                      <div className="mt-1">
                        {getDeviceIcon(session.device.device_type)}
                      </div>

                      {/* Session Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-medium">
                            {session.device.display}
                          </h3>
                          {isCurrentSession && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                              <CheckCircle className="h-3 w-3 text-green-400" />
                              <span className="text-xs text-green-400 font-medium">
                                {t('settings.sessions.currentSession')}
                              </span>
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-400">
                          {session.ip_address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{session.ip_address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {t('settings.sessions.created')}: {formatDate(session.created_at)} •{" "}
                              {getRelativeTime(session.last_used_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Revoke Button */}
                    {!isCurrentSession && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeClick(session.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {sessions.length > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-[#EC4899]/10 border border-[#EC4899]/20 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-[#EC4899] mt-0.5 shrink-0" />
            <div>
              <p className="text-[#EC4899] text-sm font-medium">
                {t('settings.sessions.securityTip.title')}
              </p>
              <p className="text-[#EC4899]/80 text-xs mt-1">
                {t('settings.sessions.securityTip.description')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Revoke Single Session Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent className="bg-[#0f0f10] border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">{t('settings.sessions.revokeDialog.title')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('settings.sessions.revokeDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRevokeDialog(false);
                setSessionToRevoke(null);
              }}
              disabled={isRevoking}
              className="border-white/10"
            >
              {t('settings.sessions.revokeDialog.buttons.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRevoke}
              disabled={isRevoking}
            >
              {isRevoking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('settings.sessions.revokeDialog.buttons.revoking')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('settings.sessions.revokeDialog.buttons.revoke')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke All Sessions Dialog */}
      <Dialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <DialogContent className="bg-[#0f0f10] border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {t('settings.sessions.revokeAllDialog.title')}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('settings.sessions.revokeAllDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevokeAllDialog(false)}
              disabled={isRevoking}
              className="border-white/10"
            >
              {t('settings.sessions.revokeAllDialog.buttons.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRevokeAll}
              disabled={isRevoking}
            >
              {isRevoking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('settings.sessions.revokeAllDialog.buttons.revoking')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('settings.sessions.revokeAllDialog.buttons.revokeAll')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
