/**
 * Caminho: arisara-frontend/src/components/WorkspaceLobbyModal.tsx
 * Descrição: Modal do lobby de workspace (conta, usuários, consumo, zona crítica — purge/deactivate via API).
 * Versão: 1.1 – 2026-04-14
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Loader2,
  Mail,
  Search,
  Shield,
  ShieldCheck,
  Fingerprint,
  Lock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { WorkspaceSummary } from '@/contexts/WorkspaceContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { fetchWithAuthJson } from '@/lib/fetchWithAuth';
import {
  getAdminUsers,
  getRoles,
  type AdminUserResponse,
  type RoleResponse,
} from '@/services/userService';

const discoverySelectClassName =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3 pr-10 py-2 text-sm text-white appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat";

type WorkspaceUsageSummaryApi = {
  workspace_id: string;
  occurred_after: string;
  occurred_before: string;
  total_events: number;
  total_cost_usd: string;
  presentation_currency: 'USD' | 'BRL';
  total_cost_brl?: string | null;
  fx_missing_trade_dates?: string[] | null;
  by_event_type: Array<{
    event_type: string;
    event_count: number;
    sum_cost_usd: string;
    sum_tokens: number;
    sum_cost_brl?: string | null;
  }>;
};

function usageMonthUtcRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { from, to };
}

/** Régua mensal BRL (tabela standard) — PKG_DSV_V1_00088; uso offline se GET /by-tier falhar. */
const PLAN_MONTHLY_FALLBACK_BRL: Record<string, number> = {
  starter: 490,
  basic: 690,
  growth: 990,
  pro: 1590,
  business: 2790,
  scale: 4490,
  enterprise: 7990,
};

function normalizePlanSlugForCatalog(raw: string): string {
  let s = raw.trim().toLowerCase();
  if (!s || s === 'unknown' || s === 'free') return '';
  if (s.startsWith('plan ')) s = s.slice(5).trim();
  return s;
}

function formatTierDisplayName(slug: string): string {
  if (!slug) return '';
  if (slug === 'pro') return 'Pro';
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export type SignupReviewDetail = {
  workspace_id: string;
  workspace_name: string;
  workspace_type: string;
  workspace_is_active: boolean;
  signup_review_status: string | null;
  owner: {
    id: string;
    name: string | null;
    email: string;
    cpf_masked: string | null;
    signup_source: string | null;
    user_status: string | null;
    access_status: string | null;
  };
  company: {
    id: string;
    name: string;
    cnpj_masked: string | null;
    domain: string | null;
    is_active: boolean;
  } | null;
};

function workspaceCoreId(row: WorkspaceSummary): string {
  return row.workspace_id?.trim() || row.id;
}

function allowedSignupActions(status: string | null | undefined): string[] {
  if (status === 'cancelled') return [];
  if (status === 'pending_approval') return ['in_review', 'approve', 'cancel'];
  if (status === 'in_review') return ['pending_approval', 'approve', 'cancel'];
  if (status === 'approved_pending_activation') return ['approve', 'cancel'];
  return [];
}

const LIFECYCLE_VALUES = [
  'active',
  'inactive',
  'in_review',
  'pending_approval',
  'pending_activation',
  'cancelled',
  'suspended',
] as const;

const getInitials = (name?: string | null, username?: string) => {
  const base = name || username || 'user';
  const parts = base.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export type WorkspaceLobbyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: WorkspaceSummary | null;
  detail: SignupReviewDetail | null;
  detailLoading: boolean;
  canManageSignupReview: boolean;
  selectedAction: string;
  setSelectedAction: (v: string) => void;
  savingAction: boolean;
  onApplySignupAction: () => void;
  onEnterWorkspace: () => void;
  onClose: () => void;
  onRefreshWorkspaces: () => Promise<void>;
};

export function WorkspaceLobbyModal({
  open,
  onOpenChange,
  row,
  detail,
  detailLoading,
  canManageSignupReview,
  selectedAction,
  setSelectedAction,
  savingAction,
  onApplySignupAction,
  onEnterWorkspace,
  onClose,
  onRefreshWorkspaces,
}: WorkspaceLobbyModalProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [tab, setTab] = useState('account');

  const [statusDraft, setStatusDraft] = useState('active');
  const [savingStatus, setSavingStatus] = useState(false);
  const [ownerEmailDraft, setOwnerEmailDraft] = useState('');
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [destructiveLoading, setDestructiveLoading] = useState(false);

  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [usageSummary, setUsageSummary] = useState<WorkspaceUsageSummaryApi | null>(null);
  const [usageQueryRange, setUsageQueryRange] = useState<{ from: string; to: string } | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  const [planCatalog, setPlanCatalog] = useState<{
    display_name: string;
    price_monthly: string;
    billing_cycle: string;
  } | null>(null);
  const [planCatalogLoading, setPlanCatalogLoading] = useState(false);

  useEffect(() => {
    if (open) setTab('account');
  }, [open]);

  useEffect(() => {
    setUsageSummary(null);
    setUsageQueryRange(null);
    setUsageError(null);
    setPlanCatalog(null);
  }, [row?.id]);

  const isOrg = Boolean(
    row?.tenant_kind === 'organization' || row?.workspace_type === 'organization',
  );

  useEffect(() => {
    if (row?.status) {
      setStatusDraft(row.status);
    } else {
      setStatusDraft('active');
    }
  }, [row?.id, row?.status]);

  useEffect(() => {
    if (detail?.owner?.email) setOwnerEmailDraft(detail.owner.email);
  }, [detail?.owner?.email]);

  const loadUsersTab = useCallback(async () => {
    if (!row) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const [rolesData, usersData] = await Promise.all([
        getRoles().catch(() => [] as RoleResponse[]),
        isOrg
          ? getAdminUsers({ companyId: row.id, includeCompany: true })
          : getAdminUsers({ workspaceId: workspaceCoreId(row), includeCompany: true }),
      ]);
      setRoles(rolesData);
      setUsers(usersData);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : '…';
      setUsersError(msg);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [row, isOrg]);

  useEffect(() => {
    if (open && tab === 'users' && row && canManageSignupReview) {
      void loadUsersTab();
    }
  }, [open, tab, row, canManageSignupReview, loadUsersTab]);

  const loadUsageSummary = useCallback(async () => {
    if (!row) return;
    const wid = workspaceCoreId(row);
    setUsageLoading(true);
    setUsageError(null);
    const range = usageMonthUtcRange();
    const currency =
      i18n.language?.startsWith('pt') || i18n.language?.startsWith('es') ? 'brl' : 'usd';
    try {
      const params = new URLSearchParams({
        from: range.from,
        to: range.to,
        currency,
      });
      const data = await fetchWithAuthJson<WorkspaceUsageSummaryApi>(
        `/auth/admin/workspaces/${wid}/usage/summary?${params.toString()}`,
      );
      setUsageQueryRange(range);
      setUsageSummary(data);
    } catch (e: unknown) {
      setUsageSummary(null);
      setUsageQueryRange(null);
      const msg =
        e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : '…';
      setUsageError(msg);
    } finally {
      setUsageLoading(false);
    }
  }, [row, i18n.language]);

  useEffect(() => {
    if (!open || tab !== 'consumption' || !row) return;
    void loadUsageSummary();
  }, [open, tab, row?.id, loadUsageSummary]);

  const loadPlanCatalog = useCallback(async () => {
    if (!row?.plan?.trim()) {
      setPlanCatalog(null);
      return;
    }
    const slug = row.plan.trim();
    setPlanCatalogLoading(true);
    try {
      const data = await fetchWithAuthJson<{
        display_name: string;
        price_monthly: string;
        billing_cycle: string;
      }>(`/auth/admin/subscription-plans/by-tier/${encodeURIComponent(slug)}`);
      setPlanCatalog({
        display_name: data.display_name,
        price_monthly: data.price_monthly,
        billing_cycle: data.billing_cycle,
      });
    } catch {
      setPlanCatalog(null);
    } finally {
      setPlanCatalogLoading(false);
    }
  }, [row?.plan]);

  useEffect(() => {
    if (!open || tab !== 'consumption' || !row?.plan?.trim()) {
      return;
    }
    void loadPlanCatalog();
  }, [open, tab, row?.plan, loadPlanCatalog]);

  const usageTotalTokens = useMemo(() => {
    if (!usageSummary?.by_event_type?.length) return 0;
    return usageSummary.by_event_type.reduce((acc, x) => acc + (x.sum_tokens || 0), 0);
  }, [usageSummary]);

  const usageCostDisplay = useMemo(() => {
    if (!usageSummary) return null;
    if (
      usageSummary.presentation_currency === 'BRL' &&
      usageSummary.total_cost_brl != null &&
      usageSummary.total_cost_brl !== ''
    ) {
      const n = parseFloat(usageSummary.total_cost_brl);
      if (!Number.isNaN(n)) {
        return new Intl.NumberFormat(i18n.language || 'pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(n);
      }
    }
    const u = parseFloat(usageSummary.total_cost_usd);
    if (Number.isNaN(u)) return null;
    return new Intl.NumberFormat(i18n.language || 'en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(u);
  }, [usageSummary, i18n.language]);

  const planPaymentsLabel = useMemo(() => {
    const p = row?.plan;
    if (!p?.trim()) return null;
    const normalized = p.trim().toLowerCase();
    const formattedPlan = `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
    return t('workspaces.planLabel', { plan: formattedPlan });
  }, [row?.plan, t]);

  const planMonthlyPriceFormatted = useMemo(() => {
    if (!planCatalog?.price_monthly) return null;
    const n = parseFloat(planCatalog.price_monthly);
    if (Number.isNaN(n)) return null;
    return new Intl.NumberFormat(i18n.language || 'pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(n);
  }, [planCatalog, i18n.language]);

  const planFallbackBrlAmount = useMemo(() => {
    const k = normalizePlanSlugForCatalog(row?.plan ?? '');
    if (!k) return null;
    const v = PLAN_MONTHLY_FALLBACK_BRL[k];
    return typeof v === 'number' ? v : null;
  }, [row?.plan]);

  const planFallbackPriceFormatted = useMemo(() => {
    if (planFallbackBrlAmount == null) return null;
    return new Intl.NumberFormat(i18n.language || 'pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(planFallbackBrlAmount);
  }, [planFallbackBrlAmount, i18n.language]);

  const planFallbackDisplayName = useMemo(() => {
    const k = normalizePlanSlugForCatalog(row?.plan ?? '');
    if (!k) return '';
    return formatTierDisplayName(k);
  }, [row?.plan]);

  const formatDateTime = (value?: string | null) => {
    if (!value) return t('workspaces.neverDate');
    const date = new Date(value);
    return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  };

  const formatRoleName = (roleName: string) => {
    const key = `users.roles.${roleName}`;
    const val = t(key);
    return val === key ? roleName : val;
  };

  const filteredUsers = useMemo(() => {
    let list = users;
    const q = userSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          u.email.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q),
      );
    }
    if (roleFilter !== 'all') {
      list = list.filter((u) => u.roles.some((r) => r.name === roleFilter));
    }
    return list;
  }, [users, userSearch, roleFilter]);

  const saveWorkspaceStatus = async () => {
    if (!row) return;
    const wid = workspaceCoreId(row);
    setSavingStatus(true);
    try {
      await fetchWithAuthJson(`/auth/admin/workspaces/${wid}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: statusDraft }),
      });
      toast({
        title: t('workspaces.lifecycleSavedTitle'),
        description: t('workspaces.lifecycleSavedDescription'),
      });
      await onRefreshWorkspaces();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : '…';
      toast({
        title: t('workspaces.lifecycleSaveErrorTitle'),
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setSavingStatus(false);
    }
  };

  const saveEmailComingSoon = () => {
    toast({
      title: t('workspaces.saveEmailSoonTitle'),
      description: t('workspaces.saveEmailSoonDescription'),
    });
  };

  const runPurgeWorkspace = async () => {
    if (!row || purgeConfirmText !== 'DELETE') return;
    const wid = workspaceCoreId(row);
    setDestructiveLoading(true);
    try {
      await fetchWithAuthJson(`/auth/admin/workspaces/${wid}/purge`, {
        method: 'POST',
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });
      toast({
        title: t('workspaces.purgeSuccessTitle'),
        description: t('workspaces.purgeSuccessDescription'),
      });
      setPurgeOpen(false);
      setPurgeConfirmText('');
      onClose();
      await onRefreshWorkspaces();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : '…';
      toast({
        title: t('workspaces.destructiveErrorTitle'),
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setDestructiveLoading(false);
    }
  };

  const runDeactivateWorkspace = async () => {
    if (!row) return;
    const wid = workspaceCoreId(row);
    setDestructiveLoading(true);
    try {
      await fetchWithAuthJson(`/auth/admin/workspaces/${wid}/deactivate`, {
        method: 'POST',
      });
      toast({
        title: t('workspaces.deactivateSuccessTitle'),
        description: t('workspaces.deactivateSuccessDescription'),
      });
      setDeactivateOpen(false);
      await onRefreshWorkspaces();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : '…';
      toast({
        title: t('workspaces.destructiveErrorTitle'),
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setDestructiveLoading(false);
    }
  };

  if (!row) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-white/10 bg-black/95 text-white">
        <DialogHeader>
          <DialogTitle>{t('workspaces.modalTitle')}</DialogTitle>
          <p className="text-sm text-gray-400">{t('workspaces.modalDescription')}</p>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b border-white/10 bg-transparent p-0">
            {(['account', 'users', 'consumption', 'danger'] as const).map((value) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm text-gray-400 data-[state=active]:border-sky-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                {t(`workspaces.tabs.${value}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="account" className="mt-4 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    {t('workspaces.modalWorkspaceId')}
                  </label>
                  <Input
                    readOnly
                    value={workspaceCoreId(row)}
                    className="border-white/10 bg-black/40 font-mono text-xs text-white read-only:cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    {t('workspaces.modalTenantName')}
                  </label>
                  <Input
                    readOnly
                    value={row.name}
                    className="border-white/10 bg-black/40 text-sm text-white read-only:cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    {t('workspaces.modalLifecycleStatus')}
                  </label>
                  <select
                    className={discoverySelectClassName}
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value)}
                    disabled={!canManageSignupReview}
                  >
                    {LIFECYCLE_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {t(`workspaces.lifecycle.${v}`)}
                      </option>
                    ))}
                  </select>
                  {canManageSignupReview && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-1 border-white/15 text-gray-200"
                      disabled={
                      savingStatus || statusDraft === (row.status || 'active')
                    }
                      onClick={() => void saveWorkspaceStatus()}
                    >
                      {savingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {t('workspaces.saveLifecycle')}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    {t('workspaces.modalCreatedAt')}
                  </label>
                  <Input
                    readOnly
                    value={formatDateTime(row.created_at)}
                    className="border-white/10 bg-black/40 text-sm text-white read-only:cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    {t('workspaces.modalPlan')}
                  </label>
                  <Input
                    readOnly
                    value={row.plan}
                    className="border-white/10 bg-black/40 text-sm text-white read-only:cursor-default"
                  />
                </div>
              </div>

              {detailLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin text-[#EC4899]" />
                  {t('workspaces.modalLoadingDetail')}
                </div>
              )}

              {detail && !detailLoading && (
                <div className="space-y-4 border-t border-white/10 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        {t('workspaces.modalOwner')}
                      </label>
                      <Input
                        readOnly
                        value={detail.owner.name ?? detail.owner.email}
                        className="border-white/10 bg-black/40 text-sm text-white read-only:cursor-default"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        {t('workspaces.modalEmailEditable')}
                      </label>
                      <Input
                        type="email"
                        value={ownerEmailDraft}
                        onChange={(e) => setOwnerEmailDraft(e.target.value)}
                        className="border-white/10 bg-black/40 text-sm text-white"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-white/15 text-gray-200"
                        onClick={saveEmailComingSoon}
                      >
                        {t('workspaces.saveEmail')}
                      </Button>
                    </div>
                  </div>

                  {canManageSignupReview &&
                    allowedSignupActions(detail.signup_review_status).length > 0 && (
                      <div className="space-y-2 border-t border-white/10 pt-4">
                        <label
                          htmlFor="workspace-modal-status-action"
                          className="block text-xs uppercase tracking-[0.2em] text-gray-500"
                        >
                          {t('workspaces.modalChangeStatus')}
                        </label>
                        <select
                          id="workspace-modal-status-action"
                          className={discoverySelectClassName}
                          value={selectedAction}
                          onChange={(e) => setSelectedAction(e.target.value)}
                        >
                          {allowedSignupActions(detail.signup_review_status).map((a) => (
                            <option key={a} value={a}>
                              {t(`workspaces.signupReviewAction.${a}`)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            {!canManageSignupReview ? (
              <p className="text-sm text-gray-400">{t('workspaces.usersTabNoPermission')}</p>
            ) : (
              <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 px-3 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder={t('users.filters.searchPlaceholder')}
                      className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 px-2 py-1">
                      <Shield className="h-3.5 w-3.5 text-[#EC4899]" />
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-transparent text-sm text-white focus:outline-none"
                      >
                        <option value="all">{t('users.filters.allRoles')}</option>
                        {roles.map((r) => (
                          <option key={r.name} value={r.name} className="text-gray-900">
                            {formatRoleName(r.name)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {usersError && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {usersError}
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-xs uppercase text-gray-400">
                          {t('users.table.userColumn')}
                        </TableHead>
                        <TableHead className="text-xs uppercase text-gray-400">
                          {t('users.table.contact')}
                        </TableHead>
                        <TableHead className="text-xs uppercase text-gray-400">
                          {t('users.table.roles')}
                        </TableHead>
                        <TableHead className="text-xs uppercase text-gray-400">
                          {t('users.table.status')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-sm text-gray-400">
                            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-[#EC4899]" />
                            {t('workspaces.usersLoading')}
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-sm text-gray-400">
                            {t('users.empty.noUsers')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((u) => (
                          <TableRow key={u.id} className="border-white/5">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-semibold">
                                  {getInitials(u.name, u.username)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">{u.name || u.username}</p>
                                  <p className="text-xs text-gray-500">@{u.username}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1 text-xs text-gray-300">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {u.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {t('users.lastAccess')}: {formatDateTime(u.last_login_at)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {u.roles.length ? (
                                  u.roles.map((r) => (
                                    <Badge
                                      key={r.id}
                                      variant="outline"
                                      className="border-[#EC4899]/30 bg-[#EC4899]/10 text-[10px] text-[#EC4899]"
                                    >
                                      <Shield className="mr-1 h-3 w-3" />
                                      {formatRoleName(r.name)}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-500">—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1 text-xs">
                                <span
                                  className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 ${
                                    u.is_active
                                      ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                      : 'border border-red-500/40 bg-red-500/10 text-red-200'
                                  }`}
                                >
                                  <ShieldCheck className="h-3 w-3" />
                                  {u.is_active ? t('workspaces.statusActive') : t('workspaces.statusInactive')}
                                </span>
                                {!u.is_blocked ? (
                                  <span
                                    className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 ${
                                      u.mfa_enabled
                                        ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                        : 'border border-yellow-400/40 bg-yellow-500/10 text-yellow-200'
                                    }`}
                                  >
                                    <Fingerprint className="h-3 w-3" />
                                    {u.mfa_enabled
                                      ? t('users.userDetail.mfaEnabled')
                                      : t('users.userDetail.mfaPending')}
                                  </span>
                                ) : (
                                  <span className="inline-flex w-fit items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-red-200">
                                    <Lock className="h-3 w-3" />
                                    {t('users.blockedBadge')}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="consumption" className="mt-4 space-y-4">
            <p className="text-sm text-gray-400">{t('workspaces.consumptionIntro')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-widest text-gray-500">
                  {t('workspaces.consumptionUsageRecords')}
                </p>
                {usageLoading ? (
                  <Loader2 className="mt-3 h-8 w-8 animate-spin text-gray-500" aria-hidden />
                ) : usageError ? (
                  <p className="mt-2 text-sm text-amber-300/90">{t('workspaces.usageLoadError')}</p>
                ) : (
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {usageSummary != null ? usageSummary.total_events.toLocaleString() : '—'}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {usageQueryRange && usageSummary && !usageLoading && !usageError
                    ? t('workspaces.usageStatsPeriodFooter', {
                        start: usageQueryRange.from,
                        end: usageQueryRange.to,
                      })
                    : t('workspaces.mockPeriod')}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-widest text-gray-500">
                  {t('workspaces.consumptionTokens')}
                </p>
                {usageLoading ? (
                  <Loader2 className="mt-3 h-8 w-8 animate-spin text-gray-500" aria-hidden />
                ) : usageError ? (
                  <p className="mt-2 text-sm text-amber-300/90">{t('workspaces.usageLoadError')}</p>
                ) : (
                  <>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {usageSummary != null ? usageTotalTokens.toLocaleString() : '—'}
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                      {usageCostDisplay != null
                        ? t('workspaces.usageCostInPeriod', { amount: usageCostDisplay })
                        : '—'}
                    </p>
                  </>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {usageQueryRange && usageSummary && !usageLoading && !usageError
                    ? t('workspaces.usageStatsPeriodFooter', {
                        start: usageQueryRange.from,
                        end: usageQueryRange.to,
                      })
                    : t('workspaces.mockCosts')}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-widest text-gray-500">
                  {t('workspaces.consumptionPayments')}
                </p>
                {planCatalogLoading ? (
                  <Loader2 className="mt-3 h-6 w-6 animate-spin text-gray-500" aria-hidden />
                ) : planCatalog && planMonthlyPriceFormatted ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm font-medium text-white">
                      {t('workspaces.planWithMonthlyPrice', {
                        name: planCatalog.display_name,
                        price: planMonthlyPriceFormatted,
                      })}
                    </p>
                    <p className="text-xs text-gray-500">{t('workspaces.paymentsHistoryPending')}</p>
                  </div>
                ) : !planCatalogLoading &&
                  planFallbackBrlAmount != null &&
                  planFallbackPriceFormatted &&
                  planFallbackDisplayName ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm font-medium text-white">
                      {t('workspaces.planWithMonthlyPrice', {
                        name: planFallbackDisplayName,
                        price: planFallbackPriceFormatted,
                      })}
                    </p>
                    <p className="text-xs text-gray-500">{t('workspaces.paymentsHistoryPending')}</p>
                  </div>
                ) : planPaymentsLabel ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm font-medium text-white">{planPaymentsLabel}</p>
                    <p className="text-xs text-gray-500">{t('workspaces.paymentsHistoryPending')}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-400">{t('workspaces.paymentsPlanUnknown')}</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="danger" className="mt-4 space-y-6">
            {!canManageSignupReview ? (
              <p className="text-sm text-gray-400">{t('workspaces.dangerNoPermission')}</p>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-red-400">{t('workspaces.dangerTitle')}</h3>
                  <p className="text-sm text-gray-400">{t('workspaces.dangerSubtitle')}</p>
                </div>

                <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-5">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-8 w-8 shrink-0 text-red-400" />
                    <div className="space-y-3 text-sm text-gray-200">
                      <p>{t('workspaces.deleteCardBody')}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-500/60 text-red-300 hover:bg-red-500/10"
                        onClick={() => {
                          setPurgeConfirmText('');
                          setPurgeOpen(true);
                        }}
                      >
                        {t('workspaces.deleteWorkspaceCta')}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-5">
                  <div className="flex gap-3">
                    <Lock className="h-7 w-7 shrink-0 text-amber-300" />
                    <div className="space-y-3 text-sm text-gray-200">
                      <p>{t('workspaces.deactivateCardBody')}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-amber-500/50 text-amber-200 hover:bg-amber-500/10"
                        onClick={() => setDeactivateOpen(true)}
                      >
                        {t('workspaces.deactivateWorkspaceCta')}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
            onClick={onClose}
          >
            {t('workspaces.modalClose')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
            onClick={onEnterWorkspace}
          >
            {t('workspaces.modalEnterWorkspace')}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {detail &&
            canManageSignupReview &&
            !detailLoading &&
            allowedSignupActions(detail.signup_review_status).length > 0 &&
            selectedAction && (
              <Button
                type="button"
                className="gap-2 rounded-xl bg-[#EC4899] text-sm text-white hover:bg-[#EC4899]/90"
                disabled={savingAction}
                onClick={() => void onApplySignupAction()}
              >
                {savingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {savingAction ? t('workspaces.modalSaving') : t('workspaces.modalApplyAction')}
              </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog
      open={purgeOpen}
      onOpenChange={(next) => {
        setPurgeOpen(next);
        if (!next) setPurgeConfirmText('');
      }}
    >
      <AlertDialogContent className="border-white/10 bg-neutral-950 text-white sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('workspaces.purgeDialogTitle')}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            {t('workspaces.purgeDialogDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Input
            value={purgeConfirmText}
            onChange={(e) => setPurgeConfirmText(e.target.value)}
            placeholder={t('workspaces.purgeConfirmPlaceholder')}
            className="border-white/15 bg-black/50 font-mono text-sm text-white"
            autoComplete="off"
          />
          <p className="text-xs text-gray-500">{t('workspaces.purgeConfirmHint')}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-white/15 bg-transparent text-gray-200 hover:bg-white/10">
            {t('workspaces.destructiveCancel')}
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={purgeConfirmText !== 'DELETE' || destructiveLoading}
            onClick={() => void runPurgeWorkspace()}
          >
            {destructiveLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {destructiveLoading ? t('workspaces.destructiveWorking') : t('workspaces.purgeConfirmAction')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
      <AlertDialogContent className="border-white/10 bg-neutral-950 text-white sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('workspaces.deactivateDialogTitle')}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            {t('workspaces.deactivateDialogDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-white/15 bg-transparent text-gray-200 hover:bg-white/10">
            {t('workspaces.destructiveCancel')}
          </AlertDialogCancel>
          <Button
            type="button"
            className="bg-amber-600 text-white hover:bg-amber-600/90"
            disabled={destructiveLoading}
            onClick={() => void runDeactivateWorkspace()}
          >
            {destructiveLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {destructiveLoading ? t('workspaces.destructiveWorking') : t('workspaces.deactivateConfirmAction')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
