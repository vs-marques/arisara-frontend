import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { MapPin, Globe, Activity, TrendingUp, BarChart3, Zap, TrendingDown } from 'lucide-react';
import { API_ENDPOINTS, getAuthHeaders, resolveCompanyIdForApi } from '../config/api';
import RealtimeMetrics from '../components/RealtimeMetrics';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

interface GeoPoint {
  latitude: number;
  longitude: number;
  city: string | null;
  country: string;
  count: number;
}

interface CountryStats {
  country: string;
  country_name: string;
  total_requests: number;
  avg_response_time_ms: number;
  cities: string[];
}

export default function Analytics() {
  useRequireAuth();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [geoPoints, setGeoPoints] = useState<GeoPoint[]>([]);
  const [countries, setCountries] = useState<CountryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'geo' | 'realtime' | 'search'>('geo');
  const [searchAnalytics, setSearchAnalytics] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await fetch(API_ENDPOINTS.auth.me, { headers });
        if (res.ok) {
          const data = await res.json();
          setCompanyId(resolveCompanyIdForApi(currentWorkspace, data));
        }
      } catch (err) {
        console.error("analytics.user_data_error", { error: err instanceof Error ? err.message : String(err) });
      }
    };
    fetchUserData();
  }, [currentWorkspace]);

  useEffect(() => {
    if (activeTab === 'geo') {
      loadGeoData();
      const interval = setInterval(loadGeoData, 30000);
      return () => clearInterval(interval);
    } else if (activeTab === 'search' && companyId) {
      loadSearchAnalytics();
    }
  }, [activeTab, companyId]);

  const loadGeoData = async () => {
    try {
      const headers = getAuthHeaders();

      const heatmapRes = await fetch(API_ENDPOINTS.analytics.geo.heatmap(7), {
        headers,
      });
      if (heatmapRes.ok) {
        const data = await heatmapRes.json();
        setGeoPoints(data);
      }

      const countriesRes = await fetch(API_ENDPOINTS.analytics.geo.countries(30), {
        headers,
      });
      if (countriesRes.ok) {
        const data = await countriesRes.json();
        setCountries(data);
      }

      setLoading(false);
    } catch (error) {
      console.error("analytics.geo_data_error", { error: error instanceof Error ? error.message : String(error) });
      setLoading(false);
    }
  };

  const loadSearchAnalytics = async () => {
    if (!companyId) return;

    setSearchLoading(true);
    try {
      const headers = getAuthHeaders();

      const analyticsRes = await fetch(API_ENDPOINTS.search.analytics(companyId, 30), { headers });
      const usageRes = await fetch(API_ENDPOINTS.search.usage(companyId, 30), { headers });
      const trendsRes = await fetch(API_ENDPOINTS.search.trends(companyId, 30), { headers });
      const performanceRes = await fetch(API_ENDPOINTS.search.performance(companyId, 30), { headers });
      const insightsRes = await fetch(API_ENDPOINTS.search.insights(companyId), { headers });

      const [analytics, usage, trends, performance, insights] = await Promise.all([
        analyticsRes.ok ? analyticsRes.json() : null,
        usageRes.ok ? usageRes.json() : null,
        trendsRes.ok ? trendsRes.json() : null,
        performanceRes.ok ? performanceRes.json() : null,
        insightsRes.ok ? insightsRes.json() : null,
      ]);

      setSearchAnalytics({ analytics, usage, trends, performance, insights });
    } catch (err) {
      console.error("analytics.search_analytics_error", { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setSearchLoading(false);
    }
  };

  const totalRequests = countries.reduce((sum, c) => sum + c.total_requests, 0);
  const avgResponseTime = countries.length > 0
    ? Math.round(countries.reduce((sum, c) => sum + c.avg_response_time_ms, 0) / countries.length)
    : 0;

  const formatNumber = (value: number, suffix?: string, decimals: number = 2) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    const formatted = value % 1 === 0 
      ? value.toLocaleString('pt-BR') 
      : value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return suffix ? `${formatted}${suffix}` : formatted;
  };

  const formatTelemetryValue = (value: any, label: string): string => {
    if (typeof value === 'number') return formatNumber(value);
    if (value && typeof value === 'object') {
      if ('avg' in value) return formatNumber(value.avg);
    }
    return '—';
  };

  const getTelemetryLabel = (label: string): string => {
    const keyMap: Record<string, string> = {
      confidence: 'confidence',
      latency: 'latency',
      chunks: 'chunks',
      'confidence_percentiles': 'confidencePercentiles',
      'latency_percentiles': 'latencyPercentiles',
      'performance_by_topic': 'performanceByTopic',
      'period_days': 'periodDays',
    };
    const tKey = keyMap[label.toLowerCase()];
    return tKey ? t(`analytics.${tKey}`) : label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] px-10 py-8 shadow-[0_30px_80px_-60px_rgba(236,72,153,0.45)] backdrop-blur-lg">
          {/* Cabeçalho */}
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-white">{t('analytics.title')}</h1>
            <p className="mt-2 text-sm text-gray-400">
              {t('analytics.subtitle')}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-2 py-2">
            <button
              onClick={() => setActiveTab('geo')}
              className={`flex-1 min-w-[120px] rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === 'geo'
                  ? 'bg-[#EC4899] text-white shadow-[0_15px_40px_-25px_rgba(236,72,153,0.8)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Globe className="h-4 w-4" /> {t('analytics.tabGeo')}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('realtime')}
              className={`flex-1 min-w-[120px] rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === 'realtime'
                  ? 'bg-[#EC4899] text-white shadow-[0_15px_40px_-25px_rgba(236,72,153,0.8)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Activity className="h-4 w-4" /> {t('analytics.tabRealtime')}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 min-w-[120px] rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === 'search'
                  ? 'bg-[#EC4899] text-white shadow-[0_15px_40px_-25px_rgba(236,72,153,0.8)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <BarChart3 className="h-4 w-4" /> {t('analytics.tabSearch')}
              </div>
            </button>
          </div>

          {/* Conteúdo */}
          <div className="mt-6 rounded-3xl border border-white/10 bg-black/50 px-8 py-10">
            {activeTab === 'geo' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="glass-card rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-[#EC4899]/10">
                        <Globe className="w-5 h-5 text-[#EC4899]" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-400">{t('analytics.activeCountries')}</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{countries.length}</p>
                  </div>
                  <div className="glass-card rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-[#EC4899]/10">
                        <MapPin className="w-5 h-5 text-[#EC4899]" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-400">{t('analytics.locations')}</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{geoPoints.length}</p>
                  </div>
                  <div className="glass-card rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-[#EC4899]/10">
                        <Activity className="w-5 h-5 text-[#EC4899]" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-400">{t('analytics.totalRequests')}</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{totalRequests.toLocaleString()}</p>
                  </div>
                  <div className="glass-card rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-[#EC4899]/10">
                        <TrendingUp className="w-5 h-5 text-[#EC4899]" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-400">{t('analytics.avgLatency')}</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{avgResponseTime}ms</p>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-8">
                  <h2 className="text-xl font-semibold text-white mb-6">{t('analytics.requestsMap')}</h2>
                  <div className="bg-black/40 rounded-2xl border border-dashed border-white/10 h-96 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t('analytics.mapInteractive')}</p>
                      <p className="text-sm mt-2">{t('analytics.dataPointsAvailable', { count: geoPoints.length })}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-8">
                  <h2 className="text-xl font-semibold text-white mb-6">{t('analytics.topCountries')}</h2>
                  {loading ? (
                    <p className="text-gray-500">{t('analytics.loading')}</p>
                  ) : (
                    <div className="space-y-4">
                      {countries.slice(0, 10).map((country, idx) => (
                        <div key={country.country} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-[#EC4899]/10 flex items-center justify-center text-sm font-bold text-[#EC4899]">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-medium text-white">{country.country_name}</p>
                              <p className="text-sm text-gray-500">{country.cities.slice(0, 3).join(', ')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-white">{country.total_requests.toLocaleString()}</p>
                            <p className="text-sm text-gray-500">{Math.round(country.avg_response_time_ms)} {t('analytics.msAvg')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'realtime' && companyId && (
              <RealtimeMetrics
                companyId={companyId}
                onMetricsUpdate={(metrics) => {
                  console.debug("analytics.metrics_updated", { count: metrics?.length });
                }}
              />
            )}

            {activeTab === 'search' && (
              <div className="space-y-6">
                {searchLoading ? (
                  <div className="glass-card rounded-3xl p-8 text-center">
                    <Activity className="w-8 h-8 mx-auto mb-4 animate-pulse text-pink-500" />
                    <p className="text-gray-400">{t('analytics.loadingAnalytics')}</p>
                  </div>
                ) : searchAnalytics ? (
                  <>
                    {searchAnalytics.insights && (
                      <div className="glass-card rounded-3xl p-8">
                        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                          <Zap className="w-5 h-5 text-yellow-500" />
                          {t('analytics.autoInsights')}
                        </h2>
                        <div className="space-y-3">
                          {searchAnalytics.insights.insights?.map((insight: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                              <p className="text-white">{insight}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchAnalytics.trends && (
                      <div className="glass-card rounded-3xl p-8">
                        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-green-500" />
                          {t('analytics.trendAnalysis')}
                        </h2>
                        {searchAnalytics.trends.changes && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                              <p className="text-sm text-gray-400 mb-2">{t('analytics.volume')}</p>
                              <p className={`text-2xl font-bold ${searchAnalytics.trends.changes.volume_change_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {searchAnalytics.trends.changes.volume_change_pct >= 0 ? '+' : ''}
                                {searchAnalytics.trends.changes.volume_change_pct?.toFixed(1)}%
                              </p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                              <p className="text-sm text-gray-400 mb-2">{t('analytics.confidence')}</p>
                              <p className={`text-2xl font-bold ${searchAnalytics.trends.changes.confidence_change_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {searchAnalytics.trends.changes.confidence_change_pct >= 0 ? '+' : ''}
                                {searchAnalytics.trends.changes.confidence_change_pct?.toFixed(1)}%
                              </p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                              <p className="text-sm text-gray-400 mb-2">{t('analytics.latency')}</p>
                              <p className={`text-2xl font-bold ${searchAnalytics.trends.changes.latency_change_pct < 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {searchAnalytics.trends.changes.latency_change_pct >= 0 ? '+' : ''}
                                {searchAnalytics.trends.changes.latency_change_pct?.toFixed(1)}%
                              </p>
                              <p className="text-xs text-gray-500 mt-1">{t('analytics.negativeFaster')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {searchAnalytics.performance && (
                      <div className="glass-card rounded-3xl p-8">
                        <h2 className="text-xl font-semibold text-white mb-6">{t('analytics.performanceMetrics')}</h2>
                        
                        {/* Separar métricas de stats e percentis */}
                        {(() => {
                          const stats: Array<[string, any]> = [];
                          const percentiles: Array<[string, any]> = [];
                          const simple: Array<[string, any]> = [];
                          
                          Object.entries(searchAnalytics.performance).forEach(([key, value]) => {
                            // Pular valores null, undefined ou objetos vazios
                            if (value === null || value === undefined) return;
                            
                            if (typeof value === 'object' && !Array.isArray(value)) {
                              const keys = Object.keys(value);
                              // Pular objetos vazios
                              if (keys.length === 0) return;
                              
                              const hasStats = ['avg', 'min', 'max', 'count', 'sum'].some(prop => prop in value);
                              // Detectar percentis: todas as chaves são números ou terminam com %
                              const isPercentile = keys.length > 0 && keys.every(k => 
                                !Number.isNaN(parseFloat(k)) || k.endsWith('%')
                              );
                              
                              // Percentis: verificar se o nome contém "percentile" ou se é claramente percentil
                              if (isPercentile || key.toLowerCase().includes('percentile')) {
                                percentiles.push([key, value]);
                              } else if (hasStats) {
                                // Verificar se tem pelo menos um valor válido
                                const hasValidValue = ['avg', 'min', 'max', 'count'].some(prop => 
                                  value[prop] !== undefined && value[prop] !== null
                                );
                                if (hasValidValue) {
                                  stats.push([key, value]);
                                }
                              } else {
                                // Outros objetos só se tiverem conteúdo válido
                                const hasValidContent = keys.some(k => value[k] !== null && value[k] !== undefined);
                                if (hasValidContent) {
                                  simple.push([key, value]);
                                }
                              }
                            } else if (typeof value === 'number' && !Number.isNaN(value)) {
                              simple.push([key, value]);
                            }
                          });

                          return (
                            <div className="space-y-6">
                              {/* Stats cards - grid uniforme 3 colunas */}
                              {stats.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {stats.map(([key, value]) => (
                                    <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 h-[180px] flex flex-col">
                                      <p className="text-sm font-medium text-white mb-4 capitalize">
                                        {getTelemetryLabel(key)}
                                      </p>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-1">
                                        {value.avg !== undefined && value.avg !== null && (
                                          <div>
                                            <p className="text-xs text-gray-400 mb-1">{t('analytics.avg')}</p>
                                            <p className="text-base font-semibold text-white">
                                              {key.toLowerCase().includes('confidence') 
                                                ? `${formatNumber(value.avg * 100, '%', 1)}`
                                                : formatNumber(value.avg, key.toLowerCase().includes('latency') ? 'ms' : '', 0)}
                                            </p>
                                          </div>
                                        )}
                                        {value.min !== undefined && value.min !== null && (
                                          <div>
                                            <p className="text-xs text-gray-400 mb-1">{t('analytics.min')}</p>
                                            <p className="text-base font-semibold text-white">
                                              {key.toLowerCase().includes('confidence')
                                                ? formatNumber(value.min * 100, '%', 1)
                                                : formatNumber(value.min, key.toLowerCase().includes('latency') ? 'ms' : '', 0)}
                                            </p>
                                          </div>
                                        )}
                                        {value.max !== undefined && value.max !== null && (
                                          <div>
                                            <p className="text-xs text-gray-400 mb-1">{t('analytics.max')}</p>
                                            <p className="text-base font-semibold text-white">
                                              {key.toLowerCase().includes('confidence')
                                                ? formatNumber(value.max * 100, '%', 1)
                                                : formatNumber(value.max, key.toLowerCase().includes('latency') ? 'ms' : '', 0)}
                                            </p>
                                          </div>
                                        )}
                                        {value.count !== undefined && value.count !== null && (
                                          <div>
                                            <p className="text-xs text-gray-400 mb-1">{t('analytics.qty')}</p>
                                            <p className="text-base font-semibold text-white">{formatNumber(value.count, '', 0)}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Percentis - grid uniforme 2 colunas */}
                              {percentiles.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {percentiles.map(([key, value]) => {
                                    const entries = Object.entries(value as Record<string, number>)
                                      .filter(([_, val]) => val !== null && val !== undefined && !Number.isNaN(val))
                                      .sort(([a], [b]) => parseFloat(a) - parseFloat(b));
                                    
                                    if (entries.length === 0) return null;
                                    
                                    return (
                                      <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 h-[220px] flex flex-col">
                                        <p className="text-sm font-medium text-white mb-4 capitalize">
                                          {getTelemetryLabel(key)}
                                        </p>
                                        <div className="grid grid-cols-3 gap-2 flex-1">
                                          {entries.map(([percentile, val]) => (
                                            <div key={percentile} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 flex flex-col justify-center">
                                              <p className="text-xs text-gray-400 mb-1">P{percentile}</p>
                                              <p className="text-sm font-semibold text-white">
                                                {key.toLowerCase().includes('confidence')
                                                  ? formatNumber(val * 100, '%', 1)
                                                  : formatNumber(val, key.toLowerCase().includes('latency') ? 'ms' : '', 0)}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Valores simples - grid uniforme */}
                              {simple.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  {simple.map(([key, value]) => {
                                    // Pular valores inválidos
                                    if (value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))) {
                                      return null;
                                    }
                                    
                                    return (
                                      <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 h-[140px] flex flex-col justify-center">
                                        <p className="text-sm text-gray-400 mb-2 capitalize">
                                          {getTelemetryLabel(key)}
                                        </p>
                                        <p className="text-2xl font-semibold text-white">
                                          {typeof value === 'number' ? formatNumber(value, '', 0) : '—'}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {searchAnalytics.usage && (
                      <div className="glass-card rounded-3xl p-8">
                        <h2 className="text-xl font-semibold text-white mb-6">Métricas de Uso</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(searchAnalytics.usage)
                            .filter(([_, value]) => value !== null && value !== undefined && !(typeof value === 'number' && Number.isNaN(value)))
                            .map(([key, value]: [string, any]) => (
                              <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 h-[140px] flex flex-col justify-center">
                                <p className="text-sm text-gray-400 mb-2 capitalize">
                                  {getTelemetryLabel(key)}
                                </p>
                                <p className="text-2xl font-semibold text-white">
                                  {formatTelemetryValue(value, key)}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="glass-card rounded-3xl p-8 text-center">
                    <BarChart3 className="w-8 h-8 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400">{t('analytics.noDataAvailable')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

