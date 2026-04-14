import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import SettingsModal from '../components/SettingsModal';
import FeedbackModal from '../components/FeedbackModal';
import PeriodFilter from '../components/PeriodFilter';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { Star, Building2, MessageSquare, Users, TrendingUp, Zap, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePeriod } from '../contexts/PeriodContext';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { period, setPeriod, getDays, getHours, getStartDate, getEndDate } = usePeriod();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const detailsButtonRef = useRef<HTMLButtonElement>(null);
  const detailsNavigateTimeout = useRef<number | null>(null);

  const createRipple = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const button = detailsButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.className = 'ripple-effect';

    button.appendChild(ripple);

    window.setTimeout(() => {
      ripple.remove();
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (detailsNavigateTimeout.current) {
        window.clearTimeout(detailsNavigateTimeout.current);
      }
    };
  }, []);
  
  // AI Maturity widget state
  const [maturityData, setMaturityData] = useState({
    overall: 0,
    precision: 0,
    confidence: 0,
    adaptation: 0,
    weeklyGrowth: 0
  });
  
  const [animatedOverall, setAnimatedOverall] = useState(0);

  // Animar círculo de maturidade
  useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();
    const startValue = 0;
    const endValue = maturityData.overall;
    
    const animateCircle = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOut;
      
      setAnimatedOverall(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animateCircle);
      }
    };
    
    if (maturityData.overall > 0) {
      requestAnimationFrame(animateCircle);
    }
  }, [maturityData.overall]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Buscar dados de maturidade e estatísticas do dashboard
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Buscar dados do usuário via /auth/me
        const headers = getAuthHeaders();
        const meRes = await fetch(API_ENDPOINTS.auth.me, { headers });
        
        if (!meRes.ok) return;
        
        const userData = await meRes.json();
        const companyId = userData.company_id;
        
        if (!companyId) return;

        const days = getDays();
        
        // 1. Buscar estatísticas do dashboard
        const statsUrl = API_ENDPOINTS.dashboard.stats(companyId, days);
        console.debug("dashboard.stats_request", { companyId, days });
        
        const statsRes = await fetch(statsUrl, { headers });

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          console.debug("dashboard.stats_received", { hasConversations: !!statsData?.conversations });
          
          setStats([
            {
              titleKey: 'dashboard.stats.conversations',
              value: statsData.conversations?.total?.toString() || '0',
              icon: MessageSquare,
              trend: { 
                value: `${statsData.conversations?.change >= 0 ? '+' : ''}${statsData.conversations?.change?.toFixed(1) || 0}%`, 
                isPositive: statsData.conversations?.is_positive ?? true 
              },
            },
            {
              titleKey: 'dashboard.stats.documents',
              value: statsData.documents?.total?.toString() || '0',
              icon: Users,
              trend: { 
                value: `${statsData.documents?.change >= 0 ? '+' : ''}${statsData.documents?.change || 0}`, 
                isPositive: statsData.documents?.is_positive ?? true 
              },
            },
            {
              titleKey: 'dashboard.stats.successRate',
              value: `${statsData.success_rate?.value?.toFixed(1) || 0}%`,
              icon: TrendingUp,
              trend: { 
                value: `${statsData.success_rate?.change >= 0 ? '+' : ''}${statsData.success_rate?.change?.toFixed(1) || 0}%`, 
                isPositive: statsData.success_rate?.is_positive ?? true 
              },
            },
            {
              titleKey: 'dashboard.stats.avgTime',
              value: `${statsData.avg_time?.value?.toFixed(1) || 0}s`,
              icon: Zap,
              trend: { 
                value: `${statsData.avg_time?.change >= 0 ? '+' : ''}${statsData.avg_time?.change?.toFixed(1) || 0}s`, 
                isPositive: statsData.avg_time?.is_positive ?? false
              },
            },
          ]);
        } else {
          const errorText = await statsRes.text();
          console.error("dashboard.stats_error", { status: statsRes.status, statusText: statsRes.statusText, detail: errorText?.slice(0, 200) });
        }

        // 2. Buscar heatmap de maturidade
        const maturityRes = await fetch(
          API_ENDPOINTS.aiMaturity.heatmap(companyId, days),
          { headers }
        );

        if (maturityRes.ok) {
          const data = await maturityRes.json();
          
          const dimensionsMap: any = {};
          data.dimensions?.forEach((dim: any) => {
            dimensionsMap[dim.name] = dim;
          });

          // Usar valores reais sem fallback
          setMaturityData({
            overall: data.overall || 0,
            precision: dimensionsMap['Precisão']?.score || 0,
            confidence: dimensionsMap['Confiança']?.score || 0,
            adaptation: dimensionsMap['Adaptação']?.score || 0,
            weeklyGrowth: 0 // Calcular depois quando houver dados
          });
        }
        } catch (err) {
        console.error("dashboard.fetch_error", { error: err instanceof Error ? err.message : String(err) });
        // Mantém valores padrão (0)
      }
    };

    if (user?.company_id) {
      fetchDashboardData();
    }
  }, [user, period, getDays]);

  const username = useMemo(() => user?.username ?? 'Admin', [user]);
  const userEmail = useMemo(() => user?.email ?? '', [user]);

  const [stats, setStats] = useState<Array<{ titleKey: string; value: string; icon: any; trend: { value: string; isPositive: boolean } }>>([
    { titleKey: 'dashboard.stats.conversations', value: '0', icon: MessageSquare, trend: { value: '0%', isPositive: true } },
    { titleKey: 'dashboard.stats.documents', value: '0', icon: Users, trend: { value: '0', isPositive: true } },
    { titleKey: 'dashboard.stats.successRate', value: '0%', icon: TrendingUp, trend: { value: '0%', isPositive: true } },
    { titleKey: 'dashboard.stats.avgTime', value: '0s', icon: Zap, trend: { value: '0s', isPositive: false } },
  ]);

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl space-y-10">
        <header className="relative z-10 rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-6 shadow-[0_24px_60px_-55px_rgba(0,0,0,0.55)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('dashboard.header.breadcrumb')}</p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">{t('dashboard.header.title')}</h1>
              <p className="mt-2 text-sm text-gray-400">{t('dashboard.header.subtitle')}</p>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-3">
              {/* Período Global */}
              <PeriodFilter value={period} onChange={setPeriod} className="self-start lg:self-center" />
              
              <div className="flex items-center gap-3 self-start lg:self-center">
                <div className="text-right">
                  <p className="text-sm font-medium text-white/90">{username}</p>
                  <p className="text-xs text-gray-500">{userEmail}</p>
                </div>
                <button
                  onClick={() => setIsFeedbackOpen(true)}
                  className="group relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-400 transition-all duration-200 hover:border-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 hover:shadow-lg hover:shadow-amber-500/20"
                  title={t('dashboard.actions.rateUs')}
                >
                  <Star className="h-5 w-5 transition-all duration-200 group-hover:scale-110 group-hover:rotate-12" />
                  {/* Efeito de brilho no hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400/0 via-amber-400/20 to-amber-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-sm" />
                </button>
                <button
                  onClick={() => navigate('/workspaces')}
                  disabled={!user?.is_superadmin}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-400 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 hover:border-[#EC4899]/60 hover:text-white disabled:hover:border-white/10 disabled:hover:text-gray-400"
                  title={user?.is_superadmin ? t('dashboard.actions.goToOrganizations') : t('dashboard.actions.organizationsTooltipDisabled')}
                >
                  <Building2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="space-y-10">
          <div className="space-y-2">
            <h2 className="text-4xl font-semibold text-white">{t('dashboard.panorama.title')}</h2>
            <p className="max-w-2xl text-sm text-gray-500">
              {t('dashboard.panorama.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.titleKey} title={t(stat.titleKey)} value={stat.value} icon={stat.icon} trend={stat.trend} />
            ))}
          </div>

          {/* Widget de Evolução IA */}
          <div className="rounded-3xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5 p-8 shadow-[0_24px_60px_-55px_rgba(0,0,0,0.55)] backdrop-blur">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-start gap-6">
                <div className="relative">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="url(#dashMaturityGradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(animatedOverall / 100) * 351.86} 351.86`}
                      style={{ transition: 'stroke-dasharray 0.3s ease-out' }}
                    />
                    <defs>
                      <linearGradient id="dashMaturityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-pearl-pink">{Math.round(animatedOverall)}%</span>
                    <span className="text-white/40 text-xs">{t('dashboard.maturity.label')}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
                    <h3 className="text-xl font-semibold text-white">{t('dashboard.maturity.title')}</h3>
                  </div>
                  <p className="text-white/60 leading-relaxed">
                    {maturityData.overall > 0 ? (
                      <>
                        {maturityData.weeklyGrowth > 0 ? (
                          t('dashboard.maturity.descriptionWithGrowth', { percent: maturityData.weeklyGrowth })
                        ) : (
                          t('dashboard.maturity.descriptionNoGrowth')
                        )}
                      </>
                    ) : (
                      t('dashboard.maturity.descriptionEmpty')
                    )}
                  </p>
                  <div className="space-y-3 pt-2">
                    {/* Precisão */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">{t('dashboard.maturity.precision')}</span>
                        <span className="text-sm text-white font-medium">{maturityData.precision}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 progress-bar-animate"
                          style={{ '--progress-width': `${maturityData.precision}%` } as React.CSSProperties}
                        />
                      </div>
                    </div>
                    
                    {/* Confiança */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">{t('dashboard.maturity.confidence')}</span>
                        <span className="text-sm text-white font-medium">{maturityData.confidence}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 progress-bar-animate"
                          style={{ '--progress-width': `${maturityData.confidence}%` } as React.CSSProperties}
                        />
                      </div>
                    </div>
                    
                    {/* Adaptação */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">{t('dashboard.maturity.adaptation')}</span>
                        <span className="text-sm text-white font-medium">{maturityData.adaptation}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 progress-bar-animate"
                          style={{ '--progress-width': `${maturityData.adaptation}%` } as React.CSSProperties}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                ref={detailsButtonRef}
                onClick={(event) => {
                  createRipple(event);
                  detailsNavigateTimeout.current = window.setTimeout(() => {
                    navigate('/ai-maturity');
                  }, 160);
                }}
                className="relative overflow-hidden flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium transition-all group focus:outline-none focus:ring-2 focus:ring-pink-400/60 focus:ring-offset-2 focus:ring-offset-black"
              >
                <span>{t('dashboard.maturity.details')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-6 shadow-[0_24px_60px_-55px_rgba(0,0,0,0.5)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">{t('dashboard.quickActions.title')}</h2>
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('dashboard.quickActions.console')}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { labelKey: 'dashboard.quickActions.uploadDocuments', path: '/documents' },
                { labelKey: 'dashboard.quickActions.configureAI', path: '/ai/prompt' },
                { labelKey: 'dashboard.quickActions.viewAnalytics', path: '/ai-maturity' }
              ].map((action) => (
                <button
                  key={action.labelKey}
                  onClick={() => navigate(action.path)}
                  className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-left text-sm font-medium text-white/70 transition-all duration-200 hover:border-[#EC4899]/60 hover:text-white hover:shadow-lg hover:shadow-black/30"
                >
                  {t(action.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
      </div>
    </Layout>
  );
}