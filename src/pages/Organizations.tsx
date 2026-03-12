import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Building2, ShieldCheck, Globe2, ArrowRight, Info } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const formatRoleLabel = (role?: string | null, roleDisplay?: string | null) => {
  if (roleDisplay) return roleDisplay;
  if (!role) return 'Acesso';
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function Organizations() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const {
    availableCompanies,
    currentCompany,
    setCurrentCompany,
    refreshCompanies,
    isLoading,
  } = useCompany();

  useEffect(() => {
    if (isAuthenticated) {
      refreshCompanies().catch((error) => {
        console.error("organizations.refresh_error", { error: error instanceof Error ? error.message : String(error) });
        toast({
          title: 'Não foi possível carregar as empresas',
          description: 'Verifique sua conexão e tente novamente.',
          variant: 'destructive',
        });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const sortedCompanies = useMemo(() => {
    return [...availableCompanies].sort((a, b) => a.name.localeCompare(b.name));
  }, [availableCompanies]);

  const handleSelectCompany = (companyId: string | null) => {
    if (!companyId) {
      setCurrentCompany(null);
      toast({
        title: 'Modo global ativo',
        description: 'Você está operando como superadmin global.',
      });
      navigate('/dashboard', { replace: true });
      return;
    }

    const company = availableCompanies.find((item) => item.id === companyId);
    if (!company) {
      toast({
        title: 'Empresa não encontrada',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
      return;
    }

    setCurrentCompany(company);
    toast({
      title: `Empresa ${company.name} selecionada`,
      description: 'Contexto atualizado com sucesso.',
    });
    navigate('/dashboard', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <Loader2 className="h-10 w-10 animate-spin text-[#EC4899]" />
        <p className="mt-4 text-sm text-white/70">Carregando empresas vinculadas...</p>
      </div>
    );
  }

  const isSuperadmin = Boolean(user?.is_superadmin);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-black via-[#0a0a0f] to-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#EC4899]/30 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-72 w-72 -translate-y-1/2 rounded-full bg-[#38bdf8]/20 blur-3xl" />
      </div>

      <header className="relative mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 pt-16 pb-10 sm:px-12">
        <div className="inline-flex items-center gap-2 text-sm text-white/60">
          <ShieldCheck className="h-4 w-4 text-[#EC4899]" />
          <span>Console Administrativo Arisara</span>
        </div>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Escolha o espaço de atuação
        </h1>
        <p className="max-w-3xl text-base text-white/70">
          {isSuperadmin
            ? 'Como superadmin, você pode operar globalmente ou entrar em qualquer tenant para gerenciar usuários, integrações e configurações.'
            : 'Selecione a empresa com a qual deseja trabalhar para acessar os painéis e recursos disponíveis.'}
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
                  <h2 className="text-xl font-semibold">Modo Global</h2>
                  <p className="text-sm text-white/70">
                    Atue como superadmin da plataforma inteira. Ideal para auditorias, suporte avançado e configurações que impactam todos os clientes.
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:border-white/40"
                onClick={() => handleSelectCompany(null)}
              >
                Entrar em modo global
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>
        )}

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Empresas disponíveis</h2>
              <p className="text-sm text-white/60">
                {sortedCompanies.length === 0
                  ? 'Nenhum espaço disponível para este usuário.'
                  : 'Selecione uma empresa para entrar no console administrativo.'}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-white/70 hover:text-white"
              onClick={() => refreshCompanies()}
            >
              Recarregar lista
            </Button>
          </div>

          {sortedCompanies.length === 0 ? (
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-10 text-center text-sm text-white/60">
              <Info className="mx-auto mb-3 h-5 w-5 text-white/50" />
              Este usuário ainda não possui acesso a nenhuma empresa. Entre em contato com um administrador da Arisara.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {sortedCompanies.map((company) => {
                const isActive = currentCompany?.id === company.id;
                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => handleSelectCompany(company.id)}
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
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-lg font-semibold text-white">{company.name}</span>
                        <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                          {company.domain ?? 'domínio não informado'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Badge
                        variant="outline"
                        className="border-[#EC4899]/40 bg-[#EC4899]/10 text-xs text-[#EC4899]"
                      >
                        {formatRoleLabel(company.role, company.role_display)}
                      </Badge>
                      <Badge variant="outline" className="border-white/15 bg-white/5 text-xs text-white/70">
                        Plano {company.plan}
                      </Badge>
                      {!company.is_active && (
                        <Badge variant="destructive" className="text-xs">
                          Inativa
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-white/10 bg-white/5 text-xs text-white/60">
                        {company.role_scope === 'global' ? 'Acesso global' : 'Tenant'}
                      </Badge>
                    </div>

                    {company.assigned_roles.length > 0 && (
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/60">
                        {company.assigned_roles.map((role) => (
                          <span
                            key={role}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-8 flex items-center gap-2 text-sm text-[#EC4899] transition group-hover:text-[#f472b6]">
                      Acessar workspace
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
