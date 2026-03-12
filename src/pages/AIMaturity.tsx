import { useEffect, useState, useCallback } from 'react';
import type { ElementType } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../hooks/useRequireAuth';
import Layout from '../components/Layout';
import PeriodFilter from '../components/PeriodFilter';
import { usePeriod } from '../contexts/PeriodContext';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { 
  Brain,
  Target,
  Shield,
  Zap, 
  TrendingUp,
  Activity,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Info,
  RefreshCw,
  Lightbulb,
  Clock,
  TrendingDown,
  ArrowRight,
  Settings
} from 'lucide-react';

interface MaturityMetric {
  name: string;
  value: number;
  change: number;
  icon: ElementType;
  iconColor: string;
  color: string;
}

interface DomainArea {
  name: string;
  strength: number;
  status: 'excellent' | 'good' | 'learning';
  topics: number;
}

interface EvolutionPoint {
  date: string;
  maturity: number;
}

export function AIMaturity() {
  useRequireAuth();
  const { t } = useTranslation();
  const { period, setPeriod, getDays, getHours, getStartDate, getEndDate } = usePeriod();

  const [overallMaturity, setOverallMaturity] = useState(0);
  const [animatedMaturity, setAnimatedMaturity] = useState(0);
  const [weeklyGrowth, setWeeklyGrowth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dataWarning, setDataWarning] = useState<string | null>(null);
  const [adaptiveActions, setAdaptiveActions] = useState<any[]>([]);
  const [learnedPatterns, setLearnedPatterns] = useState<any>(null);
  const [loadingLearning, setLoadingLearning] = useState(false);

  // Animar círculo progressivamente
  useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();
    const startValue = 0;
    const endValue = overallMaturity;
    
    const animateCircle = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOut;
      
      setAnimatedMaturity(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animateCircle);
      }
    };
    
    if (overallMaturity > 0) {
      requestAnimationFrame(animateCircle);
    }
  }, [overallMaturity]);

  // Métricas principais
  const [metrics, setMetrics] = useState<MaturityMetric[]>([
    {
      name: 'Conhecimento',
      value: 0,
      change: 0,
      icon: Brain,
      iconColor: 'text-[#EC4899]',
      color: 'from-pink-500 to-rose-500'
    },
    {
      name: 'Precisão',
      value: 0,
      change: 0,
      icon: Target,
      iconColor: 'text-[#EC4899]',
      color: 'from-purple-500 to-pink-500'
    },
    {
      name: 'Confiança',
      value: 0,
      change: 0,
      icon: Shield,
      iconColor: 'text-[#EC4899]',
      color: 'from-blue-500 to-purple-500'
    },
    {
      name: 'Adaptação',
      value: 0,
      change: 0,
      icon: Zap,
      iconColor: 'text-[#EC4899]',
      color: 'from-amber-500 to-pink-500'
    }
  ]);

  // Áreas de domínio
  const [domains, setDomains] = useState<DomainArea[]>([]);

  // Evolução temporal (últimas 8 semanas)
  const [evolution, setEvolution] = useState<EvolutionPoint[]>([]);

  // Buscar dados da API
  const fetchMaturityData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Buscar dados do usuário via /auth/me
      const headers = getAuthHeaders();
      const meRes = await fetch(API_ENDPOINTS.auth.me, { headers });
      
      if (!meRes.ok) {
        throw new Error(t('aimaturity.errors.sessionExpired'));
      }
      
      const userData = await meRes.json();
      const companyId = userData.company_id;
      
      if (!companyId) {
        throw new Error(t('aimaturity.errors.noCompany'));
      }

        // 1. Buscar heatmap (dados principais) - com filtro de período
        const days = getDays();
        
        const heatmapRes = await fetch(
          API_ENDPOINTS.aiMaturity.heatmap(companyId, days),
          { headers }
        );
        
        if (!heatmapRes.ok) throw new Error(t('aimaturity.errors.heatmap'));
        const heatmap = await heatmapRes.json();

        // Verificar se há dados suficientes
        const hasData = heatmap.has_sufficient_data !== false; // Default true se não vier no response (backward compat)
        
        if (!hasData || heatmap.overall === 0) {
          setDataWarning(t('aimaturity.dataWarning'));
        } else if (!heatmap.overall && days < 7) {
          setDataWarning(t('aimaturity.insufficientData', { period: getHours() < 24 ? getHours() + ' horas' : days + ' dias' }));
        } else {
          setDataWarning(null);
        }

        // Atualizar overall maturity (só usar valor real, sem fallback)
        setOverallMaturity(heatmap.overall || 0);

        // Atualizar métricas
        const dimensionsMap: any = {};
        heatmap.dimensions?.forEach((dim: any) => {
          dimensionsMap[dim.name] = dim;
        });

        // Usar valores reais sem fallback para valores padrão
        const newMetrics: MaturityMetric[] = [
          {
            name: 'Conhecimento',
            value: dimensionsMap['Conhecimento']?.score || 0,
            change: dimensionsMap['Conhecimento']?.change || 0,
            icon: Brain,
            iconColor: 'text-[#EC4899]',
            color: 'from-pink-500 to-rose-500'
          },
          {
            name: 'Precisão',
            value: dimensionsMap['Precisão']?.score || 0,
            change: dimensionsMap['Precisão']?.change || 0,
            icon: Target,
            iconColor: 'text-[#EC4899]',
            color: 'from-purple-500 to-pink-500'
          },
          {
            name: 'Confiança',
            value: dimensionsMap['Confiança']?.score || 0,
            change: dimensionsMap['Confiança']?.change || 0,
            icon: Shield,
            iconColor: 'text-[#EC4899]',
            color: 'from-blue-500 to-purple-500'
          },
          {
            name: 'Adaptação',
            value: dimensionsMap['Adaptação']?.score || 0,
            change: dimensionsMap['Adaptação']?.change || 0,
            icon: Zap,
            iconColor: 'text-[#EC4899]',
            color: 'from-amber-500 to-pink-500'
          }
        ];
        
        setMetrics(newMetrics);

        // 2. Buscar domínios - com filtro de período
        const domainsRes = await fetch(
          API_ENDPOINTS.aiMaturity.domains(companyId, days),
          { headers }
        );
        
        if (domainsRes.ok) {
          const domainsData = await domainsRes.json();
          setDomains(domainsData || []);
        }

        // 3. Buscar evolução (ajustar quantidade baseado no período)
        // Para períodos curtos, buscar mais dias no backend para ter contexto
        const daysToFetch = days === 1 ? 7 : days <= 7 ? 30 : days <= 30 ? 60 : 90;
        const evolutionRes = await fetch(
          API_ENDPOINTS.aiMaturity.evolution(companyId, daysToFetch),
          { headers }
        );
        
        if (evolutionRes.ok) {
          const evolutionData = await evolutionRes.json();
          
          // Transformar dados para o formato do gráfico
          const now = Date.now();
          const startDate = getStartDate();
          const endDate = getEndDate();
          const cutoffDate = startDate.getTime();
          const endCutoffDate = endDate.getTime();
          
          // Filtrar e ordenar dados CRONOLOGICAMENTE (mais antigo primeiro)
          const rawPoints = evolutionData
            .map((snapshot: any) => {
              const date = new Date(snapshot.calculated_at);
              return {
                date: date,
                maturity: snapshot.overall_maturity,
                timestamp: date.getTime()
              };
            })
            .filter((point: any) => point.timestamp >= cutoffDate && point.timestamp <= endCutoffDate) // Filtrar pelo período
            .sort((a: any, b: any) => a.timestamp - b.timestamp); // Ordenar CRONOLOGICAMENTE (mais antigo → mais recente)
          
          // Reduzir pontos para suavizar (pegar amostras uniformes)
          const hours = getHours();
          const sampleSize = Math.min(rawPoints.length, 
            hours < 24 ? 15 :  // Períodos de horas: 15 pontos
            days <= 7 ? 20 :   // 7 dias: 20 pontos
            days <= 30 ? 30 :  // 30 dias: 30 pontos
            40                 // Mais de 30 dias: 40 pontos
          );
          const step = rawPoints.length > sampleSize ? Math.floor(rawPoints.length / sampleSize) : 1;
          const sampledPoints = rawPoints.filter((_: any, i: number) => i % step === 0 || i === rawPoints.length - 1);
          
          // Gerar labels para os pontos
          const points = sampledPoints.map((point: any) => {
            const diffMs = now - point.timestamp;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            let label = '';
            if (diffDays === 0) {
              if (diffHours === 0) {
                const minutes = Math.floor(diffMs / (1000 * 60));
                label = minutes < 1 ? 'Agora' : `${minutes}m atrás`;
              } else {
                label = `${diffHours}h atrás`;
              }
            } else if (diffDays === 1) {
              label = 'Ontem';
            } else if (diffDays < 7) {
              label = `${diffDays}d atrás`;
            } else if (diffDays < 30) {
              label = `${Math.floor(diffDays / 7)} sem atrás`;
            } else {
              label = `${Math.floor(diffDays / 30)} mês atrás`;
            }
            
            return {
              date: label,
              maturity: point.maturity,
              timestamp: point.timestamp
            };
          });
          
          // Só usar pontos reais, sem dados mock
          setEvolution(points.length > 0 ? points : []);
          
          // Calcular crescimento semanal
          if (points.length >= 2) {
            const latest = points[points.length - 1].maturity;
            const weekAgo = points[points.length - 2]?.maturity || latest;
            const growth = weekAgo > 0 ? ((latest - weekAgo) / weekAgo * 100) : 0;
            setWeeklyGrowth(Math.round(growth));
          }
        }

        // 4. Buscar ações adaptativas (como a Arisara está aprendendo)
        setLoadingLearning(true);
        try {
          const actionsRes = await fetch(
            API_ENDPOINTS.aiMaturity.adaptiveActions(companyId, 10),
            { headers }
          );
          
          if (actionsRes.ok) {
            const actionsData = await actionsRes.json();
            setAdaptiveActions(actionsData.actions || []);
          }

          // 5. Buscar padrões aprendidos
          const patternsRes = await fetch(
            API_ENDPOINTS.aiMaturity.learnedPatterns(companyId),
            { headers }
          );
          
          if (patternsRes.ok) {
            const patternsData = await patternsRes.json();
            setLearnedPatterns(patternsData);
          }
        } catch (err) {
          console.error("ai_maturity.learning_data_error", { error: err instanceof Error ? err.message : String(err) });
        } finally {
          setLoadingLearning(false);
        }

        setLoading(false);
        setRefreshing(false);
        
      } catch (err: any) {
        console.error("ai_maturity.load_error", { error: err instanceof Error ? err.message : String(err) });
        setError(err.message || 'Erro ao carregar dados');
        setLoading(false);
        setRefreshing(false);
        
        // Não usar dados mock - deixar vazio e mostrar erro
        setOverallMaturity(0);
        setWeeklyGrowth(0);
        setDomains([]);
        setEvolution([]);
        setDataWarning(t('aimaturity.errors.loadError'));
      }
  }, [period, getDays, getStartDate, getEndDate]);

  // Efeito com polling automático
  useEffect(() => {
    // Buscar imediatamente
    fetchMaturityData();
    
    // Polling a cada 5 minutos (300000ms)
    const interval = setInterval(() => {
      fetchMaturityData(false); // Polling silencioso
    }, 5 * 60 * 1000);
    
    // Cleanup
    return () => clearInterval(interval);
  }, [fetchMaturityData, period]); // Adicionar period como dependência

  // Handler para refresh manual
  const handleRefresh = useCallback(() => {
    fetchMaturityData(true);
  }, [fetchMaturityData]);

  const getStatusIcon = (status: DomainArea['status']) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'good':
        return <Info className="w-5 h-5 text-blue-400" />;
      case 'learning':
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
    }
  };

  const getStatusLabel = (status: DomainArea['status']) => {
    switch (status) {
      case 'excellent':
        return t('aimaturity.statusExcellent');
      case 'good':
        return t('aimaturity.statusGood');
      case 'learning':
        return t('aimaturity.statusLearning');
    }
  };

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4">
            <Sparkles className="w-12 h-12 text-pink-400 animate-pulse mx-auto" />
            <p className="text-white/60">{t('aimaturity.calculatingMaturity')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Error banner (se houver) */}
        {error && (
          <div className="glass-panel rounded-xl p-4 border border-amber-500/30 bg-amber-500/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <p className="text-white/80 text-sm">
                {error} - {t('aimaturity.showingSimulatedData')}
              </p>
            </div>
          </div>
        )}

        {/* Data warning (se houver) */}
        {dataWarning && (
          <div className="glass-panel rounded-xl p-4 border border-blue-500/30 bg-blue-500/10">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-blue-400" />
              <p className="text-white/80 text-sm">
                {dataWarning}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              {t('aimaturity.title')}
            </h1>
            <p className="text-white/40 mt-2">
              {t('aimaturity.subtitleAutonomous')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PeriodFilter
              value={period}
              onChange={setPeriod}
              buttonClassName="border-pink-500/30 bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-white hover:from-pink-500/30 hover:to-purple-500/30 hover:text-white"
            />
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 hover:from-pink-500/30 hover:to-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('aimaturity.refreshData')}
            >
              <RefreshCw className={`w-4 h-4 text-pink-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm text-white/80">{t('aimaturity.update')}</span>
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30">
              <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
              <span className="text-sm text-white/80">{t('aimaturity.evolvingContinuously')}</span>
            </div>
          </div>
        </div>

        {/* Overall Maturity Score */}
        <div className="glass-panel rounded-3xl p-8 border border-white/[0.06]">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Score Circle */}
            <div className="relative">
              <svg className="w-64 h-64 transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="128"
                  cy="128"
                  r="110"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="16"
                />
                {/* Progress circle */}
                <circle
                  cx="128"
                  cy="128"
                  r="110"
                  fill="none"
                  stroke="url(#maturityGradient)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={`${(animatedMaturity / 100) * 691.15} 691.15`}
                  style={{ transition: 'stroke-dasharray 0.3s ease-out' }}
                />
                <defs>
                  <linearGradient id="maturityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-bold text-pearl-pink">{Math.round(animatedMaturity)}%</span>
                <span className="text-white/40 text-sm mt-2">{t('aimaturity.maturity')}</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-6">
              <div>
                {overallMaturity > 0 ? (
                  <>
                    <h2 className="text-2xl font-semibold text-white mb-2">
                      {t('aimaturity.yourNyokaIsPercentMature', { percent: overallMaturity })}
                    </h2>
                    <p className="text-white/60 text-lg">
                      {weeklyGrowth !== 0 ? (
                        t('aimaturity.growthThisWeek', { percent: weeklyGrowth })
                      ) : (
                        t('aimaturity.trackEvolution')
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-semibold text-white mb-2">
                      {t('aimaturity.yourNyokaNoHistory')}
                    </h2>
                    <p className="text-white/60 text-lg">
                      {t('aimaturity.haveConversationsOrDocuments')}
                    </p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white/40 text-sm">{t('aimaturity.growth')}</p>
                      <p className="text-xl font-semibold text-white">+{weeklyGrowth}%</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Activity className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white/40 text-sm">{t('aimaturity.status')}</p>
                      <p className="text-xl font-semibold text-white">{t('aimaturity.active')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20">
                <p className="text-white/80 text-sm leading-relaxed">
                  {t('aimaturity.evolutionAutonomous')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas Detalhadas */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">{t('aimaturity.intelligenceMetrics')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              const changeValue = Number.isFinite(metric.change) ? metric.change : 0;
              const isPositive = changeValue >= 0;
              const trendColor = isPositive ? 'text-emerald-400' : 'text-rose-400';
              const trendPrefix = isPositive ? '▲' : '▼';

              return (
                <div
                  key={index}
                  className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/5 p-6 transition-transform duration-300 ease-out hover:-translate-y-1 hover:border-[#EC4899]/50 hover:shadow-[0_30px_80px_-50px_rgba(236,72,153,0.65)]"
                >
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-40"
                    aria-hidden="true"
                  />
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/40 backdrop-blur">
                      <Icon className={`h-5 w-5 ${metric.iconColor}`} />
                    </div>
                    <span className={`text-sm font-semibold ${trendColor}`}>
                      {trendPrefix} {changeValue.toFixed(1)}%
                    </span>
                  </div>
                  <h3 className="text-white/60 text-sm mb-2">{t(`aimaturity.${({ Conhecimento: 'knowledge', Precisão: 'accuracy', Confiança: 'confidence', Adaptação: 'adaptation', Knowledge: 'knowledge', Precision: 'accuracy', Confidence: 'confidence', Adaptation: 'adaptation' } as Record<string, string>)[metric.name] || 'knowledge'}`)}</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white">{metric.value}%</span>
                  </div>
                  <div className="mt-4 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${metric.color} progress-bar-animate`}
                      style={{ 
                        '--progress-width': `${metric.value}%`
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfico de Evolução Temporal */}
        <div className="glass-panel rounded-3xl p-8 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">{t('aimaturity.evolutionOverTime')}</h2>
          </div>
          <div className="relative h-80">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[100, 75, 50, 25, 0].map((value) => (
                <div key={value} className="flex items-center">
                  <span className="text-white/30 text-xs w-8">{value}</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
              ))}
            </div>

            {/* Line chart ou mensagem de sem dados */}
            {evolution.length > 0 ? (
              <svg className="absolute inset-0 w-full h-full" style={{ paddingLeft: '40px' }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {(() => {
                const width = window.innerWidth > 768 ? 900 : 600;
                const height = 280;
                const startX = 40;
                const startY = 320;
                
                // Calcular pontos
                const points = evolution.map((point, i) => {
                  const x = startX + (i / Math.max(1, evolution.length - 1)) * width;
                  const y = startY - (point.maturity / 100 * height);
                  return { x, y };
                });
                
                // Função para criar curva suave (Smooth Bezier)
                const createSmoothPath = (points: { x: number; y: number }[]) => {
                  if (points.length < 2) return '';
                  
                  let path = `M ${points[0].x} ${points[0].y}`;
                  
                  for (let i = 0; i < points.length - 1; i++) {
                    const current = points[i];
                    const next = points[i + 1];
                    
                    if (i === 0) {
                      // Primeiro ponto: usar ponto médio
                      const cp1x = current.x + (next.x - current.x) / 3;
                      const cp1y = current.y;
                      const cp2x = current.x + (next.x - current.x) * 2 / 3;
                      const cp2y = next.y;
                      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
                    } else if (i === points.length - 2) {
                      // Último ponto: usar ponto médio
                      const cp1x = current.x + (next.x - current.x) / 3;
                      const cp1y = current.y;
                      const cp2x = current.x + (next.x - current.x) * 2 / 3;
                      const cp2y = next.y;
                      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
                    } else {
                      // Pontos intermediários: usar pontos médios entre pontos adjacentes
                      const prev = points[i - 1];
                      const cp1x = current.x + (next.x - current.x) / 3;
                      const cp1y = current.y;
                      const cp2x = current.x + (next.x - current.x) * 2 / 3;
                      const cp2y = next.y;
                      path += ` S ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
                    }
                  }
                  
                  return path;
                };
                
                const smoothPath = createSmoothPath(points);
                const areaPath = smoothPath + ` L ${startX + width} ${startY} L ${startX} ${startY} Z`;
                
                return (
                  <>
                    {/* Area under curve */}
                    <path
                      d={areaPath}
                      fill="url(#areaGradient)"
                    />
                    
                    {/* Smooth line */}
                    <path
                      d={smoothPath}
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Mostrar apenas alguns pontos principais (primeiro, último e alguns intermediários) */}
                    {points.filter((_, i) => 
                      i === 0 || 
                      i === points.length - 1 || 
                      (points.length > 10 && i % Math.floor(points.length / 5) === 0)
                    ).map((point, idx) => (
                      <g key={idx}>
                        <circle cx={point.x} cy={point.y} r="6" fill="#ec4899" />
                        <circle cx={point.x} cy={point.y} r="3" fill="white" />
                      </g>
                    ))}
                  </>
                );
                })()}
              </svg>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ paddingLeft: '40px' }}>
                <div className="text-center">
                  <Info className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40 text-sm">
                    {t('aimaturity.noHistoricalData')}
                  </p>
                  <p className="text-white/30 text-xs mt-2">
                    {t('aimaturity.haveConversationsToSeeEvolution')}
                  </p>
                </div>
              </div>
            )}

            {/* X-axis labels - mostrar apenas pontos únicos por label */}
            {evolution.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-10 text-white/30 text-xs">
                {evolution
                  .filter((point, i, arr) => {
                    // Mostrar apenas se for o primeiro ou se o label mudou
                    return i === 0 || arr[i - 1].date !== point.date;
                  })
                  .map((point, i) => (
                    <span key={i}>{point.date}</span>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Áreas de Domínio */}
        <div className="glass-panel rounded-3xl p-8 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">{t('aimaturity.domainAreas')}</h2>
            <p className="text-white/40 text-sm">{t('aimaturity.strengthByTopic')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map((domain, index) => (
              <div key={index} className="glass-card rounded-xl p-5 border border-white/[0.06] hover:border-pink-500/30 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(domain.status)}
                    <h3 className="text-white font-medium">{t(`aimaturity.domain.${(domain.name || '').toLowerCase()}`) || domain.name}</h3>
                  </div>
                  <span className="text-2xl font-bold text-pearl-pink">{domain.strength}%</span>
                </div>

                <div className="space-y-2">
                  {/* Animated progress bar */}
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full progress-bar-animate ${
                        domain.status === 'excellent' 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : domain.status === 'good'
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}
                      style={{ 
                        '--progress-width': `${domain.strength}%`
                      } as React.CSSProperties}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">{domain.topics} {t('aimaturity.topicsLearned')}</span>
                    <span className={`
                      ${domain.status === 'excellent' ? 'text-green-400' : ''}
                      ${domain.status === 'good' ? 'text-blue-400' : ''}
                      ${domain.status === 'learning' ? 'text-amber-400' : ''}
                    `}>
                      {getStatusLabel(domain.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Aprendizado Cognitivo - NOVO */}
        <div className="glass-panel rounded-3xl p-8 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20">
                <Lightbulb className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{t('aimaturity.cognitiveLearning')}</h2>
                <p className="text-white/40 text-sm">{t('aimaturity.howNyokaEvolving')}</p>
              </div>
            </div>
          </div>

          {loadingLearning ? (
            <div className="text-center py-8 text-white/40">{t('aimaturity.loadingLearningData')}</div>
          ) : (
            <div className="space-y-6">
              {/* Ações Adaptativas Recentes */}
              {adaptiveActions.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-pink-400" />
                    {t('aimaturity.recentAutomaticAdjustments')}
                  </h3>
                  <div className="space-y-3">
                    {adaptiveActions.slice(0, 5).map((action: any, idx) => {
                      const effectivenessScore = action.effectiveness_score;
                      const wasRolledBack = action.rollback_at !== null;
                      
                      // Determinar cor baseada na efetividade
                      let effectivenessColor = 'text-white/40';
                      let effectivenessLabel = t('aimaturity.measuringEffectiveness');
                      
                      if (effectivenessScore !== null && effectivenessScore !== undefined) {
                        if (wasRolledBack) {
                          effectivenessColor = 'text-red-400';
                          effectivenessLabel = t('aimaturity.revertedEffectiveness', { percent: Math.round(effectivenessScore * 100) });
                        } else if (effectivenessScore >= 0.7) {
                          effectivenessColor = 'text-green-400';
                          effectivenessLabel = t('aimaturity.effective', { percent: Math.round(effectivenessScore * 100) });
                        } else if (effectivenessScore >= 0.5) {
                          effectivenessColor = 'text-yellow-400';
                          effectivenessLabel = t('aimaturity.moderate', { percent: Math.round(effectivenessScore * 100) });
                        } else {
                          effectivenessColor = 'text-orange-400';
                          effectivenessLabel = t('aimaturity.low', { percent: Math.round(effectivenessScore * 100) });
                        }
                      }
                      
                      return (
                        <div 
                          key={action.id || idx}
                          className={`glass-card rounded-xl p-4 border transition-all ${
                            wasRolledBack 
                              ? 'border-red-500/30 bg-red-500/5' 
                              : 'border-white/[0.06] hover:border-pink-500/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="px-2 py-1 rounded-md bg-pink-500/20 text-pink-400 text-xs font-medium">
                                  {action.action_type?.replace(/_/g, ' ').replace(/adjust/gi, 'Ajuste').replace(/learn/gi, 'Aprendizado') || 'Ação'}
                                </span>
                                {action.confidence && (
                                  <span className="text-white/40 text-xs">
                                    {t('aimaturity.confidencePercent', { percent: Math.round(action.confidence * 100) })}
                                  </span>
                                )}
                                {effectivenessScore !== null && effectivenessScore !== undefined && (
                                  <span className={`text-xs font-medium ${effectivenessColor}`}>
                                    {effectivenessLabel}
                                  </span>
                                )}
                                {wasRolledBack && (
                                  <span className="px-2 py-1 rounded-md bg-red-500/20 text-red-400 text-xs font-medium">
                                    ⚠️ {t('aimaturity.reverted')}
                                  </span>
                                )}
                              </div>
                              <p className="text-white/80 text-sm mb-2">{action.reason}</p>
                              {action.state_before && action.state_after && (
                                <div className="flex items-center gap-2 text-xs text-white/50">
                                  <span>{typeof action.state_before === 'object' ? JSON.stringify(action.state_before) : action.state_before}</span>
                                  <ArrowRight className="w-3 h-3" />
                                  <span className="text-pink-400">{typeof action.state_after === 'object' ? JSON.stringify(action.state_after) : action.state_after}</span>
                                </div>
                              )}
                              {action.applied_at && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-white/40">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(action.applied_at).toLocaleString('pt-BR')}</span>
                                  {wasRolledBack && action.rollback_at && (
                                    <>
                                      <span className="mx-1">•</span>
                                      <span className="text-red-400">{t('aimaturity.revertedAt')} {new Date(action.rollback_at).toLocaleString()}</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Padrões Aprendidos */}
              {learnedPatterns && (
                <>
                  {/* Configurações por Tópico */}
                  {learnedPatterns.topic_configs && Object.keys(learnedPatterns.topic_configs).length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        {t('aimaturity.patternsLearnedByTopic')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(learnedPatterns.topic_configs).map(([topic, config]: [string, any]) => (
                          <div 
                            key={topic}
                            className="glass-card rounded-xl p-4 border border-white/[0.06] hover:border-purple-500/30 transition-all"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-400 text-xs font-medium">
                                {topic}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-white/70">
                              {config.max_context_chunks && (
                                <div>📚 Contexto aumentado: {config.max_context_chunks} chunks</div>
                              )}
                              {config.temperature_boost && (
                                <div>🌡️ Temperature ajustada: +{config.temperature_boost}</div>
                              )}
                              {config.prompt_hint && (
                                <div className="text-xs text-white/50 italic">💡 {config.prompt_hint}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Padrões Temporais */}
                  {learnedPatterns.temporal_patterns && learnedPatterns.temporal_patterns.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-400" />
                        {t('aimaturity.identifiedTemporalPatterns')}
                      </h3>
                      <div className="space-y-2">
                        {learnedPatterns.temporal_patterns.slice(0, 5).map((pattern: any, idx: number) => (
                          <div 
                            key={idx}
                            className="glass-card rounded-xl p-3 border border-white/[0.06] text-sm text-white/70"
                          >
                            <p>{pattern.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {adaptiveActions.length === 0 && (!learnedPatterns || Object.keys(learnedPatterns?.topic_configs || {}).length === 0) && (
                <div className="text-center py-8 text-white/40">
                  <Lightbulb className="w-12 h-12 mx-auto mb-3 text-white/20" />
                  <p>{t('aimaturity.nyokaCollectingData')}</p>
                  <p className="text-sm mt-1">{t('aimaturity.continueUsingToSeeAdjustments')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="glass-panel rounded-3xl p-6 border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-pink-500/20 flex-shrink-0">
              <Sparkles className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">{t('aimaturity.howNyokaEvolves')}</h3>
              <p className="text-white/60 leading-relaxed">
                {t('aimaturity.howNyokaEvolvesParagraph')}{' '}
                <span className="text-pearl-pink font-medium">{t('aimaturity.howNyokaEvolvesHighlight')}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

