/**
 * WebSocket do chat da Saturno Meet — mesma estratégia de URL que useWebSocket (Nyoka Chat):
 * - VITE_WS_URL: conexão direta ao Core (host do env + path da API).
 * - Caso contrário: host derivado de VITE_API_URL / VITE_BACKEND_URL.
 * - Em DEV no localhost, se a API apontar para o gateway (8090/8080), o WS do Meet usa o Core
 *   (VITE_CORE_DEV_PORT ou 8001): o handshake leva ?join= na query e o gateway antigo respondia 401.
 *
 * Autenticação no handshake: ?join= (convidado) ou ?access_token= (logado).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getStoredToken } from '@/config/api';

const MEET_CHAT_WS_PATH = (roomPublicId: string) =>
  `/api/v1/saturno/meet/ws/${encodeURIComponent(roomPublicId)}`;

/** Monta URL do WS do chat da meet (espelha useWebSocket.ts). */
export function buildSaturnoMeetChatWsUrl(
  roomPublicId: string,
  query: URLSearchParams,
): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const path = MEET_CHAT_WS_PATH(roomPublicId);
  const qs = query.toString();
  const suffix = qs ? `?${qs}` : '';

  const wsBase = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
  if (wsBase) {
    const base = wsBase.startsWith('ws') ? wsBase : `${protocol}//${wsBase}`;
    const parsed = new URL(base);
    return `${parsed.protocol}//${parsed.host}${path}${suffix}`;
  }

  const apiBaseUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    'http://localhost:8001';
  const apiUrl = new URL(apiBaseUrl);
  const apiPort = apiUrl.port || (apiUrl.protocol === 'https:' ? '443' : '80');
  const isLocalHost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const gatewayDevPorts = new Set(['8090', '8080']);
  const bypassGatewayForMeetWs =
    import.meta.env.DEV && isLocalHost && gatewayDevPorts.has(apiPort);
  const coreDevPort =
    (import.meta.env.VITE_CORE_DEV_PORT as string | undefined)?.trim() || '8001';

  let host: string;
  if (isLocalHost) {
    if (bypassGatewayForMeetWs) {
      host = `${apiUrl.hostname}:${coreDevPort}`;
    } else {
      host = `${apiUrl.hostname}:${apiUrl.port || (protocol === 'wss:' ? '443' : '8001')}`;
    }
  } else {
    host = apiUrl.host;
  }

  return `${protocol}//${host}${path}${suffix}`;
}

export interface SaturnoMeetChatIncoming {
  id: string;
  author: string;
  content: string;
  clientId?: string;
  createdAt?: string;
  /** Presente apenas em mensagens de chat explícito; ausente = chat (retrocompat). */
  type?: 'chat';
}

export interface SaturnoMeetCaptionIncoming {
  type: 'caption';
  speaker: string;
  text: string;
  lang: string;
  ts: string;
}

export interface UseSaturnoMeetChatWebSocketOptions {
  roomPublicId: string;
  joinSecret: string | null;
  onIncomingMessage: (msg: SaturnoMeetChatIncoming) => void;
  /** Chamado quando chega um segmento de closed caption. */
  onIncomingCaption?: (seg: SaturnoMeetCaptionIncoming) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useSaturnoMeetChatWebSocket({
  roomPublicId,
  joinSecret,
  onIncomingMessage,
  onIncomingCaption,
  autoReconnect = true,
  reconnectInterval = 3000,
}: UseSaturnoMeetChatWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** false durante disconnect intencional (unmount) — evita reconectar após cleanup. */
  const shouldReconnectRef = useRef(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handlerRef = useRef(onIncomingMessage);
  useEffect(() => {
    handlerRef.current = onIncomingMessage;
  }, [onIncomingMessage]);

  const captionHandlerRef = useRef(onIncomingCaption);
  useEffect(() => {
    captionHandlerRef.current = onIncomingCaption;
  }, [onIncomingCaption]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'client_disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    const id = roomPublicId?.trim();
    if (!id) {
      console.debug('saturno_meet_chat_ws.skip_no_room');
      return;
    }

    const token = getStoredToken();
    if (!joinSecret && !token) {
      console.debug('saturno_meet_chat_ws.skip_no_auth');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.debug('saturno_meet_chat_ws.already_open');
      return;
    }

    shouldReconnectRef.current = true;

    const params = new URLSearchParams();
    if (joinSecret) params.set('join', joinSecret);
    else if (token) params.set('access_token', token);

    try {
      const wsUrl = buildSaturnoMeetChatWsUrl(id, params);
      const masked = wsUrl.replace(/([?&])(access_token|join)=([^&]+)/gi, (_, sep, k) => `${sep}${k}=***`);
      console.debug('saturno_meet_chat_ws.connecting', { url: masked });

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.debug('saturno_meet_chat_ws.open');
        setIsConnected(true);
        setConnectionError(null);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SaturnoMeetChatIncoming | SaturnoMeetCaptionIncoming;
          if (data?.type === 'caption') {
            captionHandlerRef.current?.(data as SaturnoMeetCaptionIncoming);
            return;
          }
          const chatMsg = data as SaturnoMeetChatIncoming;
          if (!chatMsg?.content?.trim()) return;
          handlerRef.current(chatMsg);
        } catch (e) {
          console.error('saturno_meet_chat_ws.parse_error', {
            error: e instanceof Error ? e.message : String(e),
          });
        }
      };

      ws.onerror = () => {
        console.debug('saturno_meet_chat_ws.error (detalhes em onclose)');
        setConnectionError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        if (event.code !== 1000) {
          console.warn('saturno_meet_chat_ws.closed', {
            code: event.code,
            reason: event.reason || '—',
          });
        }
        setIsConnected(false);
        wsRef.current = null;

        if (autoReconnect && shouldReconnectRef.current && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('saturno_meet_chat_ws.connect_error', {
        error: error instanceof Error ? error.message : String(error),
      });
      setConnectionError(String(error));
    }
  }, [roomPublicId, joinSecret, autoReconnect, reconnectInterval]);

  const sendPayload = useCallback((payload: Record<string, unknown>): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }
    console.warn('saturno_meet_chat_ws.send_skipped_not_connected');
    return false;
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomPublicId, joinSecret]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    sendPayload,
  };
}
