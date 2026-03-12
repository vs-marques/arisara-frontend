import { useState, useRef, useEffect } from "react";
import Layout from "../components/Layout";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { API_ENDPOINTS, getAuthHeaders, API_BASE_URL } from "../config/api";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  images?: string[]; // ✅ URLs de imagens
  metadata?: {
    chunks_used?: number;
    latency_ms?: number;
    confidence?: number;
  };
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

  // If no images, return just text
  if (!images || images.length === 0) {
    return [{ type: "text", content }];
  }

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

  for (const { pattern, extractUrl } of imagePatterns) {
    let match;
    pattern.lastIndex = 0; // Reset regex
    while ((match = pattern.exec(content)) !== null) {
      const url = extractUrl(match);
      // Check if this URL is in our images array
      if (images.includes(url)) {
        imageMatches.push({
          url,
          start: match.index,
          end: match.index + match[0].length,
        });
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
      const textBefore = content.substring(lastIndex, imgMatch.start).trim();
      if (textBefore) {
        segments.push({ type: "text", content: textBefore });
      }
    }

    // Add image
    segments.push({ type: "image", content: imgMatch.url });
    lastIndex = imgMatch.end;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const textAfter = content.substring(lastIndex).trim();
    if (textAfter) {
      segments.push({ type: "text", content: textAfter });
    }
  }

  // If no matches found but we have images, append them at the end
  if (segments.length === 0 || segments.every((s) => s.type === "text")) {
    segments.push({ type: "text", content });
    // Add images that weren't found in text
    const foundUrls = new Set(imageMatches.map((m) => m.url));
    const unfoundImages = images.filter((url) => !foundUrls.has(url));
    for (const imgUrl of unfoundImages) {
      segments.push({ type: "image", content: imgUrl });
    }
  }

  return segments;
}

export default function Chat() {
  useRequireAuth();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou a Arisara, sua assistente de IA. Como posso ajudar você hoje?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    // Carregar session_id do localStorage ao montar o componente
    return localStorage.getItem("nyoka_session_id");
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ✅ NOVO: Carregar histórico de mensagens ao montar componente
  useEffect(() => {
    const loadMessageHistory = async () => {
      if (!sessionId) return;

      try {
        const headers = getAuthHeaders();
        const response = await fetch(
          `${API_BASE_URL}/chat/sessions/${sessionId}/messages`,
          { headers }
        );

        if (response.ok) {
          const data = await response.json();
          
          // Converter formato da API para formato do componente
          const historyMessages: Message[] = data.map((msg: any) => {
            const messages: Message[] = [];
            
            // Adicionar mensagem do usuário
            if (msg.user_message) {
              messages.push({
                role: "user",
                content: msg.user_message,
                timestamp: new Date(msg.timestamp)
              });
            }
            
            // Adicionar resposta da assistente
            if (msg.assistant_message) {
              messages.push({
                role: "assistant",
                content: msg.assistant_message,
                timestamp: new Date(msg.timestamp)
              });
            }
            
            return messages;
          }).flat();

          // Se houver histórico, substituir mensagem de boas-vindas
          if (historyMessages.length > 0) {
            setMessages(historyMessages);
          }
        }
      } catch (error) {
        console.error("chat.load_history_error", { error: error instanceof Error ? error.message : String(error) });
        // Não fazer nada - manter mensagem de boas-vindas padrão
      }
    };

    loadMessageHistory();
  }, [sessionId]); // Recarregar quando sessionId mudar

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    const currentInput = input; // Salvar antes de limpar
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Buscar dados do usuário via /auth/me
      const headers = getAuthHeaders();
      const meRes = await fetch(API_ENDPOINTS.auth.me, { headers });

      if (!meRes.ok) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const userData = await meRes.json();
      const companyId = userData.company_id;

      if (!companyId) {
        throw new Error(
          "Usuário sem empresa vinculada. Entre em contato com o suporte."
        );
      }

      // Preparar histórico (ANTES da mensagem atual, últimas 10)
      const history = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const requestBody = {
        company_id: companyId,
        user_id: userData.id, // ✅ ID do usuário logado
        message: currentInput, // Usar currentInput ao invés de input (que já foi limpo)
        session_id: sessionId || undefined, // ✅ Enviar session_id se existir (para manter continuidade)
        conversation_history: history,
        max_context_chunks: 5,
        create_new_session: false, // Não forçar nova sessão
        channel: "web", // ✅ Canal da conversa
      };

      console.debug("chat.send_message", { hasSessionId: !!sessionId });

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
        throw new Error(error.detail || "Erro ao enviar mensagem");
      }

      const data = await res.json();

      // Guardar session_id para reutilizar na próxima mensagem
      if (data.session_id) {
        setSessionId(data.session_id);
        localStorage.setItem("nyoka_session_id", data.session_id);
        console.debug("chat.session_id_saved", { sessionId: data.session_id });
      } else {
        console.warn("chat.response_no_session_id");
      }

      // ✅ NOVO: Processar formato de messages (cards de imóveis) ou response simples
      if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        // Formato estruturado: múltiplas mensagens (intro + cards de imóveis + follow-up)
        console.debug("chat.response_with_cards", { count: data.messages.length });
        
        const newMessages: Message[] = [];
        
        for (const msg of data.messages) {
          if (msg.text) {
            // Mensagem de texto simples
            newMessages.push({
              role: "assistant",
              content: msg.text,
              timestamp: new Date(),
              metadata: {
                chunks_used: data.context?.chunks_used,
                latency_ms: data.metadata?.latency_ms,
                confidence: data.metadata?.confidence,
                session_id: data.session_id,
                session_status: data.session_status,
              },
            });
          } else if (msg.media) {
            // Card de imóvel: imagem + caption
            const caption = msg.media.caption || "";
            const imageUrl = msg.media.base64 
              ? `data:image/jpeg;base64,${msg.media.base64}`
              : msg.media.url;
            
            newMessages.push({
              role: "assistant",
              content: caption,
              images: imageUrl ? [imageUrl] : undefined,
              timestamp: new Date(),
              metadata: {
                chunks_used: data.context?.chunks_used,
                latency_ms: data.metadata?.latency_ms,
                confidence: data.metadata?.confidence,
                session_id: data.session_id,
                session_status: data.session_status,
              },
            });
          }
        }
        
        setMessages((prev) => [...prev, ...newMessages]);
      } else {
        // Formato simples: response única (compatibilidade com código antigo)
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response || "Desculpe, não consegui gerar uma resposta.",
          images: data.images || undefined,
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
      }
    } catch (err: any) {
      console.error("chat.send_message_error", { error: err instanceof Error ? err.message : String(err) });

      const errorMessage: Message = {
        role: "assistant",
        content: `❌ Erro: ${
          err.message || "Não foi possível processar sua mensagem."
        }`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <header className="rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-6 shadow-[0_30px_80px_-60px_rgba(236,72,153,0.45)] backdrop-blur mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">
                Chat com Arisara
              </h1>
              <p className="mt-2 text-sm text-gray-400">
                Converse com sua IA contextualizada
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span className="text-sm text-white/80">RAG Ativo</span>
            </div>
          </div>
        </header>

        {/* Messages Container */}
        <div className="flex-1 glass-panel rounded-3xl border border-white/[0.06] p-6 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-4 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-2xl px-6 py-4 rounded-2xl overflow-hidden ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30"
                      : "bg-white/[0.03] border border-white/10"
                  }`}
                >
                  {/* ✅ Renderizar conteúdo com imagens inline */}
                  <div className="space-y-2">
                    {parseMessageContent(msg.content, msg.images).map(
                      (segment, segIdx) => {
                        if (segment.type === "image") {
                          return (
                            <div
                              key={segIdx}
                              className="rounded-lg overflow-hidden border border-white/10 my-2"
                            >
                              <img
                                src={segment.content}
                                alt={`Imagem ${segIdx + 1}`}
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
                            className="text-white/90 leading-relaxed whitespace-pre-wrap break-words break-all overflow-hidden"
                          >
                            {segment.content}
                          </p>
                        );
                      }
                    )}
                  </div>

                  {msg.metadata && (
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
            ))}

            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-pink-400 animate-spin" />
                    <span className="text-white/60">Processando...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={loading}
                className="flex-1 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 transition-all"
              />
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
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
