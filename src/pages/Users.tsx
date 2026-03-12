import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  Fingerprint,
  Loader2,
  Lock,
  Mail,
  Building2,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  UserCircle2,
  UserPlus,
  Users,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Layout from '../components/Layout';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AdminUserResponse,
  RoleResponse,
  InvitationResponse,
  assignRole,
  getAdminUsers,
  getRoles,
  getInvitations,
  createInvitation,
  resendInvitation,
  cancelInvitation,
  revokeRole,
} from '@/services/userService';

type StatusFilter = 'all' | 'active' | 'inactive' | 'blocked';
type MfaFilter = 'all' | 'enabled' | 'disabled';
type DocumentType = 'PF' | 'PJ';

const humanize = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/:/g, ' · ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getInitials = (name?: string | null, username?: string) => {
  const base = name || username || 'user';
  const parts = base.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const invitationStatusClasses = (status: InvitationResponse['status']) => {
  switch (status) {
    case 'pending':
      return 'border-yellow-400/40 bg-yellow-500/10 text-yellow-200';
    case 'sent':
      return 'border-blue-400/40 bg-blue-500/10 text-blue-200';
    case 'accepted':
      return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200';
    case 'expired':
      return 'border-gray-500/40 bg-gray-600/10 text-gray-200';
    case 'cancelled':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
    default:
      return 'border-white/20 bg-white/10 text-white';
  }
};

export default function UsersPage() {
  useRequireAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentCompany, availableCompanies } = useCompany();

  const formatRoleName = (roleName: string) => {
    const key = `users.roles.${roleName}`;
    const val = t(key);
    return val === key ? humanize(roleName) : val;
  };
  const formatRoleDescription = (roleName: string, fallback?: string | null) => {
    const key = `users.roleDescriptions.${roleName}`;
    const val = t(key);
    return val !== key ? val : (fallback ?? undefined);
  };
  const formatPermissionName = (permission: string) => {
    const key = `users.permissions.${permission}`;
    const val = t(key);
    return val === key ? humanize(permission) : val;
  };
  const formatDateTime = (value?: string | null, neverLabel?: string) => {
    if (!value) return neverLabel ?? t('users.neverAccessed');
    const date = new Date(value);
    return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  };

  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [mfaFilter, setMfaFilter] = useState<MfaFilter>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInvitesLoading, setIsInvitesLoading] = useState<boolean>(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const inviteCancelBtnRef = useRef<HTMLButtonElement>(null);
  const inviteSubmitBtnRef = useRef<HTMLButtonElement>(null);
  const userDetailCloseBtnRef = useRef<HTMLButtonElement>(null);

  const createRipple = (
    event: React.MouseEvent<HTMLElement>,
    ref: React.RefObject<HTMLElement>
  ) => {
    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.className = 'ripple-effect';

    element.appendChild(ripple);

    window.setTimeout(() => {
      ripple.remove();
    }, 1000);
  };
  const [inviteForm, setInviteForm] = useState<{
    email: string;
    roleName: string;
    documentType: DocumentType;
    inviteeName: string;
  }>({ email: '', roleName: 'viewer', documentType: 'PF', inviteeName: '' });
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [invitationAction, setInvitationAction] = useState<{ id: string; type: 'resend' | 'cancel' } | null>(null);

  const [roleMutation, setRoleMutation] = useState<{ userId: string; role: string } | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const isSuperadmin = Boolean(user?.is_superadmin);
  const showCompanyColumn = isSuperadmin || availableCompanies.length > 1;

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const roleOptions = useMemo(
    () => [
      { value: 'all', label: t('users.filters.allRoles') },
      ...roles.map((role) => ({ value: role.name, label: formatRoleName(role.name) })),
    ],
    [roles, t]
  );

  const inviteRoleOptions = useMemo(
    () => roles.map((role) => ({ value: role.name, label: formatRoleName(role.name) })),
    [roles]
  );

  const documentOptions: Array<{ value: DocumentType; label: string }> = [
    { value: 'PF', label: t('users.documentType.PF') },
    { value: 'PJ', label: t('users.documentType.PJ') },
  ];

  const companyOptions = useMemo(() => {
    const mapped = availableCompanies
      .map((company) => ({
        value: company.id,
        label: company.name,
        badge: company.plan,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (isSuperadmin) {
      return [{ value: 'all', label: t('users.filters.globalMode'), badge: 'superadmin' }, ...mapped];
    }

    return mapped;
  }, [availableCompanies, isSuperadmin, t]);

  const selectedCompanyOption = useMemo(() => {
    if (companyFilter) return companyFilter;
    if (isSuperadmin) return 'all';
    return availableCompanies[0]?.id ?? '';
  }, [availableCompanies, companyFilter, isSuperadmin]);

  const roleMap = useMemo(() => {
    const map: Record<string, RoleResponse> = {};
    roles.forEach((role) => {
      map[role.name] = role;
    });
    return map;
  }, [roles]);

  const sortedInvitations = useMemo(
    () =>
      [...invitations].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [invitations]
  );

  useEffect(() => {
    if (isSuperadmin) {
      const newValue = currentCompany?.id ?? null;
      if (companyFilter !== newValue) {
        setCompanyFilter(newValue);
      }
    } else {
      const target = currentCompany?.id ?? (availableCompanies[0]?.id ?? null);
      if (companyFilter !== target) {
        setCompanyFilter(target);
      }
    }
  }, [isSuperadmin, currentCompany?.id, availableCompanies, companyFilter]);

  const handleOpenUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedUserId(null);
  }, []);

  const loadInvitations = useCallback(async () => {
    setIsInvitesLoading(true);
    try {
      const invitationsResponse = await getInvitations();
      setInvitations(invitationsResponse);
    } catch (err) {
      console.error("users.load_invites_error", { error: err instanceof Error ? err.message : String(err) });
      toast({
        title: 'Erro ao carregar convites',
        description:
          err instanceof Error ? err.message : 'Não foi possível carregar os convites enviados.',
        variant: 'destructive',
      });
    } finally {
      setIsInvitesLoading(false);
    }
  }, [toast]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        getAdminUsers({
          companyId: companyFilter ?? undefined,
          includeCompany: true,
        }),
        getRoles(),
      ]);
      setUsers(usersResponse);
      setRoles(rolesResponse);
    } catch (err) {
      console.error("users.load_data_error", { error: err instanceof Error ? err.message : String(err) });
      setError(
        err instanceof Error ? err.message : 'Erro inesperado ao carregar os usuários.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [companyFilter]);

  useEffect(() => {
    loadData();
    loadInvitations();
  }, [loadData, loadInvitations]);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadData(), loadInvitations()]);
    setIsRefreshing(false);
  }, [loadData, loadInvitations]);

  const handleRoleToggle = useCallback(
    async (userId: string, roleName: string, checked: boolean, userCompanyId?: string | null) => {
      setRoleMutation({ userId, role: roleName });
      try {
        const scopeCompanyId =
          roleName === 'superadmin'
            ? undefined
            : companyFilter ?? userCompanyId ?? currentCompany?.id ?? undefined;

        if (checked) {
          await assignRole(userId, roleName, scopeCompanyId);
          toast({
            title: 'Permissão atribuída',
            description: `O papel "${roleName}" foi vinculado ao usuário.`,
          });
        } else {
          await revokeRole(userId, roleName, scopeCompanyId);
          toast({
            title: 'Permissão removida',
            description: `O papel "${roleName}" foi removido do usuário.`,
          });
        }
        await loadData();
      } catch (err) {
        console.error("users.role_update_error", { error: err instanceof Error ? err.message : String(err) });
        toast({
          variant: 'destructive',
          title: t('users.toasts.roleUpdateFailed'),
          description: err instanceof Error ? err.message : t('users.toasts.tryAgain'),
        });
      } finally {
        setRoleMutation(null);
      }
    },
    [companyFilter, currentCompany?.id, loadData, toast]
  );

  const resetInviteForm = useCallback(() => {
    setInviteForm({
      email: '',
      roleName: inviteRoleOptions[0]?.value ?? 'viewer',
      documentType: 'PF',
      inviteeName: '',
    });
    setInviteError(null);
  }, [inviteRoleOptions]);

  useEffect(() => {
    if (!inviteRoleOptions.length) return;
    setInviteForm((prev) => ({
      ...prev,
      roleName: inviteRoleOptions[0].value,
    }));
  }, [inviteRoleOptions]);

  const handleOpenInviteModal = useCallback(() => {
    if (isSuperadmin && !companyFilter) {
      toast({
        title: t('users.toasts.selectCompanyFirst'),
        description: t('users.toasts.chooseTenant'),
        variant: 'destructive',
      });
      return;
    }

    resetInviteForm();
    loadInvitations();
    setIsInviteModalOpen(true);
  }, [companyFilter, isSuperadmin, loadInvitations, resetInviteForm, toast]);

  const handleSubmitInvitation = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setInviteError(null);

      const email = inviteForm.email.trim().toLowerCase();
      if (!email) {
        setInviteError(t('users.toasts.provideEmail'));
        return;
      }

      if (!inviteForm.roleName) {
        setInviteError(t('users.toasts.selectRole'));
        return;
      }

      setIsSubmittingInvite(true);
      try {
        await createInvitation({
          email,
          user_type: inviteForm.roleName,
          document_type: inviteForm.documentType,
          metadata:
            inviteForm.inviteeName.trim().length > 0
              ? { invitee_name: inviteForm.inviteeName.trim() }
              : undefined,
        });

        toast({
          title: t('users.toasts.inviteSent'),
          description: `${t('users.toasts.inviteSentTo')} ${email}.`,
        });

        await loadInvitations();
        resetInviteForm();
        setIsInviteModalOpen(false);
      } catch (err) {
        console.error("users.invite_create_error", { error: err instanceof Error ? err.message : String(err) });
        setInviteError(
          err instanceof Error ? err.message : t('users.toasts.inviteError')
        );
      } finally {
        setIsSubmittingInvite(false);
      }
    },
    [
      inviteForm.documentType,
      inviteForm.email,
      inviteForm.inviteeName,
      inviteForm.roleName,
      loadInvitations,
      resetInviteForm,
      toast,
      t,
    ]
  );

  const handleResendInvitation = useCallback(
    async (invitationId: string) => {
      setInvitationAction({ id: invitationId, type: 'resend' });
      try {
        await resendInvitation(invitationId);
        toast({
          title: t('users.toasts.inviteResent'),
          description: t('users.toasts.inviteResentDesc'),
        });
        await loadInvitations();
      } catch (err) {
        console.error("users.invite_resend_error", { error: err instanceof Error ? err.message : String(err) });
        toast({
          title: t('users.toasts.resendError'),
          description: err instanceof Error ? err.message : t('users.toasts.resendErrorDesc'),
          variant: 'destructive',
        });
      } finally {
        setInvitationAction(null);
      }
    },
    [loadInvitations, toast]
  );

  const handleCancelInvitation = useCallback(
    async (invitationId: string) => {
      setInvitationAction({ id: invitationId, type: 'cancel' });
      try {
        await cancelInvitation(invitationId);
        toast({
          title: t('users.toasts.inviteCancelled'),
          description: t('users.toasts.inviteCancelledDesc'),
        });
        await loadInvitations();
      } catch (err) {
        console.error("users.invite_cancel_error", { error: err instanceof Error ? err.message : String(err) });
        toast({
          title: t('users.toasts.cancelError'),
          description: err instanceof Error ? err.message : t('users.toasts.cancelErrorDesc'),
          variant: 'destructive',
        });
      } finally {
        setInvitationAction(null);
      }
    },
    [loadInvitations, toast]
  );

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (statusFilter === 'active' && !user.is_active) return false;
      if (statusFilter === 'inactive' && user.is_active) return false;
      if (statusFilter === 'blocked' && !user.is_blocked) return false;

      if (mfaFilter === 'enabled' && !user.mfa_enabled) return false;
      if (mfaFilter === 'disabled' && user.mfa_enabled) return false;

      if (roleFilter !== 'all') {
        const hasRole = user.roles.some((role) => role.name === roleFilter);
        if (!hasRole) return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const target = `${user.name ?? ''} ${user.username} ${user.email} ${user.company?.name ?? ''}`.toLowerCase();
        if (!target.includes(term)) return false;
      }

      return true;
    });
  }, [users, statusFilter, mfaFilter, roleFilter, searchTerm]);

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.is_active).length;
  const blockedUsers = users.filter((user) => user.is_blocked).length;
  const mfaEnabled = users.filter((user) => user.mfa_enabled).length;

  const summaryCards = [
    {
      id: 'total',
      label: t('users.cards.total'),
      value: totalUsers,
      icon: Users,
      active: statusFilter === 'all',
      onClick: () => setStatusFilter('all'),
      hint: t('users.cards.totalHint'),
    },
    {
      id: 'active',
      label: t('users.cards.active'),
      value: activeUsers,
      icon: ShieldCheck,
      active: statusFilter === 'active',
      onClick: () => setStatusFilter('active'),
      hint: t('users.cards.activeHint'),
    },
    {
      id: 'blocked',
      label: t('users.cards.blocked'),
      value: blockedUsers,
      icon: Lock,
      active: statusFilter === 'blocked',
      onClick: () => setStatusFilter('blocked'),
      hint: t('users.cards.blockedHint'),
    },
    {
      id: 'mfa',
      label: t('users.cards.mfa'),
      value: mfaEnabled,
      icon: Fingerprint,
      active: mfaFilter === 'enabled',
      onClick: () => setMfaFilter(mfaFilter === 'enabled' ? 'all' : 'enabled'),
      hint: t('users.cards.mfaHint'),
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <header className="rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-6 shadow-[0_30px_80px_-60px_rgba(236,72,153,0.45)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-white">{t('users.title')}</h1>
              <p className="mt-2 text-sm text-gray-400">
                {t('users.subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenInviteModal}
                disabled={isSuperadmin && !companyFilter}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#EC4899] bg-[#EC4899] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#EC4899]/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                {t('users.buttons.inviteUser')}
              </button>
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-gray-300 transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('users.buttons.refreshing')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    {t('users.buttons.refresh')}
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <button
              type="button"
              key={card.id}
              onClick={card.onClick}
              className={`glass-card group flex flex-col gap-4 rounded-3xl border px-6 py-5 text-left transition ${
                card.active
                  ? 'border-[#EC4899]/70 bg-[#EC4899]/10 shadow-[0_25px_60px_-45px_rgba(236,72,153,0.8)]'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>{card.label}</span>
                <card.icon className="h-4 w-4 text-[#EC4899]" />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-semibold text-white">{card.value}</span>
                <Badge
                  variant="outline"
                  className="border-white/20 bg-white/5 text-xs text-gray-300 backdrop-blur"
                >
                  {card.hint}
                </Badge>
              </div>
            </button>
          ))}
        </section>

        <section className="glass-card flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-6 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-gray-300 focus-within:border-[#EC4899]/60 focus-within:text-white">
              <Search className="h-4 w-4 shrink-0 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                placeholder={t('users.filters.searchPlaceholder')}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {(isSuperadmin || availableCompanies.length > 1) && selectedCompanyOption !== '' && (
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-gray-400">
                  <Building2 className="h-3.5 w-3.5 text-[#EC4899]" />
                  <Select
                    value={selectedCompanyOption}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        setCompanyFilter(null);
                      } else {
                        setCompanyFilter(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[220px] border-0 bg-transparent px-0 text-sm text-white focus:ring-0 focus-visible:ring-0">
                      <SelectValue placeholder={t('users.filters.selectCompany')} />
                    </SelectTrigger>
                    <SelectContent className="border border-white/10 bg-[#0b0b12] text-white">
                      {companyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center justify-between gap-3">
                            <span>{option.label}</span>
                            {option.badge && (
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/70">
                                {option.badge}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-gray-400">
                <Shield className="h-3.5 w-3.5 text-[#EC4899]" />
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value} className="text-gray-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-gray-400">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
                <button
                  onClick={() =>
                    setMfaFilter((previous) =>
                      previous === 'enabled' ? 'all' : previous === 'disabled' ? 'all' : 'enabled'
                    )
                  }
                  className={`rounded-xl px-3 py-1 text-sm transition ${
                    mfaFilter === 'enabled'
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {mfaFilter === 'enabled' ? 'MFA habilitado' : 'Filtrar MFA'}
                </button>
                <button
                  onClick={() =>
                    setMfaFilter((previous) =>
                      previous === 'disabled' ? 'all' : previous === 'enabled' ? 'all' : 'disabled'
                    )
                  }
                  className={`rounded-xl px-3 py-1 text-sm transition ${
                    mfaFilter === 'disabled'
                      ? 'bg-red-500/20 text-red-200'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {mfaFilter === 'disabled' ? 'Sem MFA' : 'Filtrar sem MFA'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-white/5">
            <Table className="min-w-full text-sm text-gray-300">
              <TableHeader className="bg-white/5 text-xs font-medium uppercase tracking-wide text-gray-400">
                <TableRow className="border-white/5">
                  <TableHead className="w-[360px]">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-10 rounded-full border border-transparent bg-transparent" />
                      <span>Usuário</span>
                    </div>
                  </TableHead>
                  <TableHead className="w-[260px]">{t('users.table.contact')}</TableHead>
                  {showCompanyColumn && <TableHead className="w-[220px]">{t('users.table.company')}</TableHead>}
                  <TableHead className="w-[220px]">{t('users.table.roles')}</TableHead>
                  <TableHead className="w-[200px]">{t('users.table.status')}</TableHead>
                  <TableHead className="text-right">{t('users.table.details')}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      <div className="flex items-center justify-center gap-3 py-12 text-sm text-gray-400">
                        <Loader2 className="h-5 w-5 animate-spin text-[#EC4899]" />
                        {t('users.empty.loadingTeam')}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      <div className="flex flex-col items-center gap-3 py-12 text-sm text-gray-400">
                        <Users className="h-6 w-6 text-gray-500" />
                        {t('users.empty.noUsers')}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const roleNames = user.roles.map((role) => role.name);
                    return (
                      <TableRow
                        key={user.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleOpenUser(user.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleOpenUser(user.id);
                          }
                        }}
                        className="cursor-pointer border-white/5 transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-base font-semibold text-white">
                              {getInitials(user.name, user.username)}
                            </div>
                            <div className="leading-tight">
                              <p className="text-sm font-semibold text-white">
                                {user.name || user.username}
                              </p>
                              <span className="text-xs text-gray-400">@{user.username}</span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs text-gray-300">
                            <span className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-gray-500" />
                              {user.email}
                            </span>
                            <span className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-gray-500" />
                              {t('users.lastAccess')}: {formatDateTime(user.last_login_at)}
                            </span>
                          </div>
                        </TableCell>

                        {showCompanyColumn && (
                          <TableCell>
                            {user.company ? (
                              <div className="flex flex-col gap-1 text-xs text-gray-300">
                                <span className="font-medium text-white">{user.company.name}</span>
                                {user.company.domain && (
                                  <span className="text-white/50">{user.company.domain}</span>
                                )}
                                <span className="inline-flex w-fit items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-[11px] uppercase tracking-widest text-white/60">
                                  {t('users.plan')} {user.company.plan}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-white/40">{t('users.noCompany')}</span>
                            )}
                          </TableCell>
                        )}

                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            {roleNames.length ? (
                              roleNames.map((role) => {
                                const roleDetails = roleMap[role];
                                const perms = roleDetails?.permissions ?? [];
                                const description = formatRoleDescription(role, roleDetails?.description);
                                return (
                                  <HoverCard key={role}>
                                    <HoverCardTrigger asChild>
                                      <Badge
                                        variant="outline"
                                        className="cursor-default border-[#EC4899]/30 bg-[#EC4899]/10 text-xs text-[#EC4899]"
                                      >
                                        <Shield className="mr-1 h-3 w-3" />
                                        {formatRoleName(role)}
                                      </Badge>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-72 border border-white/10 bg-[#0b0b12]/90 text-xs text-gray-200 shadow-lg backdrop-blur-xl">
                                      <div className="space-y-2">
                                        <p className="font-semibold text-white">
                                          {formatRoleName(role)}
                                        </p>
                                        {description && (
                                          <p className="text-[11px] text-gray-400">{description}</p>
                                        )}
                                        {perms.length ? (
                                          <ul className="grid gap-1 text-[11px] text-gray-300">
                                            {perms.map((permission) => (
                                              <li key={permission} className="flex items-center gap-1">
                                                <span className="h-1.5 w-1.5 rounded-full bg-[#EC4899]" />
                                                {formatPermissionName(permission)}
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <span className="text-[11px] text-gray-500">
                                            Nenhuma permissão vinculada.
                                          </span>
                                        )}
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                );
                              })
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-gray-700 bg-gray-700/40 text-xs text-gray-300"
                              >
                                Sem papéis
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-2 text-xs text-gray-300">
                            <div
                              className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs ${
                                user.is_active
                                  ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                  : 'border border-red-500/40 bg-red-500/10 text-red-200'
                              }`}
                            >
                              <ShieldCheck className="h-3 w-3" />
                              {user.is_active ? 'Ativo' : 'Inativo'}
                            </div>
                            {user.is_blocked ? (
                              <div className="inline-flex w-fit items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs text-red-200">
                                <Lock className="h-3 w-3" />
                                Bloqueado
                              </div>
                            ) : (
                              <div
                                className={`inline-flex w-fit items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                                  user.mfa_enabled
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                    : 'border-yellow-400/40 bg-yellow-500/10 text-yellow-200'
                                }`}
                              >
                                <Fingerprint className="h-3 w-3" />
                                {user.mfa_enabled ? 'MFA habilitado' : 'MFA pendente'}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right text-sm text-[#EC4899] transition group-hover:text-[#f472b6]">
                          <span className="pointer-events-none inline-flex items-center gap-2 font-medium">
                            Ver detalhes
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>

      </div>

      <Dialog
        open={isInviteModalOpen}
        onOpenChange={(open) => {
          if (!open && !isSubmittingInvite) {
            setIsInviteModalOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl border-white/10 bg-black/90 text-white">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-semibold text-white sm:text-3xl">{t('users.inviteModal.title')}</DialogTitle>
            <DialogDescription className="text-sm text-gray-300/90">
              {t('users.inviteModal.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-7">
            <form onSubmit={handleSubmitInvitation} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-gray-200">
                  {t('users.inviteModal.emailLabel')}
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(event) =>
                      setInviteForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-[#EC4899]/60 focus:outline-none focus:ring-1 focus:ring-[#EC4899]/30"
                    placeholder={t('users.inviteModal.emailPlaceholder')}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-gray-200">
                  {t('users.inviteModal.nameOptional')}
                  <input
                    type="text"
                    value={inviteForm.inviteeName}
                    onChange={(event) =>
                      setInviteForm((prev) => ({ ...prev, inviteeName: event.target.value }))
                    }
                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-[#EC4899]/60 focus:outline-none focus:ring-1 focus:ring-[#EC4899]/30"
                    placeholder={t('users.inviteModal.namePlaceholder')}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-gray-200">
                  {t('users.inviteModal.roleLabel')}
                  <select
                    value={inviteForm.roleName}
                    onChange={(event) =>
                      setInviteForm((prev) => ({ ...prev, roleName: event.target.value }))
                    }
                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-[#EC4899]/60 focus:outline-none focus:ring-1 focus:ring-[#EC4899]/30"
                  >
                    {inviteRoleOptions.map((option) => (
                      <option key={option.value} value={option.value} className="text-gray-900">
                        {option.label}
                      </option>
                    ))}
                    {inviteRoleOptions.length === 0 && (
                      <option value="" className="text-gray-900">
                        {t('users.empty.noRoleAvailable')}
                      </option>
                    )}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm text-gray-200">
                  {t('users.inviteModal.documentType')}
                  <select
                    value={inviteForm.documentType}
                    onChange={(event) =>
                      setInviteForm((prev) => ({
                        ...prev,
                        documentType: event.target.value as DocumentType,
                      }))
                    }
                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-[#EC4899]/60 focus:outline-none focus:ring-1 focus:ring-[#EC4899]/30"
                  >
                    {documentOptions.map((option) => (
                      <option key={option.value} value={option.value} className="text-gray-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {inviteError && (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {inviteError}
                </div>
              )}

              <DialogFooter className="mt-2">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    ref={inviteCancelBtnRef}
                    type="button"
                    onMouseEnter={(event) => createRipple(event, inviteCancelBtnRef)}
                    onClick={() => {
                      if (!isSubmittingInvite) {
                        setIsInviteModalOpen(false);
                      }
                    }}
                    className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm text-gray-200 transition hover:bg-white/[0.12]"
                    disabled={isSubmittingInvite}
                  >
                    {t('users.buttons.cancel')}
                  </button>
                  <button
                    ref={inviteSubmitBtnRef}
                    type="submit"
                    onMouseEnter={(event) => createRipple(event, inviteSubmitBtnRef)}
                    disabled={isSubmittingInvite || inviteRoleOptions.length === 0}
                    className="relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[#EC4899]/80 bg-[#EC4899] px-5 py-3 text-sm font-medium text-white shadow-[0_26px_55px_-30px_rgba(236,72,153,0.75)] transition hover:bg-[#EC4899]/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmittingInvite ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('users.buttons.sendingInvite')}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        {t('users.buttons.sendInvite')}
                      </>
                    )}
                  </button>
                </div>
              </DialogFooter>
            </form>

            <section className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{t('users.recentInvites')}</h3>
                <span className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {sortedInvitations.length} {t('users.records')}
                </span>
              </div>

              {isInvitesLoading ? (
                <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin text-[#EC4899]" />
                  {t('users.empty.loadingInvites')}
                </div>
              ) : sortedInvitations.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-sm text-gray-400">
                  <Users className="h-6 w-6 text-gray-500" />
                  {t('users.empty.noInvites')}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {sortedInvitations.map((invitation) => {
                    const metadata =
                      (invitation.metadata_json as { invitee_name?: string } | undefined) ?? {};
                    const inviteeName =
                      typeof metadata.invitee_name === 'string' && metadata.invitee_name.trim().length > 0
                        ? metadata.invitee_name
                        : invitation.email;
                    const isResendDisabled =
                      invitationAction?.id === invitation.id &&
                      invitationAction.type === 'resend';
                    const isCancelDisabled =
                      invitationAction?.id === invitation.id &&
                      invitationAction.type === 'cancel';

                    const canResend = invitation.status !== 'accepted' && invitation.status !== 'cancelled';
                    const canCancel =
                      invitation.status !== 'accepted' &&
                      invitation.status !== 'cancelled' &&
                      invitation.status !== 'expired';

                    return (
                      <div
                        key={invitation.id}
                        className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{inviteeName}</p>
                          <p className="text-xs text-gray-400">{invitation.email}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                            <span>{formatRoleName(invitation.user_type)}</span>
                            <span>{t('users.expiresAt')} {formatDateTime(invitation.expires_at)}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-4">
                          <Badge
                            variant="outline"
                            className={`border ${invitationStatusClasses(invitation.status)}`}
                          >
                            {t(`users.invitationStatus.${invitation.status}`)}
                          </Badge>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!canResend || isResendDisabled}
                              onClick={() => handleResendInvitation(invitation.id)}
                              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-gray-200 transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isResendDisabled ? (
                                <span className="inline-flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  {t('users.buttons.resending')}
                                </span>
                              ) : (
                                t('users.buttons.resend')
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={!canCancel || isCancelDisabled}
                              onClick={() => handleCancelInvitation(invitation.id)}
                              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isCancelDisabled ? (
                                <span className="inline-flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  {t('users.buttons.cancelling')}
                                </span>
                              ) : (
                                t('users.buttons.cancelInvite')
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isModalOpen && Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
        }}
      >
        <DialogContent className="max-w-lg border-white/10 bg-black/90 text-white">
          {selectedUser ? (
            <div className="relative overflow-hidden rounded-[2rem]">
              <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#EC4899]/12 via-transparent to-[#111117]/60" />
              <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-7 sm:px-8">
                <DialogHeader className="space-y-3 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.12] text-lg font-semibold text-white shadow-[0_25px_60px_-45px_rgba(0,0,0,0.55)]">
                      {getInitials(selectedUser.name, selectedUser.username)}
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-semibold text-white sm:text-2xl">
                        {selectedUser.name || selectedUser.username}
                      </DialogTitle>
                      <DialogDescription className="text-sm text-gray-200/70">
                        @{selectedUser.username} • {selectedUser.email}
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className="border-white/20 bg-white/12 text-gray-200 backdrop-blur"
                    >
                      {t('users.userDetail.createdAt')} {formatDateTime(selectedUser.created_at)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-white/20 bg-white/12 text-gray-200 backdrop-blur"
                    >
                      {t('users.userDetail.lastAccess')} {formatDateTime(selectedUser.last_login_at)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`border ${
                        selectedUser.mfa_enabled
                          ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                          : 'border-amber-400/40 bg-amber-500/15 text-amber-200'
                      }`}
                    >
                      {selectedUser.mfa_enabled ? t('users.userDetail.mfaEnabled') : t('users.userDetail.mfaPending')}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-3">
                  {roles.map((role) => {
                    const isChecked = selectedUser.roles.some((item) => item.name === role.name);
                    const isLoadingMutation =
                      roleMutation?.userId === selectedUser.id && roleMutation.role === role.name;
                    const displayName = formatRoleName(role.name);
                    const displayDescription = formatRoleDescription(role.name, role.description);
                    const permissions = role.permissions ?? [];
                    return (
                      <div
                        key={role.id}
                      className="flex items-start justify-between gap-4 rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 transition hover:border-white/20"
                      >
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <div className="flex flex-col gap-1 cursor-default">
                              <span className="flex items-center gap-2 text-sm font-medium text-white">
                                <Shield className="h-4 w-4 text-white/80" />
                                {displayName}
                              </span>
                              {displayDescription && (
                                <span className="text-xs text-gray-300/80">{displayDescription}</span>
                              )}
                              <span className="text-[10px] text-gray-400/90">
                                {t('users.userDetail.hoverPermissions')}
                              </span>
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-64 border border-white/15 bg-[#070910]/95 text-xs text-gray-200 shadow-[0_25px_60px_-45px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                            <p className="mb-2 font-medium text-white">{displayName}</p>
                            {permissions.length ? (
                              <ul className="grid gap-1 text-[11px] text-gray-300">
                                {permissions.map((permission) => (
                                  <li key={permission} className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                                    {formatPermissionName(permission)}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-[11px] text-gray-500">
                                {t('users.empty.noPermissions')}
                              </span>
                            )}
                          </HoverCardContent>
                        </HoverCard>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(value) =>
                            handleRoleToggle(
                              selectedUser.id,
                              role.name,
                              Boolean(value),
                              selectedUser.company_id
                            )
                          }
                          disabled={isLoadingMutation}
                        />
                      </div>
                    );
                  })}
                </div>

                <DialogFooter className="mt-5 flex-col gap-3 border-t border-white/12 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[11px] text-gray-400">
                    {t('users.userDetail.userId')}: <span className="font-mono text-gray-200">{selectedUser.id}</span>
                  </span>
                  <button
                    ref={userDetailCloseBtnRef}
                    type="button"
                    onMouseEnter={(event) => createRipple(event, userDetailCloseBtnRef)}
                    onClick={handleCloseModal}
                    className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.08] px-4 py-2.5 text-sm text-gray-100 transition hover:bg-white/[0.16]"
                  >
                    {t('users.buttons.close')}
                  </button>
                </DialogFooter>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin text-[#EC4899]" />
              {t('users.userDetail.loadingDetails')}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

