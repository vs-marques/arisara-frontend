import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CloudinaryImage } from '@/components/CloudinaryImage';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export default function Activate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const successLinkRef = useRef<HTMLAnchorElement>(null);
  const errorLoginRef = useRef<HTMLAnchorElement>(null);
  const errorSignupRef = useRef<HTMLAnchorElement>(null);

  const createRipple = (
    e: React.MouseEvent<HTMLElement>,
    ref: React.RefObject<HTMLElement>
  ) => {
    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.className = 'ripple-effect';

    element.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 1000);
  };

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de ativação não fornecido');
      return;
    }

    const activateAccount = async () => {
      try {
        const response = await api.post(`/signup/activate?token=${token}`);
        
        setStatus('success');
        setMessage(response.data.message || 'Conta ativada com sucesso! Você já pode fazer login.');
        
        toast({
          title: 'Conta ativada!',
          description: 'Sua conta foi ativada com sucesso. Você já pode fazer login.',
          variant: 'default',
        });

        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Conta ativada com sucesso! Faça login para continuar.' 
            } 
          });
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        const errorMessage = err.response?.data?.detail || err.message || 'Erro ao ativar conta. Token pode estar expirado ou inválido.';
        setMessage(errorMessage);
        
        toast({
          title: 'Erro na ativação',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    };

    activateAccount();
  }, [token, navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden">
      {/* Background Image */}
      <img
        src="https://res.cloudinary.com/dtijk612b/image/upload/v1762466905/nyoka_login_background_tspjfr.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover animate-fade-in"
        style={{
          objectPosition: 'center center'
        }}
      />
      
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 animate-fade-in" />
      
      <div className="absolute inset-0 bg-gradient-radial from-[#EC4899]/10 via-transparent to-transparent blur-3xl" />
      
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="glass-panel rounded-3xl p-8 shadow-[0_40px_100px_-40px_rgba(236,72,153,0.4)] animate-fade-in-up">
          <div className="flex flex-col items-center mb-8">
            <a
              href={import.meta.env.VITE_LANDING_URL || 'https://nyoka.ai'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity duration-200"
            >
              <CloudinaryImage
                publicId="logo_arisara_gkkkb7"
                alt="Arisara"
                className="h-32 w-auto"
              />
            </a>
            <h2 className="text-2xl font-bold text-white mt-4">
              {status === 'loading' && 'Ativando conta...'}
              {status === 'success' && 'Conta Ativada!'}
              {status === 'error' && 'Erro na Ativação'}
            </h2>
          </div>

          <div className="space-y-6">
            {status === 'loading' && (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 border-4 border-[#EC4899]/30 border-t-[#EC4899] rounded-full animate-spin" />
                <p className="text-gray-400 text-center">
                  Aguarde enquanto ativamos sua conta...
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-300 text-center">
                  <p className="font-semibold mb-2">✅ {message}</p>
                </div>
                <p className="text-gray-400 text-center text-sm">
                  Você será redirecionado para a página de login em instantes...
                </p>
                <Link
                  ref={successLinkRef}
                  to="/login"
                  onMouseEnter={(e) => createRipple(e, successLinkRef)}
                  className="relative block w-full py-3 px-4 rounded-2xl bg-[#EC4899] hover:bg-[#EC4899]/80 text-white font-medium text-center transition-colors overflow-hidden"
                >
                  Ir para Login
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-300 text-center">
                  <p className="font-semibold mb-2">❌ {message}</p>
                </div>
                <div className="space-y-2">
                  <Link
                    ref={errorLoginRef}
                    to="/login"
                    onMouseEnter={(e) => createRipple(e, errorLoginRef)}
                    className="relative block w-full py-3 px-4 rounded-2xl bg-[#EC4899] hover:bg-[#EC4899]/80 text-white font-medium text-center transition-colors overflow-hidden"
                  >
                    Ir para Login
                  </Link>
                  <Link
                    ref={errorSignupRef}
                    to="/signup/individual"
                    onMouseEnter={(e) => createRipple(e, errorSignupRef)}
                    className="relative block w-full py-3 px-4 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-[#EC4899] text-white font-medium text-center transition-colors overflow-hidden"
                  >
                    Criar Nova Conta
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

