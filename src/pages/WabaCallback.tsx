import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { fetchWithAuthJson } from '@/lib/fetchWithAuth';

interface WabaCallbackResponse {
  state: string;
  status: string;
  company_id: string;
  message: string;
  authorization_code?: string;
  error?: string;
}

export default function WabaCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<WabaCallbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [isPopup, setIsPopup] = useState(false);

  // Verificar se está dentro de popup ao montar componente
  useEffect(() => {
    setIsPopup(window.opener !== null && !window.opener.closed);
  }, []);

  useEffect(() => {
    // Verificar se veio do redirect do backend (com status já processado)
    const status = searchParams.get('status');
    const state = searchParams.get('state');
    const message = searchParams.get('message');
    const companyId = searchParams.get('company_id');
    const errorParam = searchParams.get('error');

    // Se veio do redirect do backend (já processado) - sucesso
    if (status === 'success' && state && companyId) {
      setResult({
        state,
        status: 'authorized',
        company_id: companyId,
        message: message || 'WhatsApp Business conectado com sucesso!',
      });
      setLoading(false);
      setCountdown(15);
      return;
    }

    // Se veio do redirect com erro
    if (status === 'error') {
      setError(errorParam || message || 'Erro ao processar autorização');
      setLoading(false);
      return;
    }

    // Fluxo original: callback direto do Meta (precisa processar no backend)
    const code = searchParams.get('code');
    const errorFromMeta = searchParams.get('error');

    if (!state) {
      setError('State não encontrado na URL de callback');
      setLoading(false);
      return;
    }

    // Fazer chamada ao backend para processar callback
    const processCallback = async () => {
      try {
        const params = new URLSearchParams({
          state,
          ...(code && { code }),
          ...(errorFromMeta && { error: errorFromMeta }),
        });

        const response = await fetchWithAuthJson<WabaCallbackResponse>(
          `/integrations/waba/callback?${params.toString()}`
        );

        setResult(response);
        setLoading(false);
        
        // Resetar countdown quando resultado for autorizado
        if (response.status === 'authorized') {
          setCountdown(15);
        }
      } catch (err: any) {
        setError(err?.detail || err?.message || 'Erro ao processar callback do WhatsApp');
        setLoading(false);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  // Countdown para redirecionamento automático
  useEffect(() => {
    if (result?.status === 'authorized' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (result?.status === 'authorized' && countdown === 0) {
      navigate('/channels');
    }
  }, [result, countdown, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-12">
          <Loader2 className="h-12 w-12 animate-spin text-[#EC4899]" />
          <p className="text-sm text-gray-400">Processando autorização do WhatsApp Business...</p>
        </div>
      </div>
    );
  }

  if (error || result?.status === 'failed') {
    const errorMessage = error || result?.error || result?.message || 'Erro desconhecido';

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] p-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-white/[0.05] p-8">
          <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
            <XCircle className="h-5 w-5 text-red-400" />
            <AlertTitle className="text-white">Falha na autorização</AlertTitle>
            <AlertDescription className="mt-2 text-gray-300">{errorMessage}</AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/channels')}
              className="flex-1 border-white/20 bg-black/40 text-gray-200 hover:bg-black/60"
            >
              Voltar para Canais
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="flex-1 bg-[#EC4899] text-white hover:bg-[#EC4899]/90"
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Verificar se está dentro de popup e fechar automaticamente após sucesso
  useEffect(() => {
    if (result?.status === 'authorized' && isPopup) {
      // Enviar mensagem para janela pai primeiro
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: 'WABA_SIGNUP_SUCCESS',
              data: {
                state: result.state,
                company_id: result.company_id,
                message: result.message,
              },
            },
            window.location.origin
          );
        }
      } catch (err) {
        console.error("waba.send_message_error", { error: err instanceof Error ? err.message : String(err) });
      }

      // Tentar fechar o popup múltiplas vezes
      // Alguns navegadores bloqueiam window.close() após redirect, então tentamos várias estratégias
      const tryClose = () => {
        try {
          if (window.opener && !window.opener.closed) {
            // Método 1: window.close() direto
            window.close();
            
            // Método 2: Tentar com setTimeout (permite que navegador processe o close)
            setTimeout(() => {
              if (!document.hidden && window.opener && !window.opener.closed) {
                window.close();
              }
            }, 100);
            
            // Método 3: Tentar novamente após 500ms
            setTimeout(() => {
              if (!document.hidden && window.opener && !window.opener.closed) {
                window.close();
              }
            }, 500);
            
            // Método 4: Última tentativa após 1 segundo
            setTimeout(() => {
              if (!document.hidden && window.opener && !window.opener.closed) {
                window.close();
              }
            }, 1000);
          }
        } catch (err) {
          console.error("waba.popup_close_error", { error: err instanceof Error ? err.message : String(err) });
        }
      };

      // Primeira tentativa após 100ms (permite renderização)
      setTimeout(tryClose, 100);
      
      // Segunda tentativa após 300ms
      setTimeout(tryClose, 300);
    }
  }, [result, isPopup]);

  if (result?.status === 'authorized') {
    // Se estiver dentro de popup, mostrar mensagem mínima (será fechado automaticamente)
    if (isPopup) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#050505] p-4">
          <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-center">
            <Alert className="border-emerald-500/50 bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <AlertTitle className="text-white">Autorização concluída!</AlertTitle>
              <AlertDescription className="mt-2 text-gray-300">
                {result.message || 'WhatsApp Business conectado com sucesso!'}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-gray-400">Esta janela será fechada automaticamente...</p>
            <Button
              onClick={() => {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage(
                    {
                      type: 'WABA_SIGNUP_SUCCESS',
                      data: {
                        state: result.state,
                        company_id: result.company_id,
                        message: result.message,
                      },
                    },
                    window.location.origin
                  );
                }
                window.close();
              }}
              className="w-full bg-[#EC4899] text-white hover:bg-[#EC4899]/90"
            >
              Fechar
            </Button>
          </div>
        </div>
      );
    }

    // Se não estiver em popup, mostrar UI completa
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] p-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-white/[0.05] p-8">
          <Alert className="border-emerald-500/50 bg-emerald-500/10">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <AlertTitle className="text-white">Autorização concluída</AlertTitle>
            <AlertDescription className="mt-2 text-gray-300">
              {result.message || 'WhatsApp Business conectado com sucesso!'}
            </AlertDescription>
          </Alert>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-gray-400">
            <p>
              <span className="text-gray-500">State:</span> {result.state}
            </p>
            {result.authorization_code && (
              <p className="mt-2">
                <span className="text-gray-500">Code:</span>{' '}
                <span className="font-mono text-gray-300">{result.authorization_code.substring(0, 20)}...</span>
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center text-sm text-gray-300">
            <p>
              Redirecionando automaticamente em{' '}
              <span className="font-semibold text-emerald-400">{countdown}</span> segundos
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Ou clique no botão abaixo para ir agora
            </p>
          </div>

          <Button
            onClick={() => navigate('/channels')}
            className="w-full bg-[#EC4899] text-white hover:bg-[#EC4899]/90"
          >
            Ir para Canais Agora
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] p-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-white/[0.05] p-8">
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          <AlertTitle className="text-white">Aguardando processamento</AlertTitle>
          <AlertDescription className="mt-2 text-gray-300">
            Status: {result?.status || 'pending'}
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => navigate('/channels')}
          className="w-full bg-[#EC4899] text-white hover:bg-[#EC4899]/90"
        >
          Voltar para Canais
        </Button>
      </div>
    </div>
  );
}

