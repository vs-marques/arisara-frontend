/**
 * Chat de uma única sessão para uso em modal (ex.: LeadDetailModal).
 * Carrega mensagens da API e permite enviar mensagem como agente.
 * Sem puxar contexto externo — apenas a conversa da sessão.
 */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2, Bot, User, UserCheck } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '@/config/api';

interface ConversationMessageApi {
  id: string;
  user_message: string;
  assistant_message: string;
  agent_message?: string;
  agent_id?: string;
  agent_display_name?: string;
  channel: string;
  timestamp: string;
}

interface Message {
  role: 'user' | 'assistant' | 'agent';
  content: string;
  timestamp: Date;
}

function convertApiMessages(api: ConversationMessageApi[]): Message[] {
  const out: Message[] = [];
  api.forEach((msg) => {
    if (msg.agent_message && (msg.agent_id || msg.agent_display_name)) {
      if (msg.agent_message !== '[Conversa assumida por especialista]') {
        out.push({
          role: 'agent',
          content: msg.agent_message,
          timestamp: new Date(msg.timestamp),
        });
      }
    } else {
      if (msg.user_message) {
        out.push({
          role: 'user',
          content: msg.user_message,
          timestamp: new Date(msg.timestamp),
        });
      }
      if (
        msg.assistant_message?.trim() &&
        !msg.assistant_message.includes('[Availability') &&
        !msg.assistant_message.includes('- LLM bloqueada')
      ) {
        out.push({
          role: 'assistant',
          content: msg.assistant_message,
          timestamp: new Date(msg.timestamp),
        });
      }
    }
  });
  return out;
}

interface SingleSessionChatProps {
  sessionId: string;
  leadName?: string;
  className?: string;
}

export function SingleSessionChat({ sessionId, leadName, className = '' }: SingleSessionChatProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentMessage, setAgentMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(t('chat.errors.errorLoadMessages'));
      const data: ConversationMessageApi[] = await res.json();
      setMessages(convertApiMessages(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = agentMessage.trim();
    if (!text || sending) return;
    setSending(true);
    setAgentMessage('');
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/agent-message`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || t('chat.errors.errorSendMessage'));
      }
      await loadMessages();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex flex-col h-full min-h-0 ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/40 rounded-t-none">
        <div className="h-9 w-9 rounded-full bg-[#EC4899]/20 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-[#EC4899]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white truncate text-sm">{leadName || t('chat.userLabel')}</p>
          <p className="text-xs text-gray-500">{messages.length} {t('chat.messagesCount')}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 text-[#EC4899] animate-spin" />
          </div>
        )}
        {!loading && error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {!loading && !error && messages.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-6">{t('chat.noConversationsFound')}</p>
        )}
        {!loading && !error &&
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {(msg.role === 'assistant' || msg.role === 'agent') && (
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'agent'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
                      : 'bg-gradient-to-br from-pink-500 to-purple-500'
                  }`}
                >
                  {msg.role === 'agent' ? (
                    <UserCheck className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
              )}
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-white'
                    : msg.role === 'agent'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-white'
                    : 'bg-white/10 border border-white/20 text-white'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">{formatTime(msg.timestamp)}</p>
              </div>
            </div>
          ))}
      </div>

      <div className="p-3 border-t border-white/10 bg-black/40">
        <div className="flex gap-2">
          <input
            type="text"
            value={agentMessage}
            onChange={(e) => setAgentMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t('chat.typeMessage')}
            disabled={sending}
            className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:border-[#EC4899]/50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !agentMessage.trim()}
            className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-center disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

