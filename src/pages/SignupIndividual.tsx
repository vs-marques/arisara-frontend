import { useState, FormEvent, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { CloudinaryImage } from '@/components/CloudinaryImage';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { EmailIcon, LockIcon, UserIcon, PhoneIcon, CpfIcon } from '@/components/ui/icons';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthText } from '@/utils/passwordValidation';
import { Eye, EyeOff } from 'lucide-react';

export default function SignupIndividual() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const prefill = location.state?.prefill || {};
  const searchParams = new URLSearchParams(location.search);
  const tokenFromQuery = searchParams.get('token');
  const invitationToken = location.state?.invitationToken ?? tokenFromQuery ?? null;
  const initialInviteContext = location.state?.inviteContext ?? null;
  const [inviteContext, setInviteContext] = useState<any>(initialInviteContext);
  const [inviteLoading, setInviteLoading] = useState<boolean>(Boolean(invitationToken) && !initialInviteContext);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: prefill.email || initialInviteContext?.email || '',
    password: '',
    confirmPassword: '',
    name: prefill.name || initialInviteContext?.invitee_name || '',
    cpf: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cpfExists, setCpfExists] = useState(false);
  const [isCheckingCpf, setIsCheckingCpf] = useState(false);
  const [showCpfTooltip, setShowCpfTooltip] = useState(false);
  const shadowRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const isInviteFlow = Boolean(invitationToken);

  // Efeito ripple
  const createRipple = (e: React.MouseEvent<HTMLButtonElement>, ref: React.RefObject<HTMLButtonElement>) => {
    const button = ref.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.className = 'ripple-effect';

    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 1000);
  };

  // Efeito de sombra que segue o mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!shadowRef.current || !cardRef.current) return;
      
      const { clientX, clientY } = e;
      const cardElement = e.target as HTMLElement;
      
      if (cardElement.closest('#card')) {
        shadowRef.current.style.setProperty(
          'transform',
          `translateX(${clientX - 60}px) translateY(${clientY - 60}px)`
        );
        shadowRef.current.style.setProperty('opacity', '0.5');
      } else {
        shadowRef.current.style.setProperty('opacity', '0');
      }
    };

    document.body.addEventListener('mousemove', handleMouseMove as any);
    return () => {
      document.body.removeEventListener('mousemove', handleMouseMove as any);
    };
  }, []);

  useEffect(() => {
    if (!invitationToken || inviteContext) {
      setInviteLoading(false);
      return;
    }

    let isMounted = true;
    setInviteLoading(true);
    setInviteError(null);

    api
      .get('/signup/invitation/validate', { params: { token: invitationToken } })
      .then((response) => {
        if (!isMounted) return;
        setInviteContext(response.data);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        const message = err.response?.data?.detail || 'Este convite é inválido ou expirou.';
        setInviteError(message);
      })
      .finally(() => {
        if (isMounted) {
          setInviteLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [invitationToken, inviteContext]);

  useEffect(() => {
    if (!inviteContext) return;

    setFormData((prev) => {
      let changed = false;
      const next = { ...prev };

      if (prev.email !== inviteContext.email) {
        next.email = inviteContext.email;
        changed = true;
      }

      if (!prev.name && inviteContext.invitee_name) {
        next.name = inviteContext.invitee_name;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [inviteContext]);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  // Função para verificar se CPF já está cadastrado
  const checkCpfExists = async (cpf: string) => {
    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cleanCpf.length !== 11) {
      setCpfExists(false);
      return;
    }

    setIsCheckingCpf(true);
    try {
      const response = await api.get('/signup/check-document', {
        params: {
          document: cleanCpf,
          document_type: 'cpf'
        }
      });
      
      setCpfExists(response.data.exists || false);
    } catch (err: any) {
      // Se houver erro na validação do CPF, não considerar como duplicado
      if (err.response?.status === 400) {
        setCpfExists(false);
      }
      console.warn("signup.check_cpf_error", { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsCheckingCpf(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (inviteLoading) {
      return;
    }

    if (isInviteFlow && inviteError) {
      setError(inviteError);
      return;
    }

    // Validar força da senha
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join('. '));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    // Verificar se CPF já está cadastrado antes de submeter
    if (cpfExists) {
      setError('Este CPF já está cadastrado no sistema.');
      return;
    }

    const emailToSubmit =
      isInviteFlow && inviteContext ? inviteContext.email : formData.email;

    if (!emailToSubmit) {
      setError('Não foi possível identificar o email do convite.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/signup/individual', {
        email: emailToSubmit.toLowerCase(),
        password: formData.password,
        name: formData.name,
        cpf: formData.cpf.replace(/\D/g, ''),
        phone: formData.phone ? formData.phone.replace(/\D/g, '') : null,
        invitation_token: invitationToken || undefined,
      });

      toast({
        title: 'Cadastro realizado!',
        description: response.data.message || 'Verifique seu email para ativar sua conta.',
        variant: 'default',
      });

      navigate('/login', { 
        state: { 
          message: 'Cadastro realizado! Verifique seu email para ativar sua conta.' 
        } 
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Erro ao realizar cadastro. Tente novamente.';
      setError(errorMessage);
      toast({
        title: 'Erro no cadastro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderInviteBanner = () => {
    if (!isInviteFlow || !inviteContext) return null;

    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-sm text-gray-200 backdrop-blur">
        <p className="font-medium text-white">
          Convite confirmado para {inviteContext.invitee_name || inviteContext.email}
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Você foi convidado pela equipe {inviteContext.company_name || 'Arisara'} com o papel{' '}
          <span className="font-semibold text-[#EC4899]">{inviteContext.user_type}</span>. Complete seus dados para finalizar o acesso.
        </p>
      </div>
    );
  };

  const renderInviteState = () => {
    if (!isInviteFlow) return null;

    if (inviteLoading) {
      return (
        <div className="space-y-6 py-8 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-sm text-gray-300">Validando seu convite...</p>
        </div>
      );
    }

    if (inviteError) {
      return (
        <div className="space-y-6 py-8 text-center">
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {inviteError}
          </div>
          <p className="text-xs text-gray-400">
            Solicite um novo convite ao administrador ou entre em contato com{' '}
            <a className="text-[#EC4899]" href="mailto:support@nyoka.com.br">
              support@nyoka.com.br
            </a>
            .
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-wide text-white transition hover:bg-white/10"
            >
              Ir para o login
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const effectiveEmail = inviteContext?.email ?? formData.email;
  const showForm = !isInviteFlow || (isInviteFlow && !inviteLoading && !inviteError);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden py-8">
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
      
      {/* Sombra que segue o mouse */}
      <div
        id="shadow"
        ref={shadowRef}
        className="fixed top-0 left-0 z-10 h-32 w-32 rounded-full bg-[#EC4899] blur-[70px] transition-opacity duration-300 opacity-0 pointer-events-none"
      />

      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-radial from-[#EC4899]/10 via-transparent to-transparent blur-3xl" />

      <div className="relative z-10 w-full max-w-2xl px-5 sm:px-10">
        <div
          id="card"
          ref={cardRef}
          className="relative mx-auto my-auto w-full max-w-[32rem] shrink-0 overflow-hidden rounded-4xl border-t border-white/20 bg-gradient-to-t from-zinc-100/10 to-zinc-950/50 to-50% p-8 text-white shadow-2xl shadow-black outline outline-white/5 -outline-offset-1 backdrop-blur-2xl animate-fade-in-up"
        >
          {/* Logo */}
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
              <CloudinaryImage
                publicId="logo_arisara_lettering_gvdyuz"
                alt="Arisara"
                className="h-12 w-auto -mt-4"
              />
            </a>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mt-4">
              Cadastro Individual
            </p>
          </div>
          {renderInviteState()}

          {showForm && (
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            {renderInviteBanner()}

            {/* Seção 1: Dados Pessoais */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">Dados Pessoais</h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>

              <div className="space-y-4">
                {/* Nome */}
                <div className="relative h-11 overflow-hidden">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="peer relative z-10 h-full w-full rounded-md border border-white/8 bg-zinc-900/50 pr-4 pl-11 duration-300 placeholder:text-white/40 focus:outline-0 text-white"
                    placeholder="Nome completo"
                  />
                  <div className="pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 text-white/20 duration-300 peer-focus-visible:text-white">
                    <UserIcon />
                  </div>
                  <span className="absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40"></span>
                  <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
                </div>

                {/* CPF e Telefone lado a lado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* CPF */}
                  <div 
                    className="relative h-11 overflow-visible"
                    onMouseEnter={() => cpfExists && setShowCpfTooltip(true)}
                    onMouseLeave={() => setShowCpfTooltip(false)}
                  >
                    <input
                      id="cpf"
                      name="cpf"
                      type="text"
                      required
                      maxLength={14}
                      value={formData.cpf}
                      onChange={(e) => {
                        const formatted = formatCPF(e.target.value);
                        setFormData({ ...formData, cpf: formatted });
                        setCpfExists(false); // Reset ao digitar
                      }}
                      onBlur={(e) => {
                        if (e.target.value.replace(/\D/g, '').length === 11) {
                          checkCpfExists(e.target.value);
                        }
                      }}
                      className={`peer relative z-10 h-full w-full rounded-md border ${
                        cpfExists ? 'border-red-500/50' : 'border-white/8'
                      } bg-zinc-900/50 ${
                        isCheckingCpf ? 'pr-11' : 'pr-4'
                      } pl-11 duration-300 placeholder:text-white/40 focus:outline-0 ${
                        cpfExists ? 'text-red-400' : 'text-white'
                      } ${isCheckingCpf ? 'opacity-70' : ''}`}
                      placeholder="000.000.000-00"
                      disabled={isCheckingCpf}
                    />
                    <div className={`pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 duration-300 peer-focus-visible:text-white ${
                      cpfExists ? 'text-red-400/60' : 'text-white/20'
                    }`}>
                      <CpfIcon />
                    </div>
                    {isCheckingCpf && (
                      <div className="pointer-events-none absolute top-3 right-3.5 z-20">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                    <span className={`absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40 ${
                      cpfExists ? '!opacity-100 !via-red-500' : ''
                    }`}></span>
                    <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
                    
                    {/* Tooltip para CPF duplicado */}
                    {showCpfTooltip && cpfExists && (
                      <div className="absolute left-0 top-full mt-2 z-30 w-64 rounded-lg bg-red-500/95 border border-red-400/50 px-3 py-2 text-xs text-white shadow-lg animate-fade-in">
                        <p className="font-medium">CPF já cadastrado</p>
                        <p className="text-red-100 mt-0.5">Este documento já foi cadastrado anteriormente no sistema.</p>
                        <div className="absolute -top-1 left-6 w-2 h-2 bg-red-500/95 border-l border-t border-red-400/50 transform rotate-45"></div>
                      </div>
                    )}
                  </div>

                  {/* Telefone */}
                  <div className="relative h-11 overflow-hidden">
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      maxLength={15}
                      value={formData.phone}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        setFormData({ ...formData, phone: formatted });
                      }}
                      className="peer relative z-10 h-full w-full rounded-md border border-white/8 bg-zinc-900/50 pr-4 pl-11 duration-300 placeholder:text-white/40 focus:outline-0 text-white"
                      placeholder="(00) 00000-0000"
                    />
                    <div className="pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 text-white/20 duration-300 peer-focus-visible:text-white">
                      <PhoneIcon />
                    </div>
                    <span className="absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40"></span>
                    <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 2: Dados de Acesso */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">Dados de Acesso</h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>

              <div className="space-y-4">
                {/* Email */}
                <div className="relative h-11 overflow-hidden">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={effectiveEmail}
                    onChange={(e) => {
                      if (isInviteFlow) return;
                      setFormData({ ...formData, email: e.target.value });
                    }}
                    readOnly={isInviteFlow}
                    className={`peer relative z-10 h-full w-full rounded-md border ${
                      isInviteFlow ? 'border-[#EC4899]/60 bg-zinc-900/60 text-gray-200' : 'border-white/8 bg-zinc-900/50 text-white'
                    } pr-4 pl-11 duration-300 placeholder:text-white/40 focus:outline-0`}
                    placeholder="seu@email.com"
                  />
                  <div className="pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 text-white/20 duration-300 peer-focus-visible:text-white">
                    <EmailIcon />
                  </div>
                  <span className="absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40"></span>
                  <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
                </div>

                {/* Senha e Confirmar Senha lado a lado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Senha */}
                  <div className="space-y-2">
                    <div className="relative h-11 overflow-hidden">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={formData.password}
                        onChange={(e) => {
                          const validation = validatePassword(e.target.value);
                          setPasswordStrength(validation.strength);
                          setFormData({ ...formData, password: e.target.value });
                          if (e.target.value.length > 0) {
                            setShowPasswordRequirements(true);
                          }
                        }}
                        onFocus={() => setShowPasswordRequirements(true)}
                        onBlur={() => {
                          if (formData.password.length === 0) {
                            setShowPasswordRequirements(false);
                          }
                        }}
                        className="peer relative z-10 h-full w-full rounded-md border border-white/8 bg-zinc-900/50 pr-11 pl-11 duration-300 placeholder:text-white/40 focus:outline-0 text-white"
                        placeholder="Senha forte"
                      />
                      <div className="pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 text-white/20 duration-300 peer-focus-visible:text-white">
                        <LockIcon />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 z-20 p-1 text-white/40 hover:text-white transition-colors duration-300 focus:outline-none"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4.5 w-4.5" />
                        ) : (
                          <Eye className="h-4.5 w-4.5" />
                        )}
                      </button>
                      <span className="absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40"></span>
                      <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
                    </div>
                    
                    {/* Indicador de força da senha */}
                    {formData.password.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60">Força:</span>
                          <span className={`font-medium ${passwordStrength === 'weak' ? 'text-red-400' : passwordStrength === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                            {getPasswordStrengthText(passwordStrength)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                            style={{
                              width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%'
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Requisitos da senha */}
                    {showPasswordRequirements && (
                      <div className="text-xs text-white/50 space-y-1">
                        <p className="font-medium text-white/70 mb-1">A senha deve conter:</p>
                        <ul className="space-y-0.5 ml-4 list-disc">
                          <li className={formData.password.length >= 8 ? 'text-green-400' : ''}>No mínimo 8 caracteres</li>
                          <li className={/[A-Z]/.test(formData.password) ? 'text-green-400' : ''}>Pelo menos uma letra maiúscula</li>
                          <li className={/[a-z]/.test(formData.password) ? 'text-green-400' : ''}>Pelo menos uma letra minúscula</li>
                          <li className={/[0-9]/.test(formData.password) ? 'text-green-400' : ''}>Pelo menos um número</li>
                          <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-green-400' : ''}>Pelo menos um caractere especial</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Confirmar Senha */}
                  <div className="relative h-11 overflow-hidden">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="peer relative z-10 h-full w-full rounded-md border border-white/8 bg-zinc-900/50 pr-11 pl-11 duration-300 placeholder:text-white/40 focus:outline-0 text-white"
                      placeholder="Confirmar senha"
                    />
                    <div className="pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 text-white/20 duration-300 peer-focus-visible:text-white">
                      <LockIcon />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 z-20 p-1 text-white/40 hover:text-white transition-colors duration-300 focus:outline-none"
                      aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4.5 w-4.5" />
                      ) : (
                        <Eye className="h-4.5 w-4.5" />
                      )}
                    </button>
                    <span className="absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40"></span>
                    <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Submit */}
            <button
              ref={submitBtnRef}
              type="submit"
              disabled={isLoading}
              onMouseEnter={(e) => createRipple(e, submitBtnRef)}
              className="relative mt-8 h-12 w-full rounded-2xl bg-[#0a0a0a] border border-white/10 text-white text-sm font-medium transition-all duration-300 hover:bg-[#EC4899] hover:border-[#EC4899] hover:shadow-[0_20px_60px_-20px_rgba(236,72,153,0.6)] overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0a0a0a] disabled:hover:border-white/10 disabled:hover:shadow-none"
            >
              {isLoading ? 'Cadastrando...' : 'Criar Conta'}
            </button>

            {/* Links */}
            <div className="text-center space-y-2 mt-6">
              <p className="text-sm text-gray-500">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-[#EC4899] hover:text-[#EC4899]/80 transition-colors">
                  Fazer login
                </Link>
              </p>
            </div>

            {/* Efeito de brilho inferior */}
            <div className="absolute inset-x-32 -bottom-20 left-32 h-10 bg-white blur-2xl opacity-20"></div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
