/**
 * RealtimeMetrics Component
 * Componente para exibir métricas em tempo real via Server-Sent Events
 */
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { Activity, TrendingUp, TrendingDown, Zap, Users, MessageSquare } from 'lucide-react';

interface RealtimeMetricsData {
  company_id: string;
  timestamp: string;
  total_conversations: number;
  avg_confidence: number;
  avg_latency_ms: number;
  active_users?: number;
  messages_per_minute?: number;
  top_topics?: string[];
  recent_conversations?: number;
}

interface RealtimeMetricsProps {
  companyId: string;
  onMetricsUpdate?: (metrics: RealtimeMetricsData) => void;
}

export default function RealtimeMetrics({ companyId, onMetricsUpdate }: RealtimeMetricsProps) {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<RealtimeMetricsData | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!companyId) return;

    // EventSource não suporta headers customizados, então vamos usar fetch com ReadableStream
    const connectSSE = async () => {
      try {
        const headers = getAuthHeaders();
        
        // Verificar se o token está presente
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Token de autenticação não encontrado. Faça login novamente.');
          return;
        }
        
        const response = await fetch(API_ENDPOINTS.realtime.metrics(companyId), { 
          headers: {
            ...headers,
            'Accept': 'text/event-stream'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No reader available');
        }

        readerRef.current = reader;
        setConnected(true);
        setError(null);

        const readStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                setConnected(false);
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                  const dataStr = line.substring(6).trim();
                  if (!dataStr) continue;
                  
                  try {
                    const data = JSON.parse(dataStr);
                    
                    // Processar diferentes tipos de eventos
                    if (data.event === 'connected') {
                      console.debug("realtime.sse_connected");
                    } else if (data.total_conversations !== undefined || (data.company_id && !data.error)) {
                      // É uma métrica
                      setMetrics(data as RealtimeMetricsData);
                      onMetricsUpdate?.(data as RealtimeMetricsData);
                    } else if (data.timestamp && !data.error && !data.total_conversations) {
                      // Heartbeat
                      console.debug("realtime.heartbeat");
                    } else if (data.error) {
                      setError(data.error);
                      setConnected(false);
                    }
                  } catch (e) {
                    // Ignorar linhas que não são JSON válido
                    console.debug("realtime.non_json_line_ignored");
                  }
                }
              }
            }
          } catch (err) {
            console.error("realtime.stream_read_error", { error: err instanceof Error ? err.message : String(err) });
            setConnected(false);
            setError('Erro na conexão');
            
            // Limpar referência
            readerRef.current = null;
            
            // Tentar reconectar após 3 segundos (apenas se não houver timeout já agendado)
            if (!reconnectTimeoutRef.current) {
              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectTimeoutRef.current = null;
                connectSSE();
              }, 3000);
            }
          }
        };

        readStream();

      } catch (err) {
        console.error("realtime.sse_connect_error", { error: err instanceof Error ? err.message : String(err) });
        setError('Erro ao conectar');
        setConnected(false);
        
        // Tentar reconectar após 3 segundos (apenas se não houver timeout já agendado)
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectSSE();
          }, 3000);
        }
      }
    };

    connectSSE();

    return () => {
      // Cleanup: fechar reader e cancelar reconexões
      if (readerRef.current) {
        readerRef.current.cancel();
        readerRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setConnected(false);
    };
  }, [companyId, onMetricsUpdate]);

  // Buscar snapshot atual ao montar
  useEffect(() => {
    const fetchCurrent = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await fetch(API_ENDPOINTS.realtime.current(companyId), { headers });
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error("realtime.fetch_metrics_error", { error: err instanceof Error ? err.message : String(err) });
      }
    };

    if (companyId) {
      fetchCurrent();
    }
  }, [companyId]);

  if (!metrics) {
    return (
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center gap-2 text-gray-400">
          <Activity className="w-5 h-5 animate-pulse" />
          <span>{t('analytics.loadingRealtime')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status da conexão */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Métricas em Tempo Real</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-400">
            {connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* Grid de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Conversas */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="w-5 h-5 text-pink-500" />
            <span className="text-xs text-gray-400">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{metrics.total_conversations}</p>
          <p className="text-xs text-gray-400 mt-1">conversas</p>
        </div>

        {/* Confiança Média */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-xs text-gray-400">Confiança</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {(metrics.avg_confidence * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">média</p>
        </div>

        {/* Latência Média */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="text-xs text-gray-400">Latência</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {metrics.avg_latency_ms.toFixed(0)}ms
          </p>
          <p className="text-xs text-gray-400 mt-1">tempo médio</p>
        </div>

        {/* Usuários Ativos */}
        {metrics.active_users !== undefined && (
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-xs text-gray-400">Usuários</span>
            </div>
            <p className="text-2xl font-bold text-white">{metrics.active_users}</p>
            <p className="text-xs text-gray-400 mt-1">ativos</p>
          </div>
        )}
      </div>

      {/* Mensagens por minuto */}
      {metrics.messages_per_minute !== undefined && (
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Mensagens por minuto</p>
              <p className="text-xl font-semibold text-white">
                {metrics.messages_per_minute.toFixed(1)}
              </p>
            </div>
            <Activity className="w-8 h-8 text-pink-500" />
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="glass-card rounded-2xl p-4 bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}

