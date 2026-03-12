/**
 * Caminho: src/components/SupportAgent.tsx
 * Descrição: Componente do agente de suporte BIA com interface de chat
 * Versão: 1.0 – 2025-01-27
 * Histórico de Modificações:
 * - 2025-01-27: Implementação inicial do agente de suporte
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, X, Send, Bot, User, Headphones } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { fetchWithAuthJson } from '@/lib/fetchWithAuth';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const SupportAgent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Oi! Sou sua assistente. Diga-me o que precisa ou selecione uma das opções abaixo.',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Backend API URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const predefinedActions = [
    { label: 'Consultar valores a depositar', action: 'consultar_valores_depositar' },
    { label: 'Alterar regras de pontos', action: 'alterar_regras_pontos' },
    { label: 'Consultar evolução da inadimplência', action: 'consultar_evolucao_inadimplencia' },
    { label: 'Pedir ajuda com um problema', action: 'pedir_ajuda_problema' }
  ];

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Chamar endpoint de chat do backend
      const data = await fetchWithAuthJson<{ response: string; truncated: boolean }>(
        `${API_URL}/api/support/chat`,
        {
          method: 'POST',
          body: JSON.stringify({
            message: content.trim()
          })
        }
      );

      // Resposta da BIA
      const botResponse = data.response || 'Desculpe, não consegui processar sua mensagem no momento.';

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      
    } catch (error: any) {
      console.error("support_agent.send_error", { error: error instanceof Error ? error.message : String(error) });
      
      // Tratamento específico de erros
      let errorDescription = 'Não foi possível enviar a mensagem. Tente novamente.';
      
      if (error.status === 503) {
        errorDescription = 'Serviço de chat temporariamente indisponível. Tente novamente em alguns instantes.';
      } else if (error.status === 504) {
        errorDescription = 'A resposta está demorando mais que o esperado. Tente novamente.';
      } else if (error.status === 401) {
        errorDescription = 'Sessão expirada. Faça login novamente.';
      }
      
      toast({
        title: 'Erro',
        description: errorDescription,
        variant: 'destructive'
      });
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes.',
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePredefinedAction = (action: string, label: string) => {
    sendMessage(label);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
          isMobile 
            ? 'h-12 w-12 rounded-full bg-orange-500 hover:bg-orange-600' 
            : 'h-12 px-4 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center gap-2'
        }`}
        size="lg"
      >
        <Headphones className="h-5 w-5 text-white" />
        {!isMobile && (
          <span className="text-white font-medium">Pedir ajuda pra BIA</span>
        )}
      </Button>

      {/* Chat Modal */}
      {isOpen && (
        <div className={`fixed z-50 ${
          isMobile 
            ? 'inset-0 dialog-overlay-glassmorphism flex items-center justify-center p-4' 
            : 'bottom-6 right-6'
        }`}>
          <Card className={`flex flex-col glass-card rounded-3xl ${
            isMobile 
              ? 'w-full h-[80vh] max-w-md' 
              : 'w-96 h-[500px]'
          }`}>
            <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-3 border-b border-white/18 dark:border-white/08 ${
              isMobile ? 'p-4' : 'p-3'
            }`}>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Bot className="h-5 w-5 text-orange-500" />
                Assistente
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 break-words ${
                          message.sender === 'user'
                            ? 'bg-orange-500 text-white'
                            : 'glass-card-light text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {message.sender === 'bot' && (
                            <Bot className="h-4 w-4 mt-0.5 text-orange-500 flex-shrink-0" />
                          )}
                          {message.sender === 'user' && (
                            <User className="h-4 w-4 mt-0.5 text-white flex-shrink-0" />
                          )}
                          <div className="text-sm break-words overflow-wrap-anywhere">{message.content}</div>
                        </div>
                        <div className={`text-xs mt-1 ${
                          message.sender === 'user' ? 'text-orange-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Predefined Actions (only show on first message) */}
                  {messages.length === 1 && (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Aqui você pode:
                      </div>
                      <div className="flex flex-col gap-2">
                        {predefinedActions.map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handlePredefinedAction(action.action, action.label)}
                            className="inline-flex w-fit h-auto py-2 px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white border-orange-400 hover:border-orange-500 backdrop-blur-sm rounded-full"
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="glass-card-light rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-orange-500" />
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area */}
              <div className="px-4 py-3 border-t border-white/18 dark:border-white/08 glass-card-light">
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    disabled={isLoading}
                    className="flex-1 glass-input border-white/18 dark:border-white/08"
                  />
                  <Button
                    onClick={() => sendMessage(inputValue)}
                    disabled={!inputValue.trim() || isLoading}
                    size="sm"
                    className="px-3 bg-orange-500 hover:bg-orange-600"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default SupportAgent;
