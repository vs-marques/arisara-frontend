import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import {
  Activity,
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Filter,
  Globe,
  Loader2,
  Plus,
  RefreshCcw,
  UploadCloud,
  X,
  Timer,
  Search,
  Key,
} from 'lucide-react';
import {
  discoveryService,
  DiscoveryEndpoint,
  DiscoverySource,
  DiscoverySourceCreatePayload,
  TestEndpointResponse,
  vaultService,
  VaultSecret,
} from '@/services/discoveryService';
import { ArisaraSwitch } from '@/components/ui/nyoka-switch';
import type { MouseEvent as ReactMouseEvent } from 'react';

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-200',
  approved: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  blocked: 'border-red-400/40 bg-red-400/10 text-red-200',
  deprecated: 'border-gray-400/40 bg-gray-400/10 text-gray-200',
};

// Métodos HTTP que modificam dados (críticos)
const CRITICAL_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

type Summary = {
  total: number;
  pending: number;
  approved: number;
  blocked: number;
  deprecated: number;
};

export default function DiscoveryPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [sources, setSources] = useState<DiscoverySource[]>([]);
  const [endpoints, setEndpoints] = useState<DiscoveryEndpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [vaultSecrets, setVaultSecrets] = useState<VaultSecret[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<DiscoveryEndpoint | null>(null);
  const [endpointSearch, setEndpointSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showCriticalEndpoints, setShowCriticalEndpoints] = useState(false);

  const [createSourceOpen, setCreateSourceOpen] = useState(false);
  const [createSourceLoading, setCreateSourceLoading] = useState(false);
  const [createSourceForm, setCreateSourceForm] = useState({
    name: '',
    baseUrl: '',
    description: '',
  });
  const [createSourceAuthType, setCreateSourceAuthType] = useState('none');
  const [createSourceUseVault, setCreateSourceUseVault] = useState(false);
  const [createSourceSecretRef, setCreateSourceSecretRef] = useState('');
  const [createSourceProvider, setCreateSourceProvider] = useState('');

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importSourceId, setImportSourceId] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(false);

  // Modal de confirmação para endpoints críticos
  const [criticalConfirmOpen, setCriticalConfirmOpen] = useState(false);
  const [criticalConfirmKeyword, setCriticalConfirmKeyword] = useState('');
  const [pendingApprovalStatus, setPendingApprovalStatus] = useState<'approved' | 'blocked' | 'deprecated' | null>(null);
  const CONFIRM_KEYWORD = 'APROVAR';

  // Estado para teste de endpoint
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestEndpointResponse | null>(null);
  const [testPathParams, setTestPathParams] = useState<Record<string, string>>({});

  const [vaultDialogOpen, setVaultDialogOpen] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultForm, setVaultForm] = useState({
    reference: '',
    provider: '',
    description: '',
    secretData: '',
    metadata: '',
  });
  const newCredentialBtnRef = useRef<HTMLButtonElement>(null);
  const newSourceBtnRef = useRef<HTMLButtonElement>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);

  const createRipple = (event: ReactMouseEvent<HTMLElement>, ref: React.RefObject<HTMLElement>) => {
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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [sourcesResponse, endpointsResponse, secretsResponse] = await Promise.all([
          discoveryService.listSources(),
          discoveryService.listEndpoints(),
          vaultService.listSecrets(),
        ]);
        setSources(sourcesResponse);
        setEndpoints(endpointsResponse);
        setVaultSecrets(secretsResponse);
      } catch (error) {
        console.error("discovery.load_catalog_error", { error: error instanceof Error ? error.message : String(error) });
        toast({
          variant: 'destructive',
          title: t('discovery.toasts.loadFailed'),
          description: 'Tente novamente em instantes.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const summary = useMemo<Summary>(() => {
    const total = endpoints.length;
    const pending = endpoints.filter((endpoint) => endpoint.status === 'pending').length;
    const approved = endpoints.filter((endpoint) => endpoint.status === 'approved').length;
    const blocked = endpoints.filter((endpoint) => endpoint.status === 'blocked').length;
    const deprecated = endpoints.filter((endpoint) => endpoint.status === 'deprecated').length;

    return { total, pending, approved, blocked, deprecated };
  }, [endpoints]);

  const sourcesById = useMemo(() => {
    const map: Record<string, DiscoverySource> = {};
    sources.forEach((source) => {
      map[source.id] = source;
    });
    return map;
  }, [sources]);

  const filteredEndpoints = useMemo(() => {
    let list = endpoints;

    // Filtrar por método HTTP (mostrar apenas GET por padrão)
    if (!showCriticalEndpoints) {
      list = list.filter((endpoint) => !CRITICAL_METHODS.includes(endpoint.method.toUpperCase()));
    }

    if (selectedSourceId) {
      list = list.filter((endpoint) => endpoint.source_id === selectedSourceId);
    }

    if (statusFilter) {
      list = list.filter(
        (endpoint) => (endpoint.status || 'pending').toLowerCase() === statusFilter,
      );
    }

    const query = endpointSearch.trim().toLowerCase();
    if (query) {
      list = list.filter((endpoint) => {
        const source = sourcesById[endpoint.source_id];
        const haystack = [
          endpoint.method,
          endpoint.path,
          endpoint.description ?? '',
          source?.name ?? '',
          endpoint.origin ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    return list;
  }, [endpoints, selectedSourceId, endpointSearch, sourcesById, statusFilter, showCriticalEndpoints]);

  // Contagem de endpoints críticos (para exibir no badge)
  const criticalCount = useMemo(() => {
    return endpoints.filter((endpoint) => CRITICAL_METHODS.includes(endpoint.method.toUpperCase())).length;
  }, [endpoints]);

  useEffect(() => {
    if (selectedEndpoint && !filteredEndpoints.some((endpoint) => endpoint.id === selectedEndpoint.id)) {
      setSelectedEndpoint(null);
    }
  }, [filteredEndpoints, selectedEndpoint]);

  const currentSource = selectedSourceId ? sourcesById[selectedSourceId] : null;

  const handleToggleStatusFilter = (key: string | null) => {
    if (!key || key === 'total') {
      setStatusFilter(null);
      return;
    }

    // Sempre seleciona o card clicado (não deseleciona ao clicar novamente)
    setStatusFilter(key);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [sourcesResponse, endpointsResponse, secretsResponse] = await Promise.all([
        discoveryService.listSources(),
        discoveryService.listEndpoints(),
        vaultService.listSecrets(),
      ]);
      setSources(sourcesResponse);
      setEndpoints(endpointsResponse);
      setVaultSecrets(secretsResponse);
      toast({
        title: t('discovery.toasts.catalogUpdated'),
        description: 'Parâmetros de discovery recarregados com sucesso.',
      });
    } catch (error) {
      console.error("discovery.update_catalog_error", { error: error instanceof Error ? error.message : String(error) });
      toast({
        variant: 'destructive',
        title: t('discovery.toasts.refreshFailed'),
        description: 'Tente novamente em instantes.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const resetCreateForm = () => {
    setCreateSourceForm({
      name: '',
      baseUrl: '',
      description: '',
    });
    setCreateSourceAuthType('none');
    setCreateSourceUseVault(false);
    setCreateSourceSecretRef('');
    setCreateSourceProvider('');
  };

  const resetVaultForm = () => {
    setVaultForm({
      reference: '',
      provider: '',
      description: '',
      secretData: '',
      metadata: '',
    });
  };

  const handleVaultSubmit = async () => {
    if (!vaultForm.reference.trim()) {
      toast({
        variant: 'destructive',
        title: t('discovery.toasts.provideIdentifier'),
        description: 'Defina um nome único para a credencial (ex.: nyoka/default).',
      });
      return;
    }

    if (!vaultForm.secretData.trim()) {
      toast({
        variant: 'destructive',
        title: t('discovery.toasts.provideSecretPayload'),
        description: 'Cole o JSON com as credenciais que serão criptografadas.',
      });
      return;
    }

    let secretPayload: Record<string, unknown>;
    let metadataPayload: Record<string, unknown> = {};

    try {
      secretPayload = JSON.parse(vaultForm.secretData);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('discovery.toasts.invalidJson'),
        description: 'Verifique o corpo da credencial. O formato precisa ser um JSON válido.',
      });
      return;
    }

    if (vaultForm.metadata.trim()) {
      try {
        metadataPayload = JSON.parse(vaultForm.metadata);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: t('discovery.toasts.invalidMetadata'),
          description: 'Os metadados opcionais também precisam estar em formato JSON.',
        });
        return;
      }
    }

    setVaultLoading(true);
    try {
      const created = await vaultService.createSecret({
        reference: vaultForm.reference.trim(),
        provider: vaultForm.provider.trim() || 'custom',
        description: vaultForm.description.trim() || undefined,
        secret_data: secretPayload,
        metadata: metadataPayload,
      });

      setVaultSecrets((prev) => {
        const filtered = prev.filter((secret) => secret.reference !== created.reference);
        return [created, ...filtered];
      });

      if (createSourceUseVault) {
        setCreateSourceSecretRef(created.reference);
        setCreateSourceProvider(created.provider || '');
      }

      toast({
        title: t('discovery.toasts.credentialStored'),
        description: 'O segredo foi criptografado no Vault da Arisara.',
      });
      setVaultDialogOpen(false);
      resetVaultForm();
    } catch (error: any) {
      console.error("vault.save_credential_error", { error: error instanceof Error ? error.message : String(error) });
      toast({
        variant: 'destructive',
        title: t('discovery.toasts.credentialSaveFailed'),
        description: error.response?.data?.detail || 'Verifique os dados informados e tente novamente.',
      });
    } finally {
      setVaultLoading(false);
    }
  };

  const handleCreateSource = async () => {
    if (!createSourceForm.name.trim() || !createSourceForm.baseUrl.trim()) {
      toast({
        variant: 'destructive',
        title: t('discovery.toasts.fillRequired'),
        description: 'Informe nome e base URL para cadastrar uma nova fonte.',
      });
      return;
    }

    if (!createSourceUseVault && createSourceAuthType !== 'none') {
      toast({
        variant: 'destructive',
        title: t('discovery.toasts.addCredentialToVault'),
        description:
          'Para usar autenticação, selecione "Credencial do Vault" ou mantenha a fonte como pública (sem autenticação).',
      });
      return;
    }

    if (createSourceUseVault && !createSourceSecretRef.trim()) {
      toast({
        variant: 'destructive',
        title: t('discovery.toasts.selectCredential'),
        description: 'Escolha a credencial cadastrada no Vault antes de salvar a fonte.',
      });
      return;
    }

    setCreateSourceLoading(true);
    try {
      const payload: DiscoverySourceCreatePayload = {
        name: createSourceForm.name.trim(),
        base_url: createSourceForm.baseUrl.trim(),
        description: createSourceForm.description.trim() || undefined,
        auth_type: createSourceUseVault
          ? createSourceAuthType === 'none'
            ? 'bearer'
            : createSourceAuthType
          : 'none',
      };

      if (createSourceUseVault) {
        payload.auth_config = {
          secret_ref: createSourceSecretRef.trim(),
          provider: createSourceProvider.trim() || undefined,
          strategy: 'vault',
        };
      }

      const created = await discoveryService.createSource(payload);
      setSources((prev) => [...prev, created]);
      toast({
        title: t('discovery.toasts.sourceCreated'),
        description: 'Agora você pode importar a especificação ou configurar endpoints manualmente.',
      });
      setCreateSourceOpen(false);
      resetCreateForm();
    } catch (error: any) {
      console.error("discovery.create_source_error", { error: error instanceof Error ? error.message : String(error) });
      toast({
        variant: 'destructive',
        title: t('discovery.toasts.sourceCreateFailed'),
        description: error.response?.data?.detail || 'Verifique os dados informados e tente novamente.',
      });
    } finally {
      setCreateSourceLoading(false);
    }
  };

  const handleOpenImportDialog = (sourceId: string) => {
    setImportSourceId(sourceId);
    setImportUrl('');
    setImportDialogOpen(true);
  };

  const handleImportOpenApi = async () => {
    if (!importSourceId) {
      return;
    }

    if (!importUrl.trim()) {
      toast({
        variant: 'destructive',
        title: t('discovery.toasts.urlRequired'),
        description: t('discovery.toasts.urlDescription'),
      });
      return;
    }

    setImportLoading(true);
    try {
      const imported = await discoveryService.importOpenApi(importSourceId, {
        openapi_url: importUrl.trim(),
      });

      setEndpoints((prev) => {
        const remaining = prev.filter((endpoint) => !imported.some((item) => item.id === endpoint.id));
        return [...imported, ...remaining];
      });

      toast({
        title: t('discovery.toasts.specImported'),
        description: `${imported.length} ${t('discovery.toasts.endpointsAdded')}`,
      });
      setImportDialogOpen(false);
      setImportSourceId(null);
      setImportUrl('');
    } catch (error: any) {
      console.error("discovery.import_openapi_error", { error: error instanceof Error ? error.message : String(error) });
      toast({
        variant: 'destructive',
        title: t('discovery.toasts.importFailed'),
        description: error.response?.data?.detail || t('discovery.toasts.importError'),
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleApproveEndpoint = async (status: 'approved' | 'blocked' | 'deprecated') => {
    if (!selectedEndpoint) {
      return;
    }

    // Se for aprovação de endpoint crítico, abre modal de confirmação
    const isCritical = CRITICAL_METHODS.includes(selectedEndpoint.method.toUpperCase());
    if (status === 'approved' && isCritical && !criticalConfirmOpen) {
      setPendingApprovalStatus(status);
      setCriticalConfirmOpen(true);
      setCriticalConfirmKeyword('');
      return;
    }

    setApprovalLoading(true);
    try {
      const updated = await discoveryService.approveEndpoint(selectedEndpoint.id, {
        status,
        notes: approvalNotes.trim() || undefined,
      });

      setEndpoints((prev) =>
        prev.map((endpoint) => (endpoint.id === updated.id ? updated : endpoint)),
      );
      setSelectedEndpoint(updated);
      setApprovalNotes('');

      // Fechar modal de confirmação se estiver aberto
      if (criticalConfirmOpen) {
        setCriticalConfirmOpen(false);
        setCriticalConfirmKeyword('');
        setPendingApprovalStatus(null);
      }

      toast({
        title: t('discovery.toasts.endpointUpdated'),
        description: `${t('discovery.toasts.statusChanged')} ${t(`discovery.status.${status}`).toLowerCase()}.`,
      });
    } catch (error: any) {
      console.error("discovery.update_endpoint_error", { error: error instanceof Error ? error.message : String(error) });
      toast({
        variant: 'destructive',
        title: t('discovery.toasts.updateFailed'),
        description: error.response?.data?.detail || t('discovery.toasts.updateError'),
      });
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleConfirmCriticalApproval = () => {
    if (criticalConfirmKeyword === CONFIRM_KEYWORD && pendingApprovalStatus) {
      handleApproveEndpoint(pendingApprovalStatus);
    }
  };

  const handleCancelCriticalApproval = () => {
    setCriticalConfirmOpen(false);
    setCriticalConfirmKeyword('');
    setPendingApprovalStatus(null);
  };

  const handleSelectEndpoint = (endpoint: DiscoveryEndpoint) => {
    setSelectedEndpoint(endpoint);
    setApprovalNotes('');
    setTestResult(null);
    setTestPathParams({});
  };

  const handleTestEndpoint = async () => {
    if (!selectedEndpoint) return;

    setTestLoading(true);
    setTestResult(null);

    try {
      const result = await discoveryService.testEndpoint(selectedEndpoint.id, {
        path_params: testPathParams,
      });
      setTestResult(result);
      
      toast({
        title: result.success ? t('discovery.toasts.testSuccess') : t('discovery.toasts.testFailed'),
        description: result.success 
          ? `Status ${result.status_code} em ${result.latency_ms}ms`
          : result.error_message || `Status ${result.status_code}`,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error: any) {
      console.error("discovery.test_endpoint_error", { error: error instanceof Error ? error.message : String(error) });
      toast({
        variant: 'destructive',
        title: t('discovery.toasts.testError'),
        description: error.response?.data?.detail || 'Tente novamente em instantes.',
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Extrair path params do endpoint selecionado
  const extractPathParams = (path: string): string[] => {
    const matches = path.match(/\{(\w+)\}/g) || [];
    return matches.map((m) => m.replace(/[{}]/g, ''));
  };

  const handleCopy = async (value: string, description: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: description,
        description: 'Copiado para a área de transferência.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('discovery.toasts.copyFailed'),
        description: 'Copie manualmente caso necessário.',
      });
    }
  };

  const summaryCards = useMemo(
    () => [
      {
        id: 'total',
        labelKey: 'discovery.cards.total',
        value: summary.total,
        icon: Activity,
        accent: 'text-[#EC4899]',
        statusKey: null,
      },
      {
        id: 'pending',
        labelKey: 'discovery.cards.pending',
        value: summary.pending,
        icon: Timer,
        accent: 'text-yellow-300',
        statusKey: 'pending',
      },
      {
        id: 'approved',
        labelKey: 'discovery.cards.approved',
        value: summary.approved,
        icon: Check,
        accent: 'text-emerald-300',
        statusKey: 'approved',
      },
      {
        id: 'blocked',
        labelKey: 'discovery.cards.blocked',
        value: summary.blocked,
        icon: X,
        accent: 'text-red-300',
        statusKey: 'blocked',
      },
    ],
    [summary, t],
  );

  return (
    <Layout>
      <div className="space-y-8">
        <header className="rounded-3xl border border-white/10 bg-white/[0.05] px-8 py-6 backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('discovery.integrationCenter')}</p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">{t('discovery.title')}</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-400">
                {t('discovery.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2 rounded-2xl border-white/10 bg-white/[0.08] text-sm text-gray-200 hover:bg-white/[0.12]"
              >
                {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                {t('discovery.buttons.refreshCatalog')}
              </Button>
              <Button
                type="button"
                ref={newCredentialBtnRef}
                onClick={() => setVaultDialogOpen(true)}
                onMouseEnter={(event) => createRipple(event, newCredentialBtnRef)}
                className="relative overflow-hidden gap-2 rounded-2xl bg-[#EC4899] text-sm text-white shadow-[0_10px_40px_-20px_rgba(236,72,153,0.8)] transition-all hover:bg-[#EC4899]/90"
              >
                <Key className="h-4 w-4" />
                {t('discovery.buttons.newCredential')}
              </Button>
              <Button
                type="button"
                ref={newSourceBtnRef}
                onClick={() => setCreateSourceOpen(true)}
                onMouseEnter={(event) => createRipple(event, newSourceBtnRef)}
                className="relative overflow-hidden gap-2 rounded-2xl bg-[#EC4899] text-white shadow-[0_10px_40px_-20px_rgba(236,72,153,0.8)] transition-all hover:bg-[#EC4899]/90"
              >
                <Plus className="h-4 w-4" />
                {t('discovery.buttons.newSource')}
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Card
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => handleToggleStatusFilter(card.statusKey)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleToggleStatusFilter(card.statusKey);
                }
              }}
              className={`glass-card rounded-3xl border px-6 py-5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/40 ${
                card.statusKey
                  ? statusFilter === card.statusKey
                    ? 'border-[#EC4899]/60 bg-[#EC4899]/5 cursor-pointer'
                    : 'border-white/10 bg-white/[0.04] hover:border-[#EC4899]/40 hover:bg-[#EC4899]/5 cursor-pointer'
                  : statusFilter === null
                    ? 'border-[#EC4899]/60 bg-[#EC4899]/5 cursor-pointer'
                    : 'border-white/10 bg-white/[0.04] hover:border-[#EC4899]/40 hover:bg-[#EC4899]/5 cursor-pointer'
              }`}
            >
              <CardContent className="flex items-center justify-between p-0">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{t(card.labelKey)}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
                </div>
                <card.icon className={`h-6 w-6 transition-colors ${card.accent}`} />
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-6">
          <Card className="glass-card rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-6">
            <CardContent className="space-y-5 p-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Fontes cadastradas</h2>
                  <p className="text-xs text-gray-400">
                    Cada fonte representa um sistema externo exposto ao gateway da Arisara (backend Nyoka).
                  </p>
                </div>
                <Badge variant="outline" className="border-white/10 bg-white/[0.06] text-[11px] text-gray-300">
                  {sources.length} fontes
                </Badge>
              </div>

              {isLoading && sources.length === 0 ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#EC4899]" />
                </div>
              ) : sources.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-gray-400">
                  Nenhuma fonte cadastrada ainda. Crie uma fonte para começar o discovery automático.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {sources.map((source) => {
                    const isActive = selectedSourceId === source.id;
                    const statusBadge = source.status.toLowerCase();
                    const sourceAuthConfig = (source.auth_config || {}) as {
                      secret_ref?: string;
                      provider?: string;
                    };
                    const secretRef =
                      typeof sourceAuthConfig?.secret_ref === 'string' ? sourceAuthConfig.secret_ref : undefined;
                    return (
                      <div
                        key={source.id}
                        className={`rounded-2xl border px-4 py-4 text-sm transition ${
                          isActive
                            ? 'border-[#EC4899]/70 bg-[#EC4899]/10'
                            : 'border-white/10 bg-black/30 hover:border-white/20'
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-white">{source.name}</h3>
                          <Badge
                            variant="outline"
                            className="border-white/10 bg-white/[0.08] text-[11px] uppercase tracking-[0.2em] text-gray-300"
                          >
                            {statusBadge === 'disabled' ? t('discovery.statusBadge.disabled') : t('discovery.statusBadge.active')}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-xs text-gray-300">
                          <div className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5 text-[#EC4899]" />
                            <span className="truncate font-mono text-xs text-white">{source.base_url}</span>
                          </div>
                          {source.auth_type !== 'none' ? (
                            <p className="flex items-center gap-2 text-[11px] text-emerald-300">
                              <Key className="h-3.5 w-3.5" />
                              {secretRef ? `Vault · ${secretRef}` : `Autenticação ${source.auth_type}`}
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-500">Autenticação: pública</p>
                          )}
                          {source.last_discovered_at && (
                            <p className="text-[11px] text-gray-500">
                              Último scan: {new Date(source.last_discovered_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={isActive ? 'default' : 'outline'}
                            onClick={() => setSelectedSourceId(isActive ? null : source.id)}
                            className={`gap-2 rounded-xl ${
                              isActive ? 'bg-[#EC4899] hover:bg-[#EC4899]/90' : 'border-white/10 bg-white/[0.05]'
                            }`}
                          >
                            <Filter className="h-4 w-4" />
                            {isActive ? t('discovery.buttons.filterActive') : t('discovery.buttons.filterEndpoints')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2 rounded-xl border-white/10 bg-white/[0.05] text-gray-200 hover:bg-white/[0.12]"
                            onClick={() => handleOpenImportDialog(source.id)}
                          >
                            <UploadCloud className="h-4 w-4" />
                            {t('discovery.buttons.importOpenApi')}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="gap-2 rounded-xl text-xs text-gray-300 hover:bg-white/[0.08]"
                            onClick={() => handleCopy(source.base_url, t('discovery.toasts.baseUrlCopied'))}
                          >
                            {t('discovery.buttons.copyUrl')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-6">
            <CardContent className="space-y-4 p-0">
              {/* Título e descrição */}
              <div>
                <h2 className="text-lg font-semibold text-white">{t('discovery.catalog.title')}</h2>
                <p className="text-xs text-gray-400">
                  {selectedSourceId
                    ? t('discovery.catalog.filterBySource')
                    : t('discovery.catalog.selectSource')}
                </p>
              </div>

              {/* Controles: pesquisa e toggle */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    value={endpointSearch}
                    onChange={(event) => setEndpointSearch(event.target.value)}
                    placeholder={t('discovery.searchPlaceholder')}
                    className="rounded-xl border-white/10 bg-black/40 pl-9 pr-10 text-sm text-white placeholder:text-gray-500"
                  />
                  {endpointSearch && (
                    <button
                      type="button"
                      onClick={() => setEndpointSearch('')}
                      className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/10 hover:text-gray-100"
                      aria-label={t('discovery.clearSearch')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Toggle para endpoints críticos */}
                <div className="flex items-center gap-2">
                  <ArisaraSwitch
                    checked={showCriticalEndpoints}
                    onCheckedChange={setShowCriticalEndpoints}
                  />
                  <div className="flex items-center gap-1.5">
                    {showCriticalEndpoints ? (
                      <Eye className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-gray-500" />
                    )}
                    <span className={`text-xs ${showCriticalEndpoints ? 'text-amber-300' : 'text-gray-400'}`}>
                      {t('discovery.critical')}
                    </span>
                    {criticalCount > 0 && (
                      <Badge
                        variant="outline"
                        className={`ml-1 px-1.5 py-0 text-[10px] ${
                          showCriticalEndpoints
                            ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                            : 'border-white/10 bg-white/[0.06] text-gray-400'
                        }`}
                      >
                        {criticalCount}
                      </Badge>
                    )}
                  </div>
                </div>

                {selectedSourceId && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-2 rounded-xl text-xs text-gray-300 hover:bg-white/[0.08]"
                    onClick={() => setSelectedSourceId(null)}
                  >
                    <Filter className="h-4 w-4" />
                    {t('discovery.buttons.clearFilter')}
                  </Button>
                )}
              </div>

              {isLoading && endpoints.length === 0 ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#EC4899]" />
                </div>
              ) : filteredEndpoints.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-gray-400">
                  {t('discovery.empty.noEndpoints')}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10">
                  <div className="max-h-[520px] overflow-y-auto rounded-2xl">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-[#0b0b12] text-xs uppercase tracking-[0.15em] text-gray-400 shadow-[0_2px_0_0_rgba(255,255,255,0.04)]">
                        <TableRow>
                          <TableHead className="w-[40%] bg-[#0b0b12]">{t('discovery.table.endpoint')}</TableHead>
                          <TableHead className="w-[20%] bg-[#0b0b12]">{t('discovery.table.source')}</TableHead>
                          <TableHead className="w-[15%] bg-[#0b0b12]">{t('discovery.table.status')}</TableHead>
                          <TableHead className="w-[15%] bg-[#0b0b12]">{t('discovery.table.origin')}</TableHead>
                          <TableHead className="bg-[#0b0b12] text-right">{t('discovery.table.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEndpoints.map((endpoint) => {
                          const isActive = selectedEndpoint?.id === endpoint.id;
                          const statusKey = endpoint.status?.toLowerCase?.() || 'pending';
                          const statusClass = STATUS_BADGE_CLASSES[statusKey] || STATUS_BADGE_CLASSES.pending;
                          const source = sourcesById[endpoint.source_id];

                          return (
                            <TableRow
                              key={endpoint.id}
                              className={`border-white/5 text-sm transition ${
                                isActive ? 'bg-white/10' : 'hover:bg-white/5'
                              }`}
                            >
                              <TableCell className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={`font-mono text-[11px] uppercase tracking-[0.2em] ${
                                      CRITICAL_METHODS.includes(endpoint.method.toUpperCase())
                                        ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                                        : 'border-white/10 bg-white/[0.08] text-gray-200'
                                    }`}
                                  >
                                    {endpoint.method}
                                  </Badge>
                                  {CRITICAL_METHODS.includes(endpoint.method.toUpperCase()) && (
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" title={t('discovery.criticalEndpointTooltip')} />
                                  )}
                                </div>
                                <code className="font-mono text-xs text-white">{endpoint.path}</code>
                              </TableCell>
                              <TableCell className="text-xs text-gray-300">
                                {source ? source.name : '—'}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[11px] uppercase tracking-[0.2em] ${statusClass}`}
                                >
                                  {t(`discovery.status.${statusKey}`)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="border-white/10 bg-white/[0.06] text-[11px] uppercase tracking-[0.2em] text-gray-200"
                                >
                                  {t(`discovery.origin.${endpoint.origin}`) || endpoint.origin}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-xl border-white/10 bg-white/[0.05] text-xs text-gray-200 hover:bg-white/[0.12]"
                                  onClick={() => handleSelectEndpoint(endpoint)}
                                >
                                  {isActive ? t('discovery.buttons.selected') : t('discovery.buttons.details')}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-6">
            <CardContent className="space-y-5 p-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">{t('discovery.details.title')}</h2>
                {selectedEndpoint && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs text-gray-400 hover:text-gray-200"
                    onClick={() => setSelectedEndpoint(null)}
                  >
                    {t('discovery.details.clearSelection')}
                  </Button>
                )}
              </div>

              {!selectedEndpoint ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-gray-400">
                  {t('discovery.empty.selectEndpoint')}
                </div>
              ) : (
                (() => {
                  const endpointStatusKey = selectedEndpoint.status?.toLowerCase?.() || 'pending';
                  const endpointStatusClass = STATUS_BADGE_CLASSES[endpointStatusKey] || STATUS_BADGE_CLASSES.pending;

                  return (
                <div className="space-y-4 text-sm text-gray-300">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      variant="outline"
                      className="border-white/10 bg-white/[0.08] font-mono text-[11px] uppercase tracking-[0.2em] text-gray-200"
                    >
                      {selectedEndpoint.method}
                    </Badge>
                    <code className="font-mono text-xs text-white">{selectedEndpoint.path}</code>
                    <Badge
                      variant="outline"
                      className={`border-white/10 bg-white/[0.06] text-[11px] uppercase tracking-[0.2em] ${endpointStatusClass}`}
                    >
                      {t(`discovery.status.${endpointStatusKey}`)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-white/10 bg-white/[0.04] text-[11px] uppercase tracking-[0.2em] text-gray-300"
                    >
                      v{selectedEndpoint.version}
                    </Badge>
                  </div>

                  {selectedEndpoint.description && (
                    <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-gray-300">
                      {selectedEndpoint.description}
                    </p>
                  )}

                  {currentSource && (
                    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-gray-300">
                      <p>
                        <span className="text-gray-500">{t('discovery.details.source')}:</span> {currentSource.name}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-gray-500">{t('discovery.details.baseUrl')}:</span>
                        <span className="font-mono text-white">{currentSource.base_url}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-xs text-gray-400 hover:text-gray-100"
                          onClick={() => handleCopy(currentSource.base_url, t('discovery.toasts.baseUrlCopied'))}
                        >
                          {t('discovery.details.copy')}
                        </Button>
                      </p>
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">{t('discovery.details.origin')}</p>
                      <p className="mt-2 text-sm text-gray-200">
                        {t(`discovery.origin.${selectedEndpoint.origin}`) || selectedEndpoint.origin}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">{t('discovery.details.lastHealthCheck')}</p>
                      <p className="mt-2 text-sm text-gray-200">
                        {selectedEndpoint.last_health_checked_at
                          ? new Date(selectedEndpoint.last_health_checked_at).toLocaleString()
                          : t('discovery.details.neverRun')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.details.queryParams')}</p>
                      <pre className="max-h-48 overflow-auto rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-gray-300">
                        {JSON.stringify(selectedEndpoint.query_schema ?? {}, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.details.request')}</p>
                      <pre className="max-h-48 overflow-auto rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-gray-300">
                        {JSON.stringify(selectedEndpoint.request_schema ?? {}, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.details.response')}</p>
                      <pre className="max-h-48 overflow-auto rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-gray-300">
                        {JSON.stringify(selectedEndpoint.response_schema ?? {}, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Seção de Teste do Endpoint */}
                  <div className="space-y-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">🧪 Testar Endpoint</p>
                      <Button
                        type="button"
                        disabled={testLoading}
                        className="gap-2 rounded-xl bg-cyan-500/90 text-white hover:bg-cyan-500"
                        onClick={handleTestEndpoint}
                      >
                        {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                        {testLoading ? t('discovery.test.running') : t('discovery.test.run')}
                      </Button>
                    </div>

                    {/* Path params se existirem */}
                    {extractPathParams(selectedEndpoint.path).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400">Parâmetros de path:</p>
                        <div className="grid gap-2">
                          {extractPathParams(selectedEndpoint.path).map((param) => (
                            <div key={param} className="flex items-center gap-2">
                              <code className="min-w-[100px] text-xs text-cyan-300">{`{${param}}`}</code>
                              <Input
                                value={testPathParams[param] || ''}
                                onChange={(e) =>
                                  setTestPathParams((prev) => ({ ...prev, [param]: e.target.value }))
                                }
                                placeholder={`Valor para ${param}`}
                                className="flex-1 border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resultado do teste */}
                    {testResult && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={`${
                              testResult.success
                                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                                : 'border-red-400/40 bg-red-400/10 text-red-300'
                            }`}
                          >
                            {testResult.success ? '✓ Sucesso' : '✗ Falhou'}
                          </Badge>
                          {testResult.status_code && (
                            <Badge variant="outline" className="border-white/10 bg-white/[0.06] text-gray-200">
                              Status {testResult.status_code}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-400">
                            ⏱️ {testResult.latency_ms}ms
                          </span>
                        </div>

                        {testResult.error_message && (
                          <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2">
                            <p className="text-xs text-red-300">{testResult.error_message}</p>
                          </div>
                        )}

                        <div>
                          <p className="mb-1 text-xs text-gray-500">URL requisitada:</p>
                          <code className="block rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white break-all">
                            {testResult.request_method} {testResult.request_url}
                          </code>
                        </div>

                        {testResult.response_body && (
                          <div>
                            <p className="mb-1 text-xs text-gray-500">Resposta:</p>
                            <pre className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-gray-300">
                              {typeof testResult.response_body === 'string'
                                ? testResult.response_body
                                : JSON.stringify(testResult.response_body, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Textarea
                      placeholder="Observações sobre esta aprovação (opcional)"
                      className="min-h-[120px] border-white/10 bg-black/30 text-sm text-gray-100"
                      value={approvalNotes}
                      onChange={(event) => setApprovalNotes(event.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={approvalLoading}
                        className="gap-2 rounded-xl bg-[#22c55e]/90 text-white hover:bg-[#22c55e]"
                        onClick={() => handleApproveEndpoint('approved')}
                      >
                        {approvalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Aprovar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={approvalLoading}
                        className="gap-2 rounded-xl border-white/10 bg-white/[0.05] text-red-200 hover:bg-white/[0.12]"
                        onClick={() => handleApproveEndpoint('blocked')}
                      >
                        {approvalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        Bloquear
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={approvalLoading}
                        className="gap-2 rounded-xl border-white/10 bg-white/[0.05] text-gray-200 hover:bg-white/[0.12]"
                        onClick={() => handleApproveEndpoint('deprecated')}
                      >
                        Depreciar
                      </Button>
                    </div>
                  </div>
                </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog
        open={createSourceOpen}
        onOpenChange={(open) => {
          setCreateSourceOpen(open);
          if (!open) {
            resetCreateForm();
            setCreateSourceLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-lg border-white/10 bg-black/90 text-white">
          <DialogHeader>
            <DialogTitle>{t('discovery.createSource.title')}</DialogTitle>
            <p className="text-sm text-gray-400">
              {t('discovery.createSource.description')}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.createSource.name')}</label>
              <Input
                value={createSourceForm.name}
                onChange={(event) => setCreateSourceForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={t('discovery.createSource.namePlaceholder')}
                className="border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.createSource.baseUrl')}</label>
              <Input
                value={createSourceForm.baseUrl}
                onChange={(event) => setCreateSourceForm((prev) => ({ ...prev, baseUrl: event.target.value }))}
                placeholder={t('discovery.createSource.baseUrlPlaceholder')}
                className="border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.createSource.descriptionOptional')}</label>
              <Textarea
                value={createSourceForm.description}
                onChange={(event) => setCreateSourceForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder={t('discovery.createSource.descriptionPlaceholder')}
                className="border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.createSource.auth')}</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {t('discovery.createSource.authHelp')}
                </p>
                <ArisaraSwitch
                  checked={createSourceUseVault}
                  onCheckedChange={(checked) => {
                    setCreateSourceUseVault(checked);
                    if (checked) {
                      setCreateSourceAuthType((prev) => (prev === 'none' ? 'bearer' : prev));
                    } else {
                      setCreateSourceAuthType('none');
                      setCreateSourceSecretRef('');
                      setCreateSourceProvider('');
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.createSource.authType')}</label>
                <select
                  value={createSourceAuthType}
                  disabled={!createSourceUseVault}
                  onChange={(event) => setCreateSourceAuthType(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 pr-10 py-2 text-sm text-white disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat"
                >
                  <option value="none">{t('discovery.createSource.none')}</option>
                  <option value="bearer">{t('discovery.createSource.bearer')}</option>
                  <option value="api_key">{t('discovery.createSource.apiKey')}</option>
                  <option value="oauth2">{t('discovery.createSource.oauth2')}</option>
                  <option value="custom">{t('discovery.createSource.custom')}</option>
                </select>
              </div>

              {createSourceUseVault ? (
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.createSource.vaultCredential')}</label>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-fit gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-gray-200 hover:bg-white/[0.12]"
                    onClick={() => setVaultDialogOpen(true)}
                  >
                    <Key className="h-3.5 w-3.5" />
                    {t('discovery.buttons.newCredential')}
                  </Button>
                  {vaultSecrets.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 bg-black/30 px-3 py-3 text-xs text-gray-400">
                      {t('discovery.createSource.noCredential')}
                    </p>
                  ) : (
                    <select
                      value={createSourceSecretRef}
                      onChange={(event) => {
                        const value = event.target.value;
                        setCreateSourceSecretRef(value);
                        const selected = vaultSecrets.find((secret) => secret.reference === value);
                        if (selected) {
                          setCreateSourceProvider(selected.provider || '');
                        }
                      }}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 pr-10 py-2 text-sm text-white appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat"
                    >
                      <option value="">Selecione a credencial...</option>
                      {vaultSecrets.map((secret) => (
                        <option key={secret.id} value={secret.reference}>
                          {secret.reference} · {secret.provider}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Essa fonte será tratada como pública. Ative o Vault para que a Arisara autentique automaticamente.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
              onClick={() => setCreateSourceOpen(false)}
              disabled={createSourceLoading}
            >
              {t('discovery.buttons.cancel')}
            </Button>
            <Button
              type="button"
              className="gap-2 rounded-xl bg-[#EC4899] text-sm text-white hover:bg-[#EC4899]/90"
              onClick={handleCreateSource}
              disabled={createSourceLoading}
            >
              {createSourceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t('discovery.createSource.saveSource')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={vaultDialogOpen}
        onOpenChange={(open) => {
          setVaultDialogOpen(open);
          if (!open) {
            resetVaultForm();
            setVaultLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-xl border-white/10 bg-black/90 text-white">
          <DialogHeader>
            <DialogTitle>{t('discovery.vault.title')}</DialogTitle>
            <p className="text-sm text-gray-400">
              {t('discovery.vault.description')}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.vault.referenceLabel')}</label>
              <Input
                value={vaultForm.reference}
                onChange={(event) => setVaultForm((prev) => ({ ...prev, reference: event.target.value }))}
                placeholder={t('discovery.vault.referencePlaceholder')}
                className="border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.vault.providerLabel')}</label>
              <Input
                value={vaultForm.provider}
                onChange={(event) => setVaultForm((prev) => ({ ...prev, provider: event.target.value }))}
                placeholder={t('discovery.vault.providerPlaceholder')}
                className="border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.vault.descriptionLabel')}</label>
              <Textarea
                value={vaultForm.description}
                onChange={(event) => setVaultForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder={t('discovery.vault.descriptionPlaceholder')}
                className="border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.vault.secretPayloadLabel')}</label>
              <Textarea
                value={vaultForm.secretData}
                onChange={(event) => setVaultForm((prev) => ({ ...prev, secretData: event.target.value }))}
                placeholder={t('discovery.vault.secretPayloadPlaceholder')}
                className="min-h-[140px] border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500 font-mono"
              />
              <p className="text-[11px] text-gray-500">
                {t('discovery.vault.secretPayloadHelp')}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.vault.metadataLabel')}</label>
              <Textarea
                value={vaultForm.metadata}
                onChange={(event) => setVaultForm((prev) => ({ ...prev, metadata: event.target.value }))}
                placeholder={t('discovery.vault.metadataPlaceholder')}
                className="min-h-[80px] border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500 font-mono"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
              onClick={() => setVaultDialogOpen(false)}
              disabled={vaultLoading}
            >
              {t('discovery.buttons.cancel')}
            </Button>
            <Button
              type="button"
              className="gap-2 rounded-xl bg-[#EC4899] text-sm text-white hover:bg-[#EC4899]/90"
              onClick={handleVaultSubmit}
              disabled={vaultLoading}
            >
              {vaultLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t('discovery.vault.saveCredential')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) {
            setImportSourceId(null);
            setImportUrl('');
            setImportLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-lg border-white/10 bg-black/90 text-white">
          <DialogHeader>
            <DialogTitle>{t('discovery.importDialog.title')}</DialogTitle>
            <p className="text-sm text-gray-400">
              {t('discovery.importDialog.description')}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-gray-300">
              <p className="text-gray-500">{t('discovery.importDialog.selectedSource')}</p>
              <p className="mt-1 text-sm text-white">
                {importSourceId ? sourcesById[importSourceId]?.name || importSourceId : t('discovery.importDialog.noSourceSelected')}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500">{t('discovery.importDialog.documentUrl')}</label>
              <Input
                value={importUrl}
                onChange={(event) => setImportUrl(event.target.value)}
                placeholder={t('discovery.importDialog.documentUrlPlaceholder')}
                className="border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
              onClick={() => setImportDialogOpen(false)}
              disabled={importLoading}
            >
              {t('discovery.buttons.cancel')}
            </Button>
            <Button
              type="button"
              ref={importButtonRef}
              className="relative overflow-hidden gap-2 rounded-xl bg-[#EC4899] text-sm text-white hover:bg-[#EC4899]/90"
              onClick={handleImportOpenApi}
              onMouseEnter={(event) => createRipple(event, importButtonRef)}
              disabled={importLoading}
            >
              {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {t('discovery.buttons.import')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação para aprovação de endpoints críticos */}
      <Dialog
        open={criticalConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelCriticalApproval();
          }
        }}
      >
        <DialogContent className="max-w-lg border-white/10 bg-black/90 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              {t('discovery.criticalApproval.title')}
            </DialogTitle>
            <p className="text-sm text-gray-400">
              {t('discovery.criticalApproval.description')}
            </p>
          </DialogHeader>

          {selectedEndpoint && (
            <div className="space-y-4">
              {/* Informações do endpoint */}
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-amber-400/40 bg-amber-400/10 font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300"
                  >
                    {selectedEndpoint.method}
                  </Badge>
                  <code className="font-mono text-xs text-white">{selectedEndpoint.path}</code>
                </div>
                <p className="text-xs text-gray-400">
                  {selectedEndpoint.description || t('discovery.criticalApproval.noDescription')}
                </p>
              </div>

              {/* Alerta */}
              <div className="rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-3">
                <p className="text-xs text-red-300">
                  <strong>⚠️ {t('discovery.criticalApproval.attentionLabel')}:</strong> {t('discovery.criticalApproval.attention')}
                </p>
              </div>

              {/* Campo de confirmação */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {t('discovery.criticalApproval.typeToConfirm')}
                </label>
                <Input
                  value={criticalConfirmKeyword}
                  onChange={(event) => setCriticalConfirmKeyword(event.target.value.toUpperCase())}
                  placeholder={CONFIRM_KEYWORD}
                  className="border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500 font-mono tracking-widest text-center"
                  autoFocus
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
              onClick={handleCancelCriticalApproval}
              disabled={approvalLoading}
            >
              {t('discovery.buttons.cancel')}
            </Button>
            <Button
              type="button"
              className="gap-2 rounded-xl bg-amber-500 text-sm text-black font-semibold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleConfirmCriticalApproval}
              disabled={approvalLoading || criticalConfirmKeyword !== CONFIRM_KEYWORD}
            >
              {approvalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {t('discovery.buttons.confirmApproval')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
