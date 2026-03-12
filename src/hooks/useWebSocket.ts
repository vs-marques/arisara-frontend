/**
 * useWebSocket Hook
 * 
 * Gerencia conexão WebSocket com o backend Nyoka (usado pela Arisara) para atualizações em tempo real.
 * Inspirado no WhatsApp Web - atualiza UI instantaneamente quando há novas mensagens/conversas.
 * 
 * Eventos recebidos:
 * - connected: Confirmação de conexão estabelecida
 * - new_conversation: Nova conversa iniciada
 * - new_message: Nova mensagem recebida
 * - status_update: Status da conversa mudou
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface WebSocketMessage {
  event: string;
  data: any;
  timestamp: string;
}

export interface UseWebSocketOptions {
  companyId: string;
  onNewConversation?: (data: any) => void;
  onNewMessage?: (data: any) => void;
  onStatusUpdate?: (data: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export const useWebSocket = ({
  companyId,
  onNewConversation,
  onNewMessage,
  onStatusUpdate,
  onConnected,
  onDisconnected,
  autoReconnect = true,
  reconnectInterval = 3000
}: UseWebSocketOptions) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // ✅ Usar refs para callbacks (evita recriação do connect)
  const callbacksRef = useRef({
    onNewConversation,
    onNewMessage,
    onStatusUpdate,
    onConnected,
    onDisconnected
  });
  
  // Atualizar refs quando callbacks mudarem (sem recriar connect)
  useEffect(() => {
    callbacksRef.current = {
      onNewConversation,
      onNewMessage,
      onStatusUpdate,
      onConnected,
      onDisconnected
    };
  }, [onNewConversation, onNewMessage, onStatusUpdate, onConnected, onDisconnected]);

  const connect = useCallback(() => {
    // ✅ CRÍTICO: Não conectar se não tiver company_id
    if (!companyId || companyId === '') {
      console.debug("ws.waiting_company_id");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.debug("ws.already_connected");
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

      // VITE_WS_URL = conexão direta ao Core (bypass gateway). Ex: ws://localhost:8001
      // Se não definido, usa o mesmo host da API (atrás do gateway; token na query).
      const wsBase = (import.meta.env.VITE_WS_URL as string)?.trim();
      let wsUrl: string;
      if (wsBase) {
        const base = wsBase.startsWith("ws") ? wsBase : `${protocol}//${wsBase}`;
        const parsed = new URL(base);
        wsUrl = `${parsed.protocol}//${parsed.host}/chat/ws/${companyId}`;
        // direto no Core: rota pública, sem token
      } else {
        const apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";
        const apiUrl = new URL(apiBaseUrl);
        const host =
          window.location.hostname === "localhost"
            ? `${apiUrl.hostname}:${apiUrl.port || (protocol === "wss:" ? "443" : "8001")}`
            : apiUrl.host;
        wsUrl = `${protocol}//${host}/chat/ws/${companyId}`;
        const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
        if (token) wsUrl += `?token=${encodeURIComponent(token)}`;
      }

      console.debug("ws.connecting", { url: wsUrl.replace(/\?token=.*/, "?token=***") });
      
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.debug("ws.connected");
        setIsConnected(true);
        setConnectionError(null);
        
        // Limpar timeout de reconexão se houver
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          // ✅ Log apenas para eventos importantes (reduzir spam)
          if (message.event !== 'pong') {
            console.debug("ws.message_received", { event: message.event });
          }

          // ✅ Usar callbacks do ref (evita dependências)
          switch (message.event) {
            case 'connected':
              callbacksRef.current.onConnected?.();
              break;
            
            case 'new_conversation':
              callbacksRef.current.onNewConversation?.(message.data);
              break;
            
            case 'new_message':
              callbacksRef.current.onNewMessage?.(message.data);
              break;
            
            case 'status_update':
              callbacksRef.current.onStatusUpdate?.(message.data);
              break;
            
            case 'pong':
              // Resposta ao ping (heartbeat) - silencioso
              break;
            
            default:
              console.debug("ws.unknown_event", { event: message.event });
          }
        } catch (error) {
          console.error("ws.message_parse_error", { error: error instanceof Error ? error.message : String(error) });
        }
      };

      ws.onerror = (error) => {
        console.error("ws.error", { error: error instanceof Error ? error.message : String(error) });
        setConnectionError('Erro na conexão WebSocket');
      };

      ws.onclose = (event) => {
        // ✅ Log apenas se não for fechamento normal (código 1000)
        if (event.code !== 1000) {
          console.debug("ws.disconnected", { code: event.code, reason: event.reason });
        }
        setIsConnected(false);
        wsRef.current = null;
        callbacksRef.current.onDisconnected?.();

        // Reconectar automaticamente se habilitado
        if (autoReconnect && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;

    } catch (error) {
      console.error("ws.connect_error", { error: error instanceof Error ? error.message : String(error) });
      setConnectionError(String(error));
    }
  }, [companyId, autoReconnect, reconnectInterval]); // ✅ Removido callbacks das dependências

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      console.debug("ws.disconnecting");
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    } else {
      console.warn("ws.not_connected_send_skipped");
    }
  }, []);

  const sendPing = useCallback(() => {
    sendMessage('ping');
  }, [sendMessage]);

  // ✅ Conectar apenas quando company_id mudar (não quando connect/disconnect mudarem)
  useEffect(() => {
    // ✅ Só conectar quando tiver company_id válido
    if (companyId && companyId !== '') {
      connect();
    }

    // Cleanup ao desmontar ou quando company_id mudar
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]); // ✅ Apenas companyId como dependência (connect/disconnect são estáveis)

  // Heartbeat (ping a cada 30s para manter conexão viva)
  useEffect(() => {
    if (!isConnected) return;

    const heartbeatInterval = setInterval(() => {
      sendPing();
    }, 30000); // 30 segundos

    return () => clearInterval(heartbeatInterval);
  }, [isConnected, sendPing]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    sendMessage,
    sendPing
  };
};

