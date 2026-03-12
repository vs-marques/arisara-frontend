import { useState, useRef, useEffect } from "react";
import { Send, X, MessageCircle, User, Phone, Mail } from "lucide-react";
import { API_BASE_URL, getAuthHeaders } from "@/config/api";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatPhoneBR, validatePhone, phoneDigits } from "@/lib/utils";

export interface GuestInfo {
  name: string;
  phone: string;
  email: string;
}

const GUEST_STORAGE_KEY = "nyoka_platform_guest_info";
const EXTERNAL_USER_ID_KEY = "nyoka_platform_external_user_id";

/** UUID estável do visitante para external_reference (igual ao user_id do WhatsApp). */
function getOrCreateExternalUserId(): string {
  let id = localStorage.getItem(EXTERNAL_USER_ID_KEY);
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return id;
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    id = crypto.randomUUID();
  } else {
    id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  localStorage.setItem(EXTERNAL_USER_ID_KEY, id);
  return id;
}

function loadStoredGuest(): GuestInfo | null {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestInfo;
    if (
      parsed?.name?.trim() &&
      (parsed?.email?.trim() || parsed?.phone?.trim())
    ) {
      return {
        name: parsed.name.trim(),
        phone: (parsed.phone || "").trim(),
        email: (parsed.email || "").trim(),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  images?: string[]; // ✅ URLs de imagens
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
      const isValidImageUrl =
        /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?[^\s]*)?/i.test(url);
      const shouldInclude =
        !images || images.length === 0
          ? isValidImageUrl // If no images array, extract from text
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
      textBefore = textBefore
        .replace(
          /^\s*\[(Foto|Imagem|Image|Picture|Foto do|Imagem do|Image of)[^\]]*\]\s*$/i,
          ""
        )
        .trim();

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

export default function EmbeddedChat() {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [isOpen, setIsOpen] = useState(false);
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(loadStoredGuest);
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
    return localStorage.getItem("nyoka_platform_session_id");
  });
  // UUID estável para external_reference (carregar cliente como no WhatsApp)
  const [externalUserId] = useState<string>(getOrCreateExternalUserId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // company_id: empresa selecionada no app (currentCompany) ou do usuário (user.company_id) — necessário para manter histórico
  const companyId = currentCompany?.id ?? user?.company_id ?? null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    const currentInput = input;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // company_id é obrigatório para manter histórico (sessão e external_reference vinculados à empresa)
      if (!companyId) {
        const errorMessage: Message = {
          role: "assistant",
          content:
            "Para manter o histórico de conversas, é necessário ter uma empresa vinculada. Selecione uma empresa no menu ou entre em contato com o suporte.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setLoading(false);
        return;
      }

      const endpoint = `${API_BASE_URL}/chat/message`;
      const headers = getAuthHeaders();

      // Payload alinhado ao WhatsApp: source + user_id (external) + dados do cliente para carregar external_reference
      const requestBody: any = {
        company_id: companyId,
        message: currentInput,
        conversation_history: messages.slice(-10).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        max_context_chunks: 5,
        session_id: sessionId ? sessionId : undefined,
        create_new_session: !sessionId,
        source: "web",
        channel: "web",
        user_id: externalUserId,
        ...(guestInfo && {
          user_name: guestInfo.name,
          user_email: guestInfo.email || undefined,
          user_phone: guestInfo.phone || undefined,
        }),
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Erro ao enviar mensagem");
      }

      const data = await res.json();

      // Salvar session_id (ChatResponse retorna session_id como string)
      if (data.session_id) {
        const newSessionId = String(data.session_id);
        if (newSessionId !== sessionId) {
          setSessionId(newSessionId);
          localStorage.setItem("nyoka_platform_session_id", newSessionId);
        }
      }

      // ✅ NOVO: Processar formato de messages (cards de imóveis) ou response simples
      if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        // Formato estruturado: múltiplas mensagens (intro + cards de imóveis + follow-up)
        console.debug("embedded_chat.response_with_cards", { count: data.messages.length });
        
        const newMessages: Message[] = [];
        
        for (const msg of data.messages) {
          if (msg.text) {
            // Mensagem de texto simples
            newMessages.push({
              role: "assistant",
              content: msg.text,
              timestamp: new Date(),
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
            });
          }
        }
        
        setMessages((prev) => [...prev, ...newMessages]);
      } else {
        // Formato simples: response única (compatibilidade com código antigo)
        const responseText =
          data.response || "Desculpe, não consegui processar sua mensagem.";

        const assistantMessage: Message = {
          role: "assistant",
          content: responseText,
          images: data.images || undefined,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Erro: ${
          error.message ||
          "Não foi possível enviar a mensagem. Tente novamente."
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
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#EC4899] text-white shadow-[0_20px_60px_-20px_rgba(236,72,153,0.8)] hover:bg-[#EC4899]/90 hover:scale-110 transition-all duration-300"
          aria-label="Abrir chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-[#EC4899]/20 to-transparent">
          <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#EC4899] animate-pulse" />
              <h3 className="text-white font-semibold">Arisara</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white transition-colors"
              aria-label="Fechar chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tela de login (nome, telefone, email) antes do chat */}
          {!guestInfo ? (
            <PreChatForm
              onSubmit={(info) => {
                setGuestInfo(info);
                try {
                  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(info));
                } catch {
                  // ignore
                }
              }}
            />
          ) : (
            <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 overflow-hidden ${
                    msg.role === "user"
                      ? "bg-[#EC4899] text-white"
                      : "bg-white/10 text-white border border-white/10"
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
                                className="w-full h-auto max-h-64 object-contain"
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
                            className="text-sm leading-relaxed whitespace-pre-wrap break-words break-all overflow-hidden"
                          >
                            {segment.content}
                          </p>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-white border border-white/10 rounded-2xl px-4 py-2">
                  <div className="flex gap-1">
                    <div
                      className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#EC4899] focus:ring-1 focus:ring-[#EC4899] transition-all"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-4 py-2 bg-[#EC4899] text-white rounded-xl hover:bg-[#EC4899]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                aria-label="Enviar mensagem"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function PreChatForm({
  onSubmit,
}: {
  onSubmit: (info: GuestInfo) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setError("Por favor, informe seu nome.");
      return;
    }
    if (!trimmedPhone && !trimmedEmail) {
      setError("Por favor, informe seu telefone ou e-mail.");
      return;
    }
    if (trimmedPhone) {
      const validation = validatePhone(trimmedPhone);
      if (!validation.valid) {
        setError(validation.message ?? "Telefone inválido.");
        return;
      }
    }
    setError("");
    const phoneToSend = trimmedPhone ? `55${phoneDigits(trimmedPhone)}` : "";
    onSubmit({
      name: trimmedName,
      phone: phoneToSend,
      email: trimmedEmail,
    });
  };

  return (
    <div className="flex-1 flex flex-col p-6 justify-center">
      <p className="text-white/80 text-sm mb-6 text-center">
        Para iniciar a conversa, preencha seus dados:
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-white/60 text-xs mb-1.5">Nome</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#EC4899] focus:ring-1 focus:ring-[#EC4899] transition-all"
              autoComplete="name"
            />
          </div>
        </div>
        <div>
          <label className="block text-white/60 text-xs mb-1.5">Telefone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
              placeholder="(11) 99999-9999"
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#EC4899] focus:ring-1 focus:ring-[#EC4899] transition-all"
              autoComplete="tel"
            />
          </div>
        </div>
        <div>
          <label className="block text-white/60 text-xs mb-1.5">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#EC4899] focus:ring-1 focus:ring-[#EC4899] transition-all"
              autoComplete="email"
            />
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-[#EC4899] text-white font-medium hover:bg-[#EC4899]/90 transition-all focus:outline-none focus:ring-2 focus:ring-[#EC4899] focus:ring-offset-2 focus:ring-offset-black"
        >
          Iniciar conversa
        </button>
      </form>
    </div>
  );
}
