import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { useIsMobile } from "../hooks/use-mobile";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  API_ENDPOINTS,
  getAuthHeaders,
  API_BASE_URL,
} from "../config/api";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  MessageSquare,
  Search,
  X,
  Power,
  Plus,
  Clock,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  AlertCircle,
  MoreVertical,
  Unlock,
  UserCheck,
  Lock,
  CheckCircle,
  ArrowLeft,
  Mic,
  Square,
  Play,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import NewConversationModal from "../components/NewConversationModal";
import ImportContactsModal from "../components/ImportContactsModal";

// Interfaces
interface Message {
  id?: string;
  role: "user" | "assistant" | "agent";
  content: string;
  timestamp: Date;
  images?: string[]; // ✅ URLs de imagens
  audioUrl?: string; // ✅ URL do áudio (object URL) para mensagens de voz
  metadata?: {
    chunks_used?: number;
    latency_ms?: number;
    confidence?: number;
    session_id?: string;
    session_status?: string;
    agent_id?: string;
    is_marker?: boolean;
  };
}

// ✅ Utility: Extract image URLs from text
function extractImageUrls(text: string): string[] {
  const images: string[] = [];
  
  // 1. Extract from markdown: ![alt](url)
  const markdownPattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownPattern.exec(text)) !== null) {
    const url = match[2];
    if (url && url.trim() && !images.includes(url.trim())) {
      images.push(url.trim());
    }
  }
  
  // 2. Extract from HTML: <img src="url">
  const htmlPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = htmlPattern.exec(text)) !== null) {
    const url = match[1];
    if (url && url.trim() && !images.includes(url.trim())) {
      images.push(url.trim());
    }
  }
  
  // 3. Extract plain image URLs (http/https with image extensions)
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?[^\s]*)?/i;
  const urlPattern = /https?:\/\/[^\s<>"\'\)]+/g;
  while ((match = urlPattern.exec(text)) !== null) {
    const url = match[0];
    if (url && imageExtensions.test(url) && !images.includes(url.trim())) {
      images.push(url.trim());
    }
  }
  
  return images;
}

// ✅ Utility: Parse message content into text and image segments
interface ContentSegment {
  type: "text" | "image";
  content: string;
}

function parseMessageContent(
  content: string,
  images?: string[]
): ContentSegment[] {
  const segments: ContentSegment[] = [];

  // Find all image references in the text (markdown, HTML, or plain URLs)
  const imagePatterns: Array<{
    pattern: RegExp;
    extractUrl: (match: RegExpMatchArray) => string;
  }> = [
    // Markdown: ![alt](url)
    {
      pattern: /!\[([^\]]*)\]\(([^)]+)\)/g,
      extractUrl: (match) => match[2],
    },
    // HTML: <img src="url">
    {
      pattern: /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
      extractUrl: (match) => match[1],
    },
    // Plain image URLs
    {
      pattern:
        /(https?:\/\/[^\s<>"\'\)]+\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?[^\s<>"\'\)]*)?)/gi,
      extractUrl: (match) => match[0],
    },
  ];

  // Find all image positions in the text
  const imageMatches: Array<{ url: string; start: number; end: number }> = [];
  const foundImageUrls = new Set<string>();

  for (const { pattern, extractUrl } of imagePatterns) {
    let match;
    pattern.lastIndex = 0; // Reset regex
    while ((match = pattern.exec(content)) !== null) {
      const url = extractUrl(match);
      // ✅ Show image if it's in the images array OR if it's a valid image URL in the text
      const isValidImageUrl = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?[^\s]*)?/i.test(url);
      const shouldInclude = !images || images.length === 0 
        ? isValidImageUrl  // If no images array, extract from text
        : images.includes(url) || isValidImageUrl; // If images array exists, prefer it but also extract from text
      
      if (shouldInclude && !foundImageUrls.has(url)) {
        imageMatches.push({
          url,
          start: match.index,
          end: match.index + match[0].length,
        });
        foundImageUrls.add(url);
      }
    }
  }

  // Sort by position
  imageMatches.sort((a, b) => a.start - b.start);

  // Build segments
  let lastIndex = 0;
  for (const imgMatch of imageMatches) {
    // Add text before image
    if (imgMatch.start > lastIndex) {
      let textBefore = content.substring(lastIndex, imgMatch.start).trim();
      
      // ✅ Remove placeholder text patterns like "[Foto do primeiro imóvel]" when followed by image
      // Patterns: [Foto...], [Imagem...], [Image...], etc.
      textBefore = textBefore.replace(
        /^\s*\[(Foto|Imagem|Image|Picture|Foto do|Imagem do|Image of)[^\]]*\]\s*$/i,
        ''
      ).trim();
      
      if (textBefore) {
        segments.push({ type: "text", content: textBefore });
      }
    }

    // Add image
    segments.push({ type: "image", content: imgMatch.url });
    lastIndex = imgMatch.end;
  }

  // Add remaining text (only if we processed some images and have remaining text)
  if (lastIndex > 0 && lastIndex < content.length) {
    const textAfter = content.substring(lastIndex).trim();
    if (textAfter) {
      segments.push({ type: "text", content: textAfter });
    }
  }

  // ✅ If no image matches were found, we need to add the content (but only once!)
  if (imageMatches.length === 0) {
    // Only add content if we haven't added it yet (lastIndex === 0 means no images were processed)
    if (segments.length === 0) {
      segments.push({ type: "text", content });
    }
    // If we have images in the array that weren't found in text, add them
    if (images && images.length > 0) {
      for (const imgUrl of images) {
        if (!foundImageUrls.has(imgUrl)) {
          segments.push({ type: "image", content: imgUrl });
        }
      }
    }
  } else {
    // ✅ We found images via regex, but check if we have additional images in the array
    if (images && images.length > 0) {
      for (const imgUrl of images) {
        if (!foundImageUrls.has(imgUrl)) {
          segments.push({ type: "image", content: imgUrl });
        }
      }
    }
  }

  return segments;
}

interface ConversationMessage {
  id: string;
  user_message: string;
  assistant_message: string;
  agent_message?: string; // Mensagem enviada por especialista
  agent_id?: string; // ID do especialista que enviou
  channel: string;
  timestamp: string;
}

interface ConversationSession {
  id: string;
  company_id: string;
  user_id: string | null;
  status: "active" | "waiting_response" | "ended" | "resolved";
  channel: string;
  availability?: "blocked" | "available" | "assumed"; // Status de disponibilidade para especialista
  assumed_by?: string | null; // ID do especialista que assumiu a sessão
  message_count: number;
  started_at: string;
  ended_at: string | null;
  last_interaction_at: string;
  external_reference: any;
  metadata: any;

  // Campos enriquecidos de external_references
  user_display_name?: string; // Nome do usuário externo ou "Anônimo"
  avatar_url?: string;
  source?: string; // origem do canal (ex.: web, whatsapp)
  external_channel?: string; // web, whatsapp, email
  timezone?: string;
  language?: string;
}

interface SessionWithMessages {
  session: ConversationSession;
  messages: ConversationMessage[];
}

export default function ChatUnified() {
  useRequireAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { currentWorkspace, availableWorkspaces } = useWorkspace();

  // Estados do Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(() => {
    return localStorage.getItem("nyoka_session_id");
  });

  // Estados das Conversas
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sessions, setSessions] = useState<SessionWithMessages[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Estado para controlar se está visualizando histórico ou chat ativo
  const [isViewingHistory, setIsViewingHistory] = useState(false);

  // Estados para assumir conversas
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [assumingSession, setAssumingSession] = useState<string | null>(null);
  const [confirmAssumeSession, setConfirmAssumeSession] = useState<
    string | null
  >(null);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [agentMessage, setAgentMessage] = useState("");
  const [sendingAgentMessage, setSendingAgentMessage] = useState(false);
  // ✅ Estado para rastrear sessões assumidas por mim (para evitar condição de corrida)
  const [myAssumedSessions, setMyAssumedSessions] = useState<string[]>([]);
  const [releasingSession, setReleasingSession] = useState<string | null>(null);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryModalText, setSummaryModalText] = useState("");
  const [summaryModalLoading, setSummaryModalLoading] = useState(false);

  // Estado para controlar navegação mobile (lista ou chat)
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Estados para modais de contatos
  const [showNewConversationModal, setShowNewConversationModal] =
    useState(false);
  const [showImportContactsModal, setShowImportContactsModal] = useState(false);

  useEffect(() => {
    if (availableWorkspaces.length > 1 && !currentWorkspace) {
      navigate("/workspaces", { replace: true });
    }
  }, [availableWorkspaces.length, currentWorkspace, navigate]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioBlobsRef = useRef<Record<string, Blob>>({});
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [transcribingId, setTranscribingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Evita GET /messages em loop: só recarregar quando selectedSession mudar para outra sessão. */
  const lastLoadedSessionIdRef = useRef<string | null>(null);

  // ============================================
  // 🔌 WEBSOCKET (TEMPO REAL - WHATSAPP STYLE)
  // ============================================
  const { isConnected: wsConnected } = useWebSocket({
    companyId: companyId || "",
    onNewConversation: (data) => {
      console.debug("ws.new_conversation", { sessionId: data?.session_id });
      // Recarregar sessões para mostrar a nova conversa
      fetchSessions(false);
    },
    onNewMessage: (data) => {
      console.debug("ws.new_message", { sessionId: data?.session_id });

      // ✅ ATUALIZAÇÃO INSTANTÂNEA (WhatsApp-style): Adicionar mensagem diretamente ao estado
      // Comparar session_id como string (garantir que ambos sejam strings)
      const currentSessionId = selectedSession ? String(selectedSession) : null;
      const messageSessionId = data.session_id ? String(data.session_id) : null;

      if (currentSessionId === messageSessionId) {
        // Adicionar mensagem diretamente ao estado (sem fazer GET)
        const newMessage: Message = {
          role: data.sender === "user" ? "user" : "assistant",
          content: data.content,
          timestamp: new Date(data.timestamp || Date.now()),
          metadata: {
            message_id: data.message_id,
          },
        };

        // Verificar se a mensagem já não existe (evitar duplicatas)
        setMessages((prev) => {
          const exists = prev.some((m) => {
            // Verificar por conteúdo e timestamp (dentro de 2 segundos)
            const timeDiff = Math.abs(
              m.timestamp.getTime() - newMessage.timestamp.getTime()
            );
            return m.content === newMessage.content && timeDiff < 2000;
          });

          if (exists) {
            console.debug("ws.message_duplicate_ignored");
            return prev;
          }

          console.debug("ws.message_added");
          return [...prev, newMessage];
        });

        // Scroll automático para a nova mensagem (usar o ref existente)
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        // Se não estiver vendo a sessão, apenas atualizar contador
        console.debug("ws.session_counter_updated", { sessionId: messageSessionId });
        setSessions((prev) =>
          prev.map((s) => {
            if (String(s.session.id) === messageSessionId) {
              return {
                ...s,
                session: {
                  ...s.session,
                  message_count: (s.session.message_count || 0) + 1,
                },
              };
            }
            return s;
          })
        );
      }
    },
    onStatusUpdate: (data) => {
      console.debug("ws.status_updated", { sessionId: data?.session_id, status: data?.status });
      // Atualizar sessão específica
      setSessions((prev) =>
        prev.map((s) =>
          s.session.id === data.session_id
            ? { ...s, session: { ...s.session, status: data.status } }
            : s
        )
      );
    },
    onConnected: () => {
      console.debug("ws.connected");
    },
    onDisconnected: () => {
      console.debug("ws.disconnected");
    },
    autoReconnect: true,
    reconnectInterval: 3000,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Buscar sessões de conversação
  const fetchSessions = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setSessionsLoading(true);
      }
      setError(null);

      const headers = getAuthHeaders();
      const meRes = await fetch(API_ENDPOINTS.auth.me, { headers });

      if (!meRes.ok) {
        throw new Error(t("chat.errors.sessionExpired"));
      }

      const userData = await meRes.json();
      const userCompanyId = currentWorkspace?.id ?? userData.company_id;
      const userId = userData.user_id || userData.id; // Backend retorna 'user_id', mas mantém fallback para 'id'

      if (!userCompanyId) {
        throw new Error(t("chat.errors.noCompany"));
      }

      if (!userId) {
        console.error("chat.auth_user_id_missing", { hasCompanyId: !!userData?.company_id });
        throw new Error(t("chat.errors.errorUserId"));
      }

      setCompanyId(userCompanyId);
      setCurrentUserId(userId);
      setUserRoles(userData.roles || []);

      // ✅ Endpoint que já traz sessões + mensagens + dados enriquecidos
      const historyRes = await fetch(
        API_ENDPOINTS.chat.history(userCompanyId, true, 100),
        { headers }
      );

      if (!historyRes.ok) {
        throw new Error(t("chat.errors.errorLoadSessions"));
      }

      const sessionsData: SessionWithMessages[] = await historyRes.json();
      setSessions(sessionsData);
    } catch (err: any) {
      console.error("chat.load_sessions_error", { error: err instanceof Error ? err.message : String(err) });
      setError(err.message || t("chat.errors.errorLoadSessions"));
    } finally {
      if (showLoading) {
        setSessionsLoading(false);
      }
    }
  }, [currentWorkspace?.id, t]);

  // Carregar mensagens de uma sessão existente
  // DEVE ser definido antes dos useEffect que o usam
  const loadSessionMessages = useCallback(
    async (sessionId: string) => {
      try {
        setLoading(true);
        setError(null);
        const headers = getAuthHeaders();

        // Primeiro, tentar encontrar a sessão nos dados já carregados
        let sessionData = sessions.find((s) => s.session.id === sessionId);

        // Se não encontrar e tiver companyId, buscar do histórico
        if (!sessionData && companyId) {
          const historyRes = await fetch(
            API_ENDPOINTS.chat.history(companyId, true, 100),
            { headers }
          );
          if (historyRes.ok) {
            const sessionsData: SessionWithMessages[] = await historyRes.json();
            sessionData = sessionsData.find((s) => s.session.id === sessionId);
            // Atualizar lista de sessões se encontrou
            if (sessionData) {
              setSessions((prev) => {
                const exists = prev.find((s) => s.session.id === sessionId);
                if (!exists) {
                  return [sessionData!, ...prev];
                }
                return prev;
              });
            }
          }
        }

        // Se ainda não encontrou, buscar mensagens diretamente
        const res = await fetch(API_ENDPOINTS.chat.sessionMessages(sessionId), {
          headers,
        });

        if (!res.ok) {
          throw new Error(t("chat.errors.errorLoadMessages"));
        }

        const messagesData: ConversationMessage[] = await res.json();

        // Converter mensagens da sessão para o formato do chat
        const chatMessages: Message[] = [];

        messagesData.forEach((msg) => {
          // Mensagem do especialista (agent_id presente)
          if (msg.agent_message && msg.agent_id) {
            // Ignorar a mensagem marcadora "[Conversa assumida por especialista]" apenas na exibição
            // Mas manter na lista de mensagens para que assumedByMeMap funcione
            if (msg.agent_message !== "[Conversa assumida por especialista]") {
              chatMessages.push({
                role: "agent",
                content: msg.agent_message,
                timestamp: new Date(msg.timestamp),
                metadata: {
                  agent_id: msg.agent_id,
                },
              });
            } else {
              // Mensagem marcadora: não exibir, mas incluir nos metadados para verificação
              chatMessages.push({
                role: "agent",
                content: "", // Vazio para não exibir
                timestamp: new Date(msg.timestamp),
                metadata: {
                  agent_id: msg.agent_id,
                  is_marker: true, // Flag para identificar mensagem marcadora
                },
              });
            }
          } else {
            // Mensagens normais (cliente e LLM)
            if (msg.user_message) {
              chatMessages.push({
                role: "user",
                content: msg.user_message,
                timestamp: new Date(msg.timestamp),
              });
            }
            // ✅ Filtrar mensagens vazias do assistente (status messages como "[Availability assumed - LLM bloqueada]")
            if (
              msg.assistant_message &&
              msg.assistant_message.trim() &&
              !msg.assistant_message.includes("[Availability") &&
              !msg.assistant_message.includes("- LLM bloqueada")
            ) {
              // ✅ Extrair imagens do conteúdo da mensagem
              const extractedImages = extractImageUrls(msg.assistant_message);
              
              chatMessages.push({
                role: "assistant",
                content: msg.assistant_message,
                images: extractedImages.length > 0 ? extractedImages : undefined,
                timestamp: new Date(msg.timestamp),
              });
            }
          }
        });

        setMessages(chatMessages);
        setChatSessionId(sessionId);
        // Só atualizar localStorage se a sessão não estiver encerrada
        if (sessionData?.session.status !== "ended") {
          localStorage.setItem("nyoka_session_id", sessionId);
        }
        setIsViewingHistory(true);
        setSelectedSession(sessionId);
      } catch (err: any) {
        console.error("chat.load_session_error", { error: err instanceof Error ? err.message : String(err) });
        setError(err.message || t("chat.errors.errorLoadSession"));
        lastLoadedSessionIdRef.current = null;
      } finally {
        setLoading(false);
      }
    },
    [sessions, companyId]
  );

  // Criar nova conversa (sem seleção de contato - usado quando conversa encerrada)
  // DEVE ser definido antes dos useEffect que o usam
  const createNewChat = useCallback(() => {
    setMessages([
      {
        role: "assistant",
        content:
          t("chat.welcomeMessage"),
        timestamp: new Date(),
      },
    ]);
    setChatSessionId(null);
    localStorage.removeItem("nyoka_session_id");
    setIsViewingHistory(false);
    setSelectedSession(null);
    setInput("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handler para selecionar contato e iniciar conversa
  const handleSelectContact = useCallback(async (contact: any) => {
    // TODO: Implementar lógica para criar sessão com o contato selecionado
    // Por enquanto, apenas cria uma nova conversa genérica
    setMessages([
      {
        role: "assistant",
        content: t("chat.welcomeMessage"),
        timestamp: new Date(),
      },
    ]);
    setInput("");
    setLoading(false);
    setSelectedSession(null);
    setChatSessionId(null);
    localStorage.removeItem("nyoka_session_id");
    setIsViewingHistory(false);

    // Fechar modal
    setShowNewConversationModal(false);
  }, []);

  // Handler para importar contatos
  const handleImportContacts = useCallback(() => {
    setShowNewConversationModal(false);
    setShowImportContactsModal(true);
  }, []);

  // Handler quando importação completa
  const handleImportComplete = useCallback(() => {
    // Recarregar contatos se necessário
    // Por enquanto, apenas fecha o modal
    setShowImportContactsModal(false);
    // Reabrir modal de nova conversa para mostrar contatos importados
    setTimeout(() => {
      setShowNewConversationModal(true);
    }, 500);
  }, []);

  // Carregar sessões na montagem
  useEffect(() => {
    fetchSessions(true); // Mostrar loading na primeira carga
  }, [fetchSessions]);

  // ✅ Polling removido - Atualiza apenas mediante interação do usuário
  // Atualiza quando:
  // 1. Componente monta (useEffect acima)
  // 2. Usuário envia mensagem (handleSendMessage)
  // 3. Usuário seleciona outra sessão
  // Antes: polling automático a cada 5s (causava centenas de requests desnecessários)

  // ✅ Único ponto que dispara GET /messages: só quando selectedSession muda (clique ou restore).
  // WebSocket new_message adiciona mensagem ao estado sem refetch. Ref evita loop/duplicata.
  useEffect(() => {
    if (!selectedSession) return;
    if (lastLoadedSessionIdRef.current === selectedSession) return;

    lastLoadedSessionIdRef.current = selectedSession;
    loadSessionMessages(selectedSession);
  }, [selectedSession]);

  // ✅ Restore: ao carregar sessões, selecionar sessão do localStorage (o efeito [selectedSession] fará o GET)
  // Não chamar loadSessionMessages aqui para evitar dupla requisição e burst de requests
  useEffect(() => {
    if (sessionsLoading || loading) return;
    if (sessions.length === 0) return;

    if (chatSessionId && messages.length === 0) {
      const existingSession = sessions.find(
        (s) => s.session.id === chatSessionId
      );
      if (existingSession) {
        setSelectedSession(chatSessionId);
      }
    } else if (!chatSessionId && messages.length === 0) {
      createNewChat();
    }
  }, [sessionsLoading, loading]);

  // Encerrar chat
  const endChat = async () => {
    if (!chatSessionId) return;

    try {
      const headers = getAuthHeaders();
      const res = await fetch(
        `${API_BASE_URL}/chat/sessions/${chatSessionId}/end`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        // Atualizar status da sessão localmente
        setSessions((prev) =>
          prev.map((s) => {
            if (s.session.id === chatSessionId) {
              return {
                ...s,
                session: {
                  ...s.session,
                  status: "ended" as const,
                  ended_at: new Date().toISOString(),
                },
              };
            }
            return s;
          })
        );

        // Atualizar sessão selecionada também
        if (selectedSession === chatSessionId) {
          setSelectedSession(chatSessionId); // Manter selecionada, mas agora como encerrada
        }

        // Recarregar sessões do backend para garantir sincronização (sem loading)
        await fetchSessions(false);
      } else {
        const error = await res.json();
        setError(error.detail || t("chat.errors.errorEndChat"));
      }
    } catch (err: any) {
      console.error("chat.end_chat_error", { error: err instanceof Error ? err.message : String(err) });
      setError(err.message || t("chat.errors.errorEndChat"));
    }
  };

  // Selecionar conversa (só atualiza selectedSession; o efeito [selectedSession] faz o GET)
  const handleSelectSession = (sessionId: string) => {
    setSelectedSession(sessionId);
    if (isMobile) {
      setMobileView("chat");
    }
  };

  // Voltar para lista no mobile
  const handleBackToList = () => {
    setMobileView("list");
    setSelectedSession(null);
  };

  // Verificar se usuário pode assumir conversas
  const canAssumeConversations = useMemo(() => {
    return (
      userRoles.includes("admin") ||
      userRoles.includes("superadmin") ||
      userRoles.includes("operator") ||
      userRoles.includes("viewer")
    );
  }, [userRoles]);

  // Sessão selecionada
  const selectedSessionData = useMemo(() => {
    if (!selectedSession) return null;
    return sessions.find((s) => s.session.id === selectedSession);
  }, [sessions, selectedSession]);

  // Mapa de sessões assumidas por mim (memoizado para evitar problemas de inicialização)
  // DEVE ser declarado antes de qualquer uso para evitar erros de inicialização
  // Inicializar com objeto vazio válido para garantir sempre uma referência estável
  const assumedByMeMap: Record<string, boolean> = useMemo(() => {
    const map: Record<string, boolean> = {};

    // Retornar objeto vazio se não houver condições necessárias
    if (
      !currentUserId ||
      !sessions ||
      !Array.isArray(sessions) ||
      sessions.length === 0
    ) {
      return map;
    }

    // Normalizar currentUserId para string para comparação consistente
    const currentUserIdStr = String(currentUserId);

    // Processar cada sessão
    for (const sessionData of sessions) {
      if (!sessionData || !sessionData.session) continue;

      if (sessionData.session.availability === "assumed") {
        // ✅ Prioridade 1: Verificar campo assumed_by da sessão (mais confiável)
        const assumedBy = sessionData.session.assumed_by;

        if (assumedBy) {
          const assumedByStr = String(assumedBy).trim();
          const currentUserIdStrTrimmed = currentUserIdStr.trim();

          if (assumedByStr === currentUserIdStrTrimmed) {
            map[sessionData.session.id] = true;
            continue;
          }
        }

        // ✅ Prioridade 2: Verificar se está no estado local (recém assumida)
        const isInLocalState =
          Array.isArray(myAssumedSessions) &&
          myAssumedSessions.includes(sessionData.session.id);
        if (isInLocalState) {
          map[sessionData.session.id] = true;
          continue;
        }

        // ✅ Prioridade 3: Verificar se há mensagem com meu agent_id (comparação normalizada)
        const hasMyMessage =
          Array.isArray(sessionData.messages) &&
          sessionData.messages.some((msg) => {
            if (!msg || !msg.agent_id) return false;
            return String(msg.agent_id) === currentUserIdStr;
          });

        map[sessionData.session.id] = hasMyMessage;
      } else {
        map[sessionData.session.id] = false;
      }
    }

    return map;
  }, [sessions, currentUserId, myAssumedSessions]);

  // Verificar se a conversa está assumida pelo usuário atual (verificação direta e simples)
  const isAssumedByMe = useMemo(() => {
    if (!selectedSessionData || !currentUserId) {
      return false;
    }

    const session = selectedSessionData.session;

    if (session.availability !== "assumed") {
      return false;
    }

    // ✅ Verificação direta: assumed_by === currentUserId
    const assumedByStr = session.assumed_by
      ? String(session.assumed_by).trim()
      : null;
    const currentUserIdStr = String(currentUserId).trim();

    if (assumedByStr && assumedByStr === currentUserIdStr) {
      return true;
    }

    // ✅ Fallback: verificar se está no estado local (recém assumida)
    if (myAssumedSessions.includes(session.id)) {
      return true;
    }

    // ✅ Fallback: verificar mensagens com meu agent_id
    const hasMyMessage =
      selectedSessionData.messages?.some(
        (msg) =>
          msg.agent_id && String(msg.agent_id).trim() === currentUserIdStr
      ) || false;

    return hasMyMessage;
  }, [selectedSessionData, currentUserId, myAssumedSessions]);

  // Verificar se o input está bloqueado
  // Regra: active + assumed + assumed_by === currentUserId = DESBLOQUEADO
  const isInputBlocked = useMemo(() => {
    // Se não há sessão selecionada, não bloquear (pode criar nova conversa)
    if (!selectedSessionData) return false;

    const session = selectedSessionData.session;

    // ✅ DESBLOQUEAR se: status === 'active' E availability === 'assumed' E assumed_by === currentUserId
    if (
      session.status === "active" &&
      session.availability === "assumed" &&
      isAssumedByMe
    ) {
      return false; // DESBLOQUEADO - posso enviar mensagens
    }

    // Bloquear em todos os outros casos: available, blocked, assumed por outro, ou status !== 'active'
    return true;
  }, [selectedSessionData, isAssumedByMe]);

  // Assumir conversa
  const handleAssumeSession = async (sessionId: string) => {
    try {
      setAssumingSession(sessionId);
      setError(null);
      setConfirmAssumeSession(null);
      setShowActionsMenu(null);

      const headers = getAuthHeaders();
      const res = await fetch(
        `${API_BASE_URL}/chat/sessions/${sessionId}/assume`,
        {
          method: "POST",
          headers,
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || t("chat.errors.errorAssume"));
      }

      const assumeResponse = await res.json();
      const returnedAgentId = assumeResponse.agent_id;

      // ✅ SEMPRE atualizar estado local quando assumir (não depende de comparação)
      // O backend já valida que é o usuário autenticado que está assumindo
      setMyAssumedSessions((prev) =>
        prev.includes(sessionId) ? prev : [...prev, sessionId]
      );

      // ✅ Atualizar sessão no estado local com assumed_by (usar returnedAgentId do backend)
      const assumedById = String(returnedAgentId || currentUserId).trim();
      setSessions((prev) =>
        prev.map((s) => {
          if (s.session.id === sessionId) {
            return {
              ...s,
              session: {
                ...s.session,
                availability: "assumed" as const,
                assumed_by: assumedById,
              },
            };
          }
          return s;
        })
      );

      setSelectedSession(sessionId);
      await fetchSessions(false);
      // Mensagens são carregadas pelo efeito [selectedSession] (único ponto de GET)
    } catch (err: any) {
      console.error("chat.assume_error", { error: err instanceof Error ? err.message : String(err) });
      setError(err.message || t("chat.errors.errorAssume"));
    } finally {
      setAssumingSession(null);
    }
  };

  /** Devolver conversa à IA (paridade Nyoka — mesmo core: POST .../release) */
  const handleReleaseSession = async (sessionId: string) => {
    try {
      setReleasingSession(sessionId);
      setError(null);
      setShowActionsMenu(null);
      const headers = getAuthHeaders();
      const res = await fetch(API_ENDPOINTS.chat.sessionRelease(sessionId), {
        method: "POST",
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { detail?: string }).detail || t("chat.errors.errorRelease")
        );
      }
      setMyAssumedSessions((prev) => prev.filter((id) => id !== sessionId));
      setSessions((prev) =>
        prev.map((s) =>
          s.session.id === sessionId
            ? {
                ...s,
                session: {
                  ...s.session,
                  availability: "available" as const,
                  assumed_by: null,
                },
              }
            : s
        )
      );
      await fetchSessions(false);
    } catch (err: unknown) {
      console.error("chat.release_error", {
        error: err instanceof Error ? err.message : String(err),
      });
      setError(
        err instanceof Error ? err.message : t("chat.errors.errorRelease")
      );
    } finally {
      setReleasingSession(null);
    }
  };

  /** Resumo da conversa (paridade Nyoka — POST .../summary) */
  const handleOpenSummary = async (sessionId: string) => {
    setSummaryModalOpen(true);
    setSummaryModalText("");
    setSummaryModalLoading(true);
    setShowActionsMenu(null);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(API_ENDPOINTS.chat.sessionSummary(sessionId), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { detail?: string }).detail || t("chat.errors.errorSummary")
        );
      }
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const text =
        (typeof data.summary === "string" && data.summary) ||
        (typeof data.text === "string" && data.text) ||
        (typeof data.message === "string" && data.message) ||
        "";
      setSummaryModalText(text.trim() || t("chat.summaryEmpty"));
    } catch (err: unknown) {
      setSummaryModalText(
        err instanceof Error ? err.message : t("chat.errors.errorSummary")
      );
    } finally {
      setSummaryModalLoading(false);
    }
  };

  // Enviar mensagem como especialista
  const handleSendAgentMessage = async (sessionId: string) => {
    if (!agentMessage.trim() || sendingAgentMessage) return;

    const message = agentMessage.trim();
    console.debug("chat.agent_message_send", { sessionId, messageLength: message.length });

    setAgentMessage("");
    setSendingAgentMessage(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const url = `${API_BASE_URL}/chat/sessions/${sessionId}/agent-message`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("chat.agent_message_response_error", { status: res.status, detail: error?.detail });
        throw new Error(error.detail || t("chat.errors.errorSendMessage"));
      }

      const responseData = await res.json();

      await fetchSessions(false);
      lastLoadedSessionIdRef.current = sessionId;
      await loadSessionMessages(sessionId);
    } catch (err: any) {
      console.error("chat.agent_message_send_error", { error: err instanceof Error ? err.message : String(err) });
      setError(err.message || t("chat.errors.errorSendMessage"));
    } finally {
      setSendingAgentMessage(false);
    }
  };

  // Verificar se a sessão atual está encerrada
  const isSessionEnded = useMemo(() => {
    const sessionIdToCheck = selectedSession || chatSessionId;
    if (!sessionIdToCheck) return false;
    const sessionData = sessions.find((s) => s.session.id === sessionIdToCheck);
    return sessionData?.session.status === "ended";
  }, [selectedSession, chatSessionId, sessions]);

  // Enviar mensagem
  const sendMessage = async () => {
    if (!input.trim() || loading || isSessionEnded) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    const currentInput = input;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setIsViewingHistory(false); // Ao enviar, sai do modo histórico

    try {
      const headers = getAuthHeaders();
      const meRes = await fetch(API_ENDPOINTS.auth.me, { headers });

      if (!meRes.ok) {
        throw new Error(t("chat.errors.sessionExpiredShort"));
      }

      const userData = await meRes.json();
      const companyId = currentWorkspace?.id ?? userData.company_id;

      if (!companyId) {
        throw new Error(
          t("chat.errors.noCompanySupport")
        );
      }

      const history = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const requestBody = {
        company_id: companyId,
        message: currentInput,
        conversation_history: history,
        max_context_chunks: 5,
        session_id: chatSessionId || undefined,
        create_new_session: false,
      };

      const res = await fetch(`${API_BASE_URL}/chat/message`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || t("chat.errors.errorSendMessage"));
      }

      const data = await res.json();

      if (data.session_id) {
        setChatSessionId(data.session_id);
        localStorage.setItem("nyoka_session_id", data.session_id);
        lastLoadedSessionIdRef.current = data.session_id;
        setSelectedSession(data.session_id);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        images: data.images || undefined, // ✅ Incluir imagens se houver
        timestamp: new Date(),
        metadata: {
          chunks_used: data.context?.chunks_used,
          latency_ms: data.metadata?.latency_ms,
          confidence: data.metadata?.confidence,
          session_id: data.session_id,
          session_status: data.session_status,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Recarregar sessões após enviar mensagem (sem loading, já há feedback visual)
      await fetchSessions(false);
    } catch (err: any) {
      console.error("chat.send_message_error", { error: err instanceof Error ? err.message : String(err) });

      const errorMessage: Message = {
        role: "assistant",
        content: `❌ Erro: ${
          err.message || t("chat.errors.couldNotProcess")
        }`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Enviar mensagem de voz (áudio gravado)
  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (loading || isSessionEnded) return;
    const headers = getAuthHeaders();
    let companyId: string;
    try {
      const meRes = await fetch(API_ENDPOINTS.auth.me, { headers });
      if (!meRes.ok) throw new Error(t("chat.errors.sessionExpiredShort"));
      const userData = await meRes.json();
      companyId = currentWorkspace?.id ?? userData.company_id;
      if (!companyId) throw new Error(t("chat.errors.noCompanySupport"));
    } catch (err: any) {
      setError(err.message || t("chat.errors.errorLoadSessions"));
      return;
    }
    const messageId = crypto.randomUUID();
    const audioUrl = URL.createObjectURL(audioBlob);
    audioBlobsRef.current[messageId] = audioBlob;
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        role: "user",
        content: "",
        timestamp: new Date(),
        audioUrl,
      },
    ]);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("audio", audioBlob, "voice.webm");
      form.append("company_id", companyId);
      form.append("channel", "voice");
      if (chatSessionId) form.append("session_id", chatSessionId);
      const voiceHeaders = { ...headers };
      delete (voiceHeaders as Record<string, string>)["Content-Type"];
      const res = await fetch(`${API_BASE_URL}/chat/voice`, {
        method: "POST",
        headers: voiceHeaders,
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || t("chat.voiceError"));
      }
      const data = await res.json();
      if (data.session_id) {
        setChatSessionId(data.session_id);
        localStorage.setItem("nyoka_session_id", data.session_id);
        lastLoadedSessionIdRef.current = data.session_id;
        setSelectedSession(data.session_id);
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: data.transcribed_text || m.content }
            : m
        )
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          images: data.images,
          timestamp: new Date(),
          metadata: {
            session_id: data.session_id,
            session_status: data.session_status,
          },
        },
      ]);
      await fetchSessions(false);
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: "" } : m
        )
      );
      setError(err.message || t("chat.voiceError"));
    } finally {
      setLoading(false);
    }
  };

  // Transcrever áudio de uma mensagem (clicar para transcrever)
  const transcribeMessage = async (msg: Message) => {
    if (!msg.id || !msg.audioUrl || transcribingId) return;
    const blob = audioBlobsRef.current[msg.id];
    if (!blob) return;
    setTranscribingId(msg.id);
    try {
      const form = new FormData();
      form.append("audio", blob, "audio.webm");
      const headers = getAuthHeaders();
      const transcribeHeaders = { ...headers };
      delete (transcribeHeaders as Record<string, string>)["Content-Type"];
      const res = await fetch(`${API_BASE_URL}/chat/transcribe`, {
        method: "POST",
        headers: transcribeHeaders,
        body: form,
      });
      if (!res.ok) throw new Error(t("chat.voiceError"));
      const data = await res.json();
      const text = (data.text || "").trim();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, content: text } : m
        )
      );
    } catch {
      setError(t("chat.voiceError"));
    } finally {
      setTranscribingId(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) sendVoiceMessage(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch {
      setError(t("chat.voiceError"));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Filtrar sessões
  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) {
      return sessions;
    }

    const term = searchTerm.toLowerCase();
    return sessions.filter(
      (sessionData) =>
        sessionData.session.id.toLowerCase().includes(term) ||
        (sessionData.session.user_id &&
          sessionData.session.user_id.toLowerCase().includes(term)) ||
        sessionData.messages.some(
          (msg) =>
            msg.user_message.toLowerCase().includes(term) ||
            msg.assistant_message.toLowerCase().includes(term)
        )
    );
  }, [sessions, searchTerm]);

  // Helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
      case "waiting_response":
        return "text-amber-400 bg-amber-400/10 border-amber-400/30";
      case "ended":
        return "text-gray-400 bg-gray-400/10 border-gray-400/30";
      case "resolved":
        return "text-blue-400 bg-blue-400/10 border-blue-400/30";
      default:
        return "text-gray-400 bg-gray-400/10 border-gray-400/30";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return t("chat.statusActive");
      case "waiting_response":
        return t("chat.statusWaiting");
      case "ended":
        return t("chat.statusEnded");
      case "resolved":
        return t("chat.statusResolved");
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ Formatar timestamp da mensagem (data e hora)
  const formatMessageTimestamp = (timestamp: Date) => {
    const now = new Date();
    const msgDate = new Date(timestamp);
    const diffMs = now.getTime() - msgDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Hoje: apenas hora
    if (diffDays === 0) {
      return msgDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // Ontem
    if (diffDays === 1) {
      return `${t("chat.yesterday")}, ${msgDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    // Esta semana: dia da semana + hora
    if (diffDays < 7) {
      const weekdays = t("chat.weekdays", { returnObjects: true }) as string[];
      return `${weekdays[msgDate.getDay()]}, ${msgDate.toLocaleTimeString(
        "pt-BR",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )}`;
    }

    // Mais antiga: data completa
    return msgDate.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLastMessage = (messages: ConversationMessage[]) => {
    if (messages.length === 0) return null;
    const last = messages[messages.length - 1];
    // Ignorar mensagem marcadora "[Conversa assumida por especialista]"
    if (
      last.agent_message &&
      last.agent_message !== "[Conversa assumida por especialista]"
    ) {
      return last.agent_message;
    }
    return last.assistant_message || last.user_message || last.agent_message;
  };

  // Renderizar lista de conversas (estilo plataforma)
  const renderConversationsList = () => (
    <div className="fixed inset-0 flex flex-col bg-black/80 backdrop-blur-xl z-50">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="w-10">
          {/* Indicador WebSocket (mobile) */}
          {wsConnected ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            </span>
          ) : (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
            </span>
          )}
        </div>
        <h1 className="flex-1 text-center text-xl font-semibold text-white">
          {t("chat.conversations")}
        </h1>
        <div className="w-10 flex justify-end">
          <button
            onClick={() => setShowNewConversationModal(true)}
            className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            title={t("chat.newConversation")}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="px-3 py-2 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <input
            type="text"
            placeholder={t("chat.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/60 focus:outline-none focus:bg-white/10 focus:border-white/20 text-sm transition-all"
          />
        </div>
      </div>

      {/* Lista de Conversas */}
      <div className="flex-1 overflow-y-auto bg-black/80">
        {sessionsLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#EC4899] animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-3 mx-3 mt-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <p className="text-xs text-rose-400">{error}</p>
          </div>
        )}

        {!sessionsLoading && filteredSessions.length === 0 && (
          <div className="text-center py-8 text-white/60">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t("chat.noConversationsFound")}</p>
          </div>
        )}

        <div>
          {!sessionsLoading &&
            filteredSessions.map((sessionData) => {
              const session = sessionData.session;
              const lastMessage = getLastMessage(sessionData.messages);
              const isSelected = selectedSession === session.id;
              const unreadCount =
                session.status === "active" &&
                session.availability === "available"
                  ? 1
                  : 0;

              const isActive = session.id === chatSessionId;
              const isActiveSession = isSelected || isActive;

              return (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={`group relative px-4 py-3 flex items-start gap-3 border-b border-white/10 cursor-pointer transition-all duration-300 ${
                    isActiveSession
                      ? "bg-[#EC4899]/20 text-white"
                      : "bg-transparent hover:bg-white/5 text-white/70"
                  }`}
                >
                  {/* Fade lateral - Rosa para ativa, Cinza para inativa */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full transition-all duration-300 ${
                      isActiveSession
                        ? "bg-gradient-to-b from-[#EC4899] via-pink-500 to-purple-500 shadow-[2px_0_8px_rgba(236,72,153,0.4)]"
                        : "bg-white/20 group-hover:bg-white/30"
                    }`}
                  />

                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-white/70" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h3
                          className={`text-base font-medium truncate ${
                            isSelected ? "text-white" : "text-white/90"
                          }`}
                        >
                          {session.user_display_name ||
                            (session.user_id
                              ? `${t("chat.userLabel")} #${session.user_id.slice(0, 8)}`
                              : `${t("chat.anonymousLabel")} #${session.id.slice(0, 8)}`)}
                        </h3>
                        {session.source && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex-shrink-0">
                            {session.source}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-white/50 ml-2 flex-shrink-0">
                        {formatDate(session.last_interaction_at).split(" ")[1]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm truncate flex-1 ${
                          isSelected ? "text-white/80" : "text-white/60"
                        }`}
                      >
                        {lastMessage || t("chat.noMessage")}
                      </p>
                      {unreadCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-[#EC4899] text-white text-xs font-medium flex-shrink-0 shadow-[0_4px_12px_-4px_rgba(236,72,153,0.6)]">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );

  // Renderizar área de chat
  const renderChatArea = () => (
    <div
      className={`flex flex-col ${
        isMobile
          ? "fixed inset-0 bg-black/80 backdrop-blur-xl z-50"
          : "h-full glass-panel rounded-3xl border border-white/[0.06] p-6"
      } overflow-hidden`}
    >
      {/* Chat Header */}
      <div
        className={`flex items-center justify-between ${
          isMobile
            ? "px-4 py-3 border-b border-white/10"
            : "mb-4 pb-4 border-b border-white/10"
        }`}
      >
        {isMobile && (
          <button
            onClick={handleBackToList}
            className="p-2 -ml-2 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          {selectedSessionData ? (
            <div>
              <div className="flex items-center gap-3">
                {selectedSessionData.session.avatar_url && (
                  <img
                    src={selectedSessionData.session.avatar_url}
                    alt={
                      selectedSessionData.session.user_display_name || t("chat.userLabel")
                    }
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <h3
                  className={`${
                    isMobile
                      ? "text-lg text-white"
                      : "text-lg font-semibold text-white"
                  }`}
                >
                  {selectedSessionData.session.user_display_name ||
                    (selectedSessionData.session.user_id
                      ? `${t("chat.userLabel")} #${selectedSessionData.session.user_id.slice(
                          0,
                          8
                        )}`
                      : `${t("chat.anonymousLabel")} #${selectedSessionData.session.id.slice(
                          0,
                          8
                        )}`)}
                </h3>
                {selectedSessionData.session.source && (
                  <span className="px-2 py-1 rounded-full text-xs border text-blue-300 bg-blue-500/20 border-blue-500/30">
                    {selectedSessionData.session.source}
                  </span>
                )}
                {isSessionEnded && (
                  <span
                    className={`px-2 py-1 rounded-full text-xs border ${
                      isMobile
                        ? "text-white/80 bg-white/20 border-white/30"
                        : "text-gray-400 bg-gray-400/10 border-gray-400/30"
                    }`}
                  >
                    {t("chat.statusEnded")}
                  </span>
                )}
              </div>
              {!isMobile && (
                <p className="text-xs text-gray-400 mt-1">
                  {selectedSessionData.session.message_count} {t("chat.messagesCount")} •{" "}
                  {formatDate(selectedSessionData.session.started_at)}
                </p>
              )}
            </div>
          ) : (
            <div>
              <h3
                className={`${
                  isMobile
                    ? "text-lg text-white"
                    : "text-lg font-semibold text-white"
                }`}
              >
                {t("chat.newConversation")}
              </h3>
              {!isMobile && (
                <p className="text-xs text-gray-400 mt-1">
                  {t("chat.newConversationSubtitle")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages Container - Mobile */}
      {isMobile ? (
        <div className="flex-1 overflow-y-auto space-y-4 px-4 py-4 bg-black/80">
          {messages.length === 0 && !loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Bot className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
                <p className="text-gray-400">
                  {t("chat.selectOrStart")}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, index) => {
            if (msg.metadata?.is_marker) return null;
            if (!msg.content && !msg.audioUrl) return null;

            return (
              <div
                key={msg.id ?? index}
                className={`flex gap-2 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {(msg.role === "assistant" || msg.role === "agent") && (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === "agent"
                        ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                        : "bg-gradient-to-br from-pink-500 to-purple-500"
                    }`}
                  >
                    {msg.role === "agent" ? (
                      <UserCheck className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl overflow-hidden ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-white"
                      : msg.role === "agent"
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-white"
                      : "bg-white/10 border border-white/20 text-white"
                  }`}
                >
                  {msg.role === "agent" && (
                    <p className="text-xs text-emerald-400 font-medium mb-1">
                      {msg.metadata?.agent_id === currentUserId
                        ? t("chat.youExpert")
                        : t("chat.expert")}
                    </p>
                  )}
                  {/* ✅ Mensagem de voz: reproduzir áudio + transcrição */}
                  {msg.role === "user" && msg.audioUrl && (
                    <div className="space-y-2 mb-2">
                      <audio
                        controls
                        src={msg.audioUrl}
                        className="w-full max-w-xs h-8"
                        title={t("chat.voicePlay")}
                      />
                      {msg.content ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => transcribeMessage(msg)}
                          disabled={transcribingId === msg.id}
                          className="flex items-center gap-1.5 text-xs text-pink-300 hover:text-pink-200 transition-colors"
                        >
                          {transcribingId === msg.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              {t("chat.voiceTranscribing")}
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5" />
                              {t("chat.voiceTranscribe")}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  {/* ✅ Renderizar conteúdo com imagens inline (quando não for só voz) */}
                  {!(msg.role === "user" && msg.audioUrl) && (
                  <div className="space-y-2">
                    {parseMessageContent(msg.content || "", msg.images).map(
                      (segment, segIdx) => {
                        if (segment.type === "image") {
                          return (
                            <div
                              key={segIdx}
                              className="rounded-lg overflow-hidden border border-white/10 my-2"
                            >
                              <img
                                src={segment.content}
                                alt={`${t("chat.imageAlt")} ${segIdx + 1}`}
                                className="w-full h-auto max-h-96 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            </div>
                          );
                        }
                        return (
                          <p
                            key={segIdx}
                            className="text-sm leading-relaxed whitespace-pre-wrap break-words break-all"
                          >
                            {segment.content}
                          </p>
                        );
                      }
                    )}
                  </div>
                  )}
                  {/* ✅ Data e hora da mensagem */}
                  <p className="text-xs text-white/40 mt-1">
                    {formatMessageTimestamp(msg.timestamp)}
                  </p>
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/20">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-[#EC4899] animate-spin" />
                  <span className="text-xs text-white/80">{t("chat.processing")}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0">
          {messages.length === 0 && !loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Bot className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
                <p className="text-gray-400">
                  {t("chat.selectOrStart")}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, index) => {
            if (msg.metadata?.is_marker) return null;
            if (!msg.content && !msg.audioUrl) return null;

            return (
              <div
                key={msg.id ?? index}
                className={`flex gap-4 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {(msg.role === "assistant" || msg.role === "agent") && (
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === "agent"
                        ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                        : "bg-gradient-to-br from-pink-500 to-purple-500"
                    }`}
                  >
                    {msg.role === "agent" ? (
                      <UserCheck className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                )}

                <div
                  className={`max-w-2xl px-6 py-4 rounded-2xl overflow-hidden ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30"
                      : msg.role === "agent"
                      ? "bg-emerald-500/10 border border-emerald-500/30"
                      : "bg-white/[0.03] border border-white/10"
                  }`}
                >
                  {msg.role === "agent" && (
                    <p className="text-xs text-emerald-400 font-medium mb-1">
                      {msg.metadata?.agent_id === currentUserId
                        ? t("chat.youExpert")
                        : t("chat.expert")}
                    </p>
                  )}
                  {msg.role === "user" && msg.audioUrl && (
                    <div className="space-y-2 mb-2">
                      <audio
                        controls
                        src={msg.audioUrl}
                        className="w-full max-w-xs h-8"
                        title={t("chat.voicePlay")}
                      />
                      {msg.content ? (
                        <p className="text-white/90 leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => transcribeMessage(msg)}
                          disabled={transcribingId === msg.id}
                          className="flex items-center gap-1.5 text-xs text-pink-300 hover:text-pink-200 transition-colors"
                        >
                          {transcribingId === msg.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              {t("chat.voiceTranscribing")}
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5" />
                              {t("chat.voiceTranscribe")}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  {!(msg.role === "user" && msg.audioUrl) && (
                  <div className="space-y-2">
                    {parseMessageContent(msg.content || "", msg.images).map(
                      (segment, segIdx) => {
                        if (segment.type === "image") {
                          return (
                            <div
                              key={segIdx}
                              className="rounded-lg overflow-hidden border border-white/10 my-2"
                            >
                              <img
                                src={segment.content}
                                alt={`${t("chat.imageAlt")} ${segIdx + 1}`}
                                className="w-full h-auto max-h-96 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            </div>
                          );
                        }
                        return (
                          <p
                            key={segIdx}
                            className="text-white/90 leading-relaxed whitespace-pre-wrap break-words break-all"
                          >
                            {segment.content}
                          </p>
                        );
                      }
                    )}
                  </div>
                  )}
                  {/* ✅ Data e hora da mensagem */}
                  <p className="text-xs text-white/40 mt-2">
                    {formatMessageTimestamp(msg.timestamp)}
                  </p>

                  {msg.metadata && msg.role !== "agent" && (
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-xs text-white/40">
                      {msg.metadata.chunks_used !== undefined && (
                        <span>📚 {msg.metadata.chunks_used} chunks</span>
                      )}
                      {msg.metadata.latency_ms && (
                        <span>⚡ {msg.metadata.latency_ms}ms</span>
                      )}
                      {msg.metadata.confidence && (
                        <span>
                          🎯 {(msg.metadata.confidence * 100).toFixed(0)}%
                          confiança
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-4 justify-start">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-pink-400 animate-spin" />
                  <span className="text-white/60">{t("chat.processing")}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      {isMobile ? (
        <div className="px-4 py-3 border-t border-white/10 bg-black/80">
          {isSessionEnded ? (
            <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm text-center">
              {t("chat.conversationClosedShort")}
            </div>
          ) : isAssumedByMe && selectedSession ? (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={agentMessage}
                onChange={(e) => setAgentMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendAgentMessage(selectedSession);
                  }
                }}
                placeholder={t("chat.typeMessage")}
                disabled={sendingAgentMessage}
                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all"
              />
              <button
                onClick={() => handleSendAgentMessage(selectedSession)}
                disabled={sendingAgentMessage || !agentMessage.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-center disabled:opacity-50 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.6)] transition-all"
              >
                {sendingAgentMessage ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t("chat.typeMessage")}
                disabled={loading || isInputBlocked}
                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:bg-white/10 focus:border-white/20 disabled:opacity-50 transition-all"
              />
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading || isInputBlocked}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isRecording
                    ? "bg-red-500/80 text-white animate-pulse"
                    : "bg-white/10 border border-white/20 text-white hover:bg-white/20"
                }`}
                title={isRecording ? t("chat.voiceRecording") : t("chat.voiceSend")}
              >
                {isRecording ? (
                  <Square className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim() || isInputBlocked}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white flex items-center justify-center disabled:opacity-50 shadow-[0_4px_12px_-4px_rgba(236,72,153,0.6)] transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-white/10">
          {isSessionEnded ? (
            <div className="px-6 py-4 rounded-2xl bg-gray-500/10 border border-gray-500/30 flex items-center gap-3">
              <X className="w-5 h-5 text-gray-400" />
                <p className="text-sm text-gray-400">
                {t("chat.conversationEndedNoSend")}
              </p>
              <button
                onClick={createNewChat}
                className="ml-auto px-4 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-pink-400 text-sm font-medium transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("chat.newConversation")}
              </button>
            </div>
          ) : isAssumedByMe && selectedSession ? (
            <div className="space-y-3">
              <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <p className="text-xs text-emerald-400 font-medium">
                  {t("chat.youRespondingAsExpert")}
                </p>
              </div>
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={agentMessage}
                  onChange={(e) => setAgentMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendAgentMessage(selectedSession);
                    }
                  }}
                  placeholder={t("chat.typeMessageToClient")}
                  disabled={sendingAgentMessage}
                  className="flex-1 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
                <button
                  onClick={() => handleSendAgentMessage(selectedSession)}
                  disabled={sendingAgentMessage || !agentMessage.trim()}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:shadow-[0_20px_60px_-20px_rgba(16,185,129,0.8)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sendingAgentMessage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  {t("chat.send")}
                </button>
              </div>
            </div>
          ) : (() => {
              const session = selectedSessionData?.session;
              if (!session || session.availability !== "assumed") return false;
              if (session.assumed_by && currentUserId) {
                const assumedByStr = String(session.assumed_by).trim();
                const currentUserIdStr = String(currentUserId).trim();
                if (assumedByStr !== currentUserIdStr) return true;
              }
              if (
                !session.assumed_by &&
                !myAssumedSessions.includes(session.id)
              )
                return true;
              return false;
            })() ? (
            <div className="px-6 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <p className="text-sm text-amber-400">
                {t("chat.assumedByOtherExpert")}
              </p>
            </div>
          ) : (() => {
              const currentSession =
                selectedSessionData ||
                (selectedSession
                  ? sessions.find((s) => s.session.id === selectedSession)
                  : null);
              const av = currentSession?.session.availability;
              return (
                av === "available" ||
                av === "blocked" ||
                av === undefined
              );
            })() ? (
            <div className="px-6 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <Lock className="w-5 h-5 text-emerald-400" />
              <div className="flex-1">
                <p className="text-sm text-emerald-400 font-medium">
                  {t("chat.waitingExpertTitle")}
                </p>
                <p className="text-xs text-emerald-300 mt-1">
                  {t("chat.waitingExpertDescription")}
                </p>
              </div>
            </div>
          ) : isInputBlocked ? (
            <div className="flex gap-3 opacity-50 cursor-not-allowed">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={() => {}}
                onKeyPress={() => {}}
                placeholder={t("chat.assumeToSend")}
                disabled={true}
                className="flex-1 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white/50 placeholder-gray-500 cursor-not-allowed"
              />
              <button
                onClick={() => {}}
                disabled={true}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium opacity-50 cursor-not-allowed flex items-center gap-2"
              >
                <Lock className="w-5 h-5" />
                Bloqueado
              </button>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t("chat.typeMessage")}
                disabled={loading}
                className="flex-1 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 transition-all"
              />
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                  isRecording ? "bg-red-500/80 text-white animate-pulse" : "bg-white/[0.06] border border-white/10 text-white hover:bg-white/10"
                }`}
                title={isRecording ? t("chat.voiceRecording") : t("chat.voiceSend")}
              >
                {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium hover:shadow-[0_20px_60px_-20px_rgba(236,72,153,0.8)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {t("chat.send")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Return principal
  return (
    <Layout>
      {isMobile ? (
        mobileView === "list" ? (
          renderConversationsList()
        ) : (
          renderChatArea()
        )
      ) : (
        <div className="flex gap-6 h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] overflow-hidden">
          {/* Left Side - Sessions List */}
          <div className="w-80 glass-panel rounded-3xl border border-white/[0.06] p-4 overflow-hidden flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">{t("chat.conversations")}</h2>
              <button
                onClick={() => setShowNewConversationModal(true)}
                className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white transition-all"
                title={t("chat.newConversation")}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                <input
                  type="text"
                  placeholder={t("chat.searchConversations")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-white/60 focus:outline-none focus:bg-white/10 focus:border-pink-500/50 transition-all"
                />
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {sessionsLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <p className="text-xs text-rose-400">{error}</p>
                </div>
              )}

              {!sessionsLoading && filteredSessions.length === 0 && (
                <div className="text-center py-8 text-white/60">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("chat.noConversationsFound")}</p>
                </div>
              )}

              {!sessionsLoading &&
                filteredSessions.map((sessionData) => {
                  const session = sessionData.session;
                  const lastMessage = getLastMessage(sessionData.messages);
                  const isSelected = selectedSession === session.id;
                  const isActive = session.id === chatSessionId;
                  const isActiveSession = isSelected || isActive;

                  return (
                    <div
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      className={`group relative px-4 py-3 flex items-start gap-3 border-b border-white/10 cursor-pointer transition-all duration-300 ${
                        isActiveSession
                          ? "bg-[#EC4899]/20 text-white"
                          : "bg-transparent hover:bg-white/5 text-white/70"
                      }`}
                    >
                      {/* Fade lateral - Rosa para ativa, Cinza para inativa */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full transition-all duration-300 ${
                          isActiveSession
                            ? "bg-gradient-to-b from-[#EC4899] via-pink-500 to-purple-500 shadow-[2px_0_8px_rgba(236,72,153,0.4)]"
                            : "bg-white/20 group-hover:bg-white/30"
                        }`}
                      />

                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-6 h-6 text-white/70" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                isActiveSession ? "text-white" : "text-white/90"
                              }`}
                            >
                              {session.user_display_name ||
                                (session.user_id
                                  ? `#${session.user_id.slice(0, 8)}`
                                  : `#${session.id.slice(0, 8)}`)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs border ${getStatusColor(
                                session.status
                              )}`}
                            >
                              {getStatusLabel(session.status)}
                            </span>
                            {/* Menu de ações (Assumir / Encerrar) */}
                            {canAssumeConversations &&
                              session.status !== "ended" && (
                                <div
                                  className="relative"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowActionsMenu(
                                        showActionsMenu === session.id
                                          ? null
                                          : session.id
                                      );
                                    }}
                                    className="p-1 rounded-lg hover:bg-white/10 transition-all"
                                    title={t("chat.actions")}
                                  >
                                    <MoreVertical className="w-4 h-4 text-white/60" />
                                  </button>

                                  {/* Dropdown menu */}
                                  {showActionsMenu === session.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowActionsMenu(null)}
                                      />
                                      <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-black/90 border border-white/20 backdrop-blur-xl shadow-xl z-20 py-2">
                                        {/* Devolver conversa — ícone robô azul (paridade Nyoka) */}
                                        {assumedByMeMap[session.id] && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (releasingSession !== session.id)
                                                handleReleaseSession(session.id);
                                            }}
                                            disabled={releasingSession === session.id}
                                            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-blue-500/10 flex items-center gap-2 transition-all disabled:opacity-50"
                                          >
                                            {releasingSession === session.id ? (
                                              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                            ) : (
                                              <Bot className="w-4 h-4 text-blue-400" />
                                            )}
                                            {t("chat.returnConversation")}
                                          </button>
                                        )}
                                        {/* Assumir: core pode mandar available, blocked ou omitir — antes só "available" escondia o botão */}
                                        {session.availability !== "assumed" && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setConfirmAssumeSession(session.id);
                                              setShowActionsMenu(null);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-emerald-500/10 flex items-center gap-2 transition-all"
                                          >
                                            <Unlock className="w-4 h-4 text-emerald-400" />
                                            {t("chat.assumeAttendance")}
                                          </button>
                                        )}
                                        {/* Encerrar conversa */}
                                        {(session.status === "active" ||
                                          session.status ===
                                            "waiting_response" ||
                                          session.status === "resolved") && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (
                                                chatSessionId === session.id
                                              ) {
                                                endChat();
                                              } else {
                                                const handleEndSessionFromMenu =
                                                  async () => {
                                                    try {
                                                      const headers =
                                                        getAuthHeaders();
                                                      const res = await fetch(
                                                        `${API_BASE_URL}/chat/sessions/${session.id}/end`,
                                                        {
                                                          method: "POST",
                                                          headers: {
                                                            ...headers,
                                                            "Content-Type":
                                                              "application/json",
                                                          },
                                                          body: JSON.stringify({
                                                            status: "ended",
                                                          }),
                                                        }
                                                      );
                                                      if (res.ok) {
                                                        await fetchSessions(
                                                          false
                                                        );
                                                        if (
                                                          selectedSession ===
                                                          session.id
                                                        ) {
                                                          setSelectedSession(
                                                            null
                                                          );
                                                        }
                                                      }
                                                    } catch (err) {
                                                      console.error("chat.end_session_error", { error: err instanceof Error ? err.message : String(err) });
                                                    }
                                                  };
                                                handleEndSessionFromMenu();
                                              }
                                              setShowActionsMenu(null);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-500/10 flex items-center gap-2 transition-all"
                                          >
                                            <CheckCircle className="w-4 h-4 text-gray-400" />
                                            {t("chat.endConversation")}
                                          </button>
                                        )}
                                        {/* Resumo (Nyoka) */}
                                        {session.status !== "ended" && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenSummary(session.id);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-pink-500/10 flex items-center gap-2 transition-all"
                                          >
                                            <FileText className="w-4 h-4 text-pink-400" />
                                            {t("chat.summary")}
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>

                        {lastMessage && (
                          <p
                            className={`text-xs mb-2 line-clamp-2 ${
                              isActiveSession
                                ? "text-white/80"
                                : "text-white/60"
                            }`}
                          >
                            {lastMessage}
                          </p>
                        )}

                        <div
                          className={`flex items-center gap-2 text-xs ${
                            isActiveSession ? "text-white/50" : "text-white/50"
                          }`}
                        >
                          <span>{session.message_count} {t("chat.msgs")}</span>
                          <span>•</span>
                          <span>{formatDate(session.last_interaction_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right Side - Chat Area */}
          <div className="flex-1 glass-panel rounded-3xl border border-white/[0.06] p-6 overflow-hidden flex flex-col min-w-0 min-h-0">
            {/* Chat Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
              <div>
                {selectedSessionData ? (
                  <div>
                    <div className="flex items-center gap-3">
                      {selectedSessionData.session.avatar_url && (
                        <img
                          src={selectedSessionData.session.avatar_url}
                          alt={
                            selectedSessionData.session.user_display_name ||
                            t("chat.userLabel")
                          }
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <h3 className="text-lg font-semibold text-white">
                        {selectedSessionData.session.user_display_name ||
                          (selectedSessionData.session.user_id
                            ? `${t("chat.userLabel")} #${selectedSessionData.session.user_id.slice(
                                0,
                                8
                              )}`
                            : `${t("chat.anonymousLabel")} #${selectedSessionData.session.id.slice(
                                0,
                                8
                              )}`)}
                      </h3>
                      {selectedSessionData.session.source && (
                        <span className="px-2 py-1 rounded-full text-xs border text-blue-300 bg-blue-500/20 border-blue-500/30">
                          {selectedSessionData.session.source}
                        </span>
                      )}
                      {isSessionEnded && (
                        <span className="px-2 py-1 rounded-full text-xs border text-gray-400 bg-gray-400/10 border-gray-400/30">
                          {t("chat.statusEnded")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedSessionData.session.message_count} {t("chat.messagesCount")} •{" "}
                      {formatDate(selectedSessionData.session.started_at)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {t("chat.newConversation")}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {t("chat.newConversationSubtitle")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0">
              {messages.length === 0 && !loading && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Bot className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
                    <p className="text-gray-400">
                      {t("chat.selectOrStart")}
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg, index) => {
                if (msg.metadata?.is_marker) return null;
                if (!msg.content && !msg.audioUrl) return null;

                return (
                  <div
                    key={msg.id ?? index}
                    className={`flex gap-4 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {(msg.role === "assistant" || msg.role === "agent") && (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          msg.role === "agent"
                            ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                            : "bg-gradient-to-br from-pink-500 to-purple-500"
                        }`}
                      >
                        {msg.role === "agent" ? (
                          <UserCheck className="w-5 h-5 text-white" />
                        ) : (
                          <Bot className="w-5 h-5 text-white" />
                        )}
                      </div>
                    )}

                    <div
                      className={`max-w-2xl px-6 py-4 rounded-2xl overflow-hidden ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30"
                          : msg.role === "agent"
                          ? "bg-emerald-500/10 border border-emerald-500/30"
                          : "bg-white/[0.03] border border-white/10"
                      }`}
                    >
                      {msg.role === "agent" && (
                        <p className="text-xs text-emerald-400 font-medium mb-1">
                          {msg.metadata?.agent_id === currentUserId
                            ? "Você (Especialista)"
                            : "Especialista"}
                        </p>
                      )}
                      {msg.role === "user" && msg.audioUrl && (
                        <div className="space-y-2 mb-2">
                          <audio
                            controls
                            src={msg.audioUrl}
                            className="w-full max-w-xs h-8"
                            title={t("chat.voicePlay")}
                          />
                          {msg.content ? (
                            <p className="text-white/90 leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={() => transcribeMessage(msg)}
                              disabled={transcribingId === msg.id}
                              className="flex items-center gap-1.5 text-xs text-pink-300 hover:text-pink-200 transition-colors"
                            >
                              {transcribingId === msg.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  {t("chat.voiceTranscribing")}
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3.5 h-3.5" />
                                  {t("chat.voiceTranscribe")}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                      {!(msg.role === "user" && msg.audioUrl) && (
                      <div className="space-y-2">
                        {parseMessageContent(msg.content || "", msg.images).map(
                          (segment, segIdx) => {
                            if (segment.type === "image") {
                              return (
                                <div
                                  key={segIdx}
                                  className="rounded-lg overflow-hidden border border-white/10 my-2"
                                >
                                  <img
                                    src={segment.content}
                                    alt={`${t("chat.imageAlt")} ${segIdx + 1}`}
                                    className="w-full h-auto max-h-96 object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                </div>
                              );
                            }
                            return (
                              <p
                                key={segIdx}
                                className="text-white/90 leading-relaxed whitespace-pre-wrap break-words break-all"
                              >
                                {segment.content}
                              </p>
                            );
                          }
                        )}
                      </div>
                      )}
                      {/* ✅ Data e hora da mensagem */}
                      <p className="text-xs text-white/40 mt-2">
                        {formatMessageTimestamp(msg.timestamp)}
                      </p>

                      {msg.metadata && msg.role !== "agent" && (
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-xs text-white/40">
                          {msg.metadata.chunks_used !== undefined && (
                            <span>📚 {msg.metadata.chunks_used} chunks</span>
                          )}
                          {msg.metadata.latency_ms && (
                            <span>⚡ {msg.metadata.latency_ms}ms</span>
                          )}
                          {msg.metadata.confidence && (
                            <span>
                              🎯 {(msg.metadata.confidence * 100).toFixed(0)}%
                              confiança
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {msg.role === "user" && (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-pink-400 animate-spin" />
                      <span className="text-white/60">{t("chat.processing")}</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="mt-4 pt-4 border-t border-white/10">
              {isSessionEnded ? (
                <div className="px-6 py-4 rounded-2xl bg-gray-500/10 border border-gray-500/30 flex items-center gap-3">
                  <X className="w-5 h-5 text-gray-400" />
                <p className="text-sm text-gray-400">
                {t("chat.conversationEndedNoSend")}
              </p>
              <button
                onClick={createNewChat}
                className="ml-auto px-4 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-pink-400 text-sm font-medium transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("chat.newConversation")}
              </button>
                </div>
              ) : isAssumedByMe && selectedSession ? (
                // Input para enviar mensagem como especialista (se assumida por mim)
                <div className="space-y-3">
                  <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs text-emerald-400 font-medium">
                      {t("chat.youRespondingAsExpert")}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={agentMessage}
                      onChange={(e) => setAgentMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendAgentMessage(selectedSession);
                        }
                      }}
                      placeholder={t("chat.typeMessageToClient")}
                      disabled={sendingAgentMessage}
                      className="flex-1 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                    <button
                      onClick={() => handleSendAgentMessage(selectedSession)}
                      disabled={sendingAgentMessage || !agentMessage.trim()}
                      className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:shadow-[0_20px_60px_-20px_rgba(16,185,129,0.8)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sendingAgentMessage ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      {t("chat.send")}
                    </button>
                  </div>
                </div>
              ) : (() => {
                  // Verificar se está assumida por outro (não por mim)
                  const session = selectedSessionData?.session;
                  if (!session || session.availability !== "assumed")
                    return false;

                  // Se assumed_by existe e não corresponde ao currentUserId, é outro especialista
                  if (session.assumed_by && currentUserId) {
                    const assumedByStr = String(session.assumed_by).trim();
                    const currentUserIdStr = String(currentUserId).trim();
                    if (assumedByStr !== currentUserIdStr) {
                      return true; // É outro especialista
                    }
                  }

                  // Se não tem assumed_by mas não está no estado local, pode ser outro
                  if (
                    !session.assumed_by &&
                    !myAssumedSessions.includes(session.id)
                  ) {
                    return true; // Provavelmente outro especialista
                  }

                  return false; // Não é outro especialista (ou é eu, ou ainda não foi assumida)
                })() ? (
                // Conversa assumida por outro especialista
                <div className="px-6 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <p className="text-sm text-amber-400">
                    {t("chat.assumedByOtherExpert")}
                  </p>
                </div>
              ) : (() => {
                  // Verificar se a sessão está disponível (pode ser que selectedSessionData ainda não esteja carregado)
                  const currentSession =
                    selectedSessionData ||
                    (selectedSession
                      ? sessions.find((s) => s.session.id === selectedSession)
                      : null);
                  const av = currentSession?.session.availability;
                  return (
                    av === "available" ||
                    av === "blocked" ||
                    av === undefined
                  );
                })() ? (
                // Conversa disponível para especialista assumir (LLM bloqueada, input desabilitado)
                <div className="px-6 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  <div className="flex-1">
                    <p className="text-sm text-emerald-400 font-medium">
                      {t("chat.waitingExpertTitle")}
                    </p>
                    <p className="text-xs text-emerald-300 mt-1">
                      {t("chat.waitingExpertDescription")}
                    </p>
                  </div>
                </div>
              ) : // Input normal para enviar mensagem (LLM responde) OU bloqueado
              // Regra: só desbloqueia quando availability === 'assumed' E isAssumedByMe === true
              // Todos os outros casos (blocked, available, assumed por outro) = BLOQUEADO
              isInputBlocked ? (
                // Input bloqueado quando conversa não está assumida por mim
                <div className="flex gap-3 opacity-50 cursor-not-allowed">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={() => {}} // Bloqueado
                    onKeyPress={() => {}} // Bloqueado
                    placeholder={t("chat.assumeToSend")}
                    disabled={true}
                    className="flex-1 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white/50 placeholder-gray-500 cursor-not-allowed"
                  />
                  <button
                    onClick={() => {}}
                    disabled={true}
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium opacity-50 cursor-not-allowed flex items-center gap-2"
                  >
                    <Lock className="w-5 h-5" />
                    Bloqueado
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t("chat.typeMessage")}
                    disabled={loading}
                    className="flex-1 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={loading}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                      isRecording ? "bg-red-500/80 text-white animate-pulse" : "bg-white/[0.06] border border-white/10 text-white hover:bg-white/10"
                    }`}
                    title={isRecording ? t("chat.voiceRecording") : t("chat.voiceSend")}
                  >
                    {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium hover:shadow-[0_20px_60px_-20px_rgba(236,72,153,0.8)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    {t("chat.send")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal resumo da conversa (Nyoka) */}
      <Dialog open={summaryModalOpen} onOpenChange={setSummaryModalOpen}>
        <DialogContent className="max-w-lg border-white/10 bg-black/90 text-white max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">
              {t("chat.summaryTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] p-4 min-h-[120px] text-sm text-gray-200 whitespace-pre-wrap">
            {summaryModalLoading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("chat.summaryLoading")}
              </div>
            ) : (
              summaryModalText
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setSummaryModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-white/[0.08] border border-white/10 text-white hover:bg-white/[0.12]"
            >
              {t("chat.cancel")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação para assumir conversa */}
      <Dialog
        open={!!confirmAssumeSession}
        onOpenChange={(open) =>
          !open && !assumingSession && setConfirmAssumeSession(null)
        }
      >
        <DialogContent className="max-w-md border-white/10 bg-black/90 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">
              {t("chat.assumeConversation")}
            </DialogTitle>
            <p className="text-sm text-gray-400">
              {t("chat.assumeConfirmDescription")}
            </p>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setConfirmAssumeSession(null)}
              disabled={!!assumingSession}
              className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white hover:bg-white/[0.08] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("chat.cancel")}
            </button>
            <button
              onClick={() =>
                confirmAssumeSession &&
                handleAssumeSession(confirmAssumeSession)
              }
              disabled={!!assumingSession}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {assumingSession === confirmAssumeSession ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("chat.assuming")}
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  {t("chat.confirm")}
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Conversa */}
      <NewConversationModal
        open={showNewConversationModal}
        onOpenChange={setShowNewConversationModal}
        companyId={companyId}
        onSelectContact={handleSelectContact}
        onImportContacts={handleImportContacts}
      />

      {/* Modal de Importar Contatos */}
      <ImportContactsModal
        open={showImportContactsModal}
        onOpenChange={setShowImportContactsModal}
        companyId={companyId}
        onImportComplete={handleImportComplete}
      />
    </Layout>
  );
}
