import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Loader2, Building2, ShieldCheck, Globe2, ArrowRight, Info, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace, type WorkspaceSummary } from '@/contexts/WorkspaceContext';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  WorkspaceLobbyModal,
  type SignupReviewDetail,
} from '@/components/WorkspaceLobbyModal';

import FloatingLanguageSelector from '@/components/FloatingLanguageSelector';
import { fetchWithAuthJson } from '@/lib/fetchWithAuth';

function workspaceApiId(row: WorkspaceSummary): string {
  return row.workspace_id?.trim() || row.id;
}

function allowedSignupActions(status: string | null | undefined): string[] {
  if (status === 'cancelled') return [];
  if (status === 'pending_approval') return ['in_review', 'approve', 'cancel'];
  if (status === 'in_review') return ['pending_approval', 'approve', 'cancel'];
  if (status === 'approved_pending_activation') return ['approve', 'cancel'];
  return [];
}

/** Lobby de tenant — layout em cards (paridade com Nyoka). */
export default function Workspaces() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const {
    availableWorkspaces,
    currentWorkspace,
    setCurrentWorkspace,
    refreshWorkspaces,
    isLoading,
  } = useWorkspace();

  const handleLogout = () => {
    setCurrentWorkspace(null);
    logout();
    navigate('/login', { replace: true });
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [modalRow, setModalRow] = useState<WorkspaceSummary | null>(null);
  const [detail, setDetail] = useState<SignupReviewDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [savingAction, setSavingAction] = useState(false);

  const canManageSignupReview = Boolean(
    user?.is_superadmin || user?.permissions?.includes('accounts:approve_signup'),
  );

  useEffect(() => {
    if (isAuthenticated) {
      refreshWorkspaces().catch((error) => {
        console.error('workspaces.refresh_error', {
          error: error instanceof Error ? error.message : String(error),
        });
        toast({
          title: t('workspaces.toastLoadErrorTitle'),
          description: t('workspaces.toastLoadErrorDescription'),
          variant: 'destructive',
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const sortedWorkspaces = useMemo(() => {
    return [...availableWorkspaces].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [availableWorkspaces]);

  const handleSelectWorkspace = (tenantId: string | null) => {
    if (!tenantId) {
      setCurrentWorkspace(null);
      toast({
        title: t('workspaces.toastGlobalModeTitle'),
        description: t('workspaces.toastGlobalModeDescription'),
      });
      navigate('/dashboard', { replace: true });
      return;
    }

    const ws = availableWorkspaces.find((item) => item.id === tenantId);
    if (!ws) {
      toast({
        title: t('workspaces.toastCompanyNotFoundTitle'),
        description: t('workspaces.toastCompanyNotFoundDescription'),
        variant: 'destructive',
      });
      return;
    }

    setCurrentWorkspace(ws);
    toast({
      title: t('workspaces.toastCompanySelectedTitle', { name: ws.name }),
      description: t('workspaces.toastCompanySelectedDescription'),
    });
    navigate('/dashboard', { replace: true });
  };

  const loadSignupDetail = useCallback(
    async (row: WorkspaceSummary) => {
      const wid = workspaceApiId(row);
      setDetailLoading(true);
      setDetail(null);
      try {
        const data = await fetchWithAuthJson<SignupReviewDetail>(
          `/auth/admin/signup-review/workspaces/${wid}`,
        );
        setDetail(data);
        const opts = allowedSignupActions(data.signup_review_status);
        setSelectedAction(opts[0] ?? '');
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'message' in e
            ? String((e as { message?: string }).message)
            : t('workspaces.signupReviewLoadError');
        toast({
          title: t('workspaces.signupReviewLoadErrorTitle'),
          description: msg,
          variant: 'destructive',
        });
      } finally {
        setDetailLoading(false);
      }
    },
    [t, toast],
  );

  const openWorkspaceModal = (row: WorkspaceSummary) => {
    setModalRow(row);
    setModalOpen(true);
    if (canManageSignupReview) {
      void loadSignupDetail(row);
    } else {
      setDetail(null);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalRow(null);
    setDetail(null);
    setSelectedAction('');
  };

  const applySignupAction = async () => {
    if (!modalRow || !selectedAction) return;
    const wid = workspaceApiId(modalRow);
    setSavingAction(true);
    try {
      await fetchWithAuthJson(`/auth/admin/signup-review/workspaces/${wid}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: selectedAction }),
      });
      toast({
        title: t('workspaces.signupReviewSavedTitle'),
        description: t('workspaces.signupReviewSavedDescription'),
      });
      await refreshWorkspaces();
      await loadSignupDetail(modalRow);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: string }).message)
          : t('workspaces.signupReviewSaveError');
      toast({
        title: t('workspaces.signupReviewSaveErrorTitle'),
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setSavingAction(false);
    }
  };

  const formatWorkspaceType = (workspaceType?: string | null, tenantKind?: string | null) => {
    const value = workspaceType ?? tenantKind;
    if (value === 'individual') return t('workspaces.typeIndividual');
    if (value === 'organization') return t('workspaces.typeOrganization');
    return t('workspaces.typeUnknown');
  };

  const formatPlanLabel = (plan?: string | null) => {
    if (!plan) return t('workspaces.planLabel', { plan: '' }).trim();
    const normalized = plan.trim().toLowerCase();
    if (!normalized) return t('workspaces.planLabel', { plan: '' }).trim();
    const formattedPlan = `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
    return t('workspaces.planLabel', { plan: formattedPlan });
  };

  const isIndividualWorkspace = (workspaceType?: string | null, tenantKind?: string | null) => {
    return (workspaceType ?? tenantKind) === 'individual';
  };

  const getTypeBadgeClassName = (workspaceType?: string | null, tenantKind?: string | null) => {
    const value = workspaceType ?? tenantKind;
    if (value === 'individual') {
      return 'border-fuchsia-300/50 bg-fuchsia-500/20 text-xs font-medium text-fuchsia-100';
    }
    if (value === 'organization') {
      return 'border-indigo-300/50 bg-indigo-500/20 text-xs font-medium text-indigo-100';
    }
    return 'border-slate-300/40 bg-slate-500/15 text-xs font-medium text-slate-100';
  };

  const signupReviewLabel = (status?: string | null) => {
    if (!status) return null;
    const key = `workspaces.signupReviewStatus.${status}` as const;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  const signupReviewBadgeClass = (status?: string | null) => {
    if (status === 'pending_approval') {
      return 'border-amber-300/55 bg-amber-500/20 text-xs font-medium text-amber-100';
    }
    if (status === 'in_review') {
      return 'border-sky-300/50 bg-sky-500/20 text-xs font-medium text-sky-100';
    }
    if (status === 'approved_pending_activation') {
      return 'border-violet-300/50 bg-violet-500/20 text-xs font-medium text-violet-100';
    }
    if (status === 'cancelled') {
      return 'border-zinc-400/40 bg-zinc-600/25 text-xs font-medium text-zinc-200';
    }
    return 'border-white/15 bg-white/10 text-xs font-medium text-white/80';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <Loader2 className="h-10 w-10 animate-spin text-[#EC4899]" />
        <p className="mt-4 text-sm text-white/70">{t('workspaces.loading')}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <Loader2 className="h-10 w-10 animate-spin text-[#EC4899]" />
        <p className="mt-4 text-sm text-white/70">{t('workspaces.loading')}</p>
      </div>
    );
  }

  const isSuperadmin = Boolean(user?.is_superadmin);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-black via-[#0a0a0f] to-[#050505] text-white">
      <FloatingLanguageSelector />
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#EC4899]/30 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-72 w-72 -translate-y-1/2 rounded-full bg-[#38bdf8]/20 blur-3xl" />
      </div>

      <header className="relative mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 pt-16 pb-10 sm:px-12">
        <div className="inline-flex items-center gap-2 text-sm text-white/60">
          <ShieldCheck className="h-4 w-4 text-[#EC4899]" />
          <span>{t('workspaces.adminConsoleBrand')}</span>
        </div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{t('workspaces.pageTitle')}</h1>
        <p className="max-w-3xl text-base text-white/70">
          {canManageSignupReview
            ? t('workspaces.subtitleSuperadmin')
            : t('workspaces.subtitleDefault')}
        </p>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-6 pb-16 sm:px-12">
        {isSuperadmin && (
          <section className="mb-12 rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-[0_25px_60px_-45px_rgba(236,72,153,0.5)] backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-full border border-[#EC4899]/40 bg-[#EC4899]/15 p-3 text-[#EC4899]">
                  <Globe2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">{t('workspaces.globalModeTitle')}</h2>
                  <p className="text-sm text-white/70">
                    {t('workspaces.globalModeDescription')}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:border-white/40"
                onClick={() => handleSelectWorkspace(null)}
              >
                {t('workspaces.enterGlobalMode')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>
        )}

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{t('workspaces.availableCompaniesTitle')}</h2>
              <p className="text-sm text-white/60">
                {sortedWorkspaces.length === 0
                  ? t('workspaces.availableCompaniesEmpty')
                  : t('workspaces.availableCompaniesHint')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-white/70 hover:text-white"
                onClick={() => refreshWorkspaces()}
              >
                {t('workspaces.refreshList')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white/70 hover:text-white"
                onClick={handleLogout}
              >
                {t('workspaces.signOut')}
              </Button>
            </div>
          </div>

          {sortedWorkspaces.length === 0 ? (
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-10 text-center text-sm text-white/60">
              <Info className="mx-auto mb-3 h-5 w-5 text-white/50" />
              {t('workspaces.noAccessMessage')}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {sortedWorkspaces.map((company) => {
                const isActive = currentWorkspace?.id === company.id;
                const isIndividual = isIndividualWorkspace(company.workspace_type, company.tenant_kind);
                const review = company.signup_review_status;
                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => {
                      if (canManageSignupReview) {
                        openWorkspaceModal(company);
                      } else {
                        handleSelectWorkspace(company.id);
                      }
                    }}
                    className={`group relative overflow-hidden rounded-3xl border bg-white/[0.02] p-6 text-left transition ${
                      isActive
                        ? 'border-[#EC4899]/70 shadow-[0_25px_60px_-45px_rgba(236,72,153,0.75)]'
                        : 'border-white/10 hover:border-[#EC4899]/40 hover:shadow-[0_20px_60px_-40px_rgba(236,72,153,0.45)]'
                    }`}
                  >
                    <div className="absolute inset-0 opacity-0 transition group-hover:opacity-10">
                      <div className="absolute -top-20 right-0 h-40 w-40 rounded-full bg-[#EC4899] blur-3xl" />
                    </div>

                    <div className="relative flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#EC4899]/30 bg-[#EC4899]/10 text-[#EC4899]">
                        {isIndividual ? <UserRound className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-lg font-semibold text-white">{company.name}</span>
                        <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                          {company.domain ?? t('workspaces.domainUnavailable')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Badge
                        variant="outline"
                        className="border-cyan-300/45 bg-cyan-500/20 text-xs font-medium text-cyan-100"
                      >
                        {formatPlanLabel(company.plan)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={getTypeBadgeClassName(company.workspace_type, company.tenant_kind)}
                      >
                        {formatWorkspaceType(company.workspace_type, company.tenant_kind)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          company.is_active
                            ? 'border-emerald-300/50 bg-emerald-500/20 text-xs font-medium text-emerald-100'
                            : 'border-rose-300/45 bg-rose-500/15 text-xs font-medium text-rose-100'
                        }
                      >
                        {company.is_active ? t('workspaces.statusActive') : t('workspaces.statusInactive')}
                      </Badge>
                      {review ? (
                        <Badge variant="outline" className={signupReviewBadgeClass(review)}>
                          {signupReviewLabel(review)}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-8 flex items-center gap-2 text-sm text-[#EC4899] transition group-hover:text-[#f472b6]">
                      {canManageSignupReview
                        ? t('workspaces.openWorkspaceDetails')
                        : t('workspaces.openWorkspace')}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <div className="mt-2 text-[11px] font-mono uppercase tracking-wide text-white/45">
                      {company.workspace_id ?? company.id}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <WorkspaceLobbyModal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        row={modalRow}
        detail={detail}
        detailLoading={detailLoading}
        canManageSignupReview={canManageSignupReview}
        selectedAction={selectedAction}
        setSelectedAction={setSelectedAction}
        savingAction={savingAction}
        onApplySignupAction={() => void applySignupAction()}
        onEnterWorkspace={() => {
          if (modalRow) {
            handleSelectWorkspace(modalRow.id);
            closeModal();
          }
        }}
        onClose={closeModal}
        onRefreshWorkspaces={() => refreshWorkspaces()}
      />
    </div>
  );
}
