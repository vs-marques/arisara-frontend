import { useState, FormEvent, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CloudinaryImage } from '@/components/CloudinaryImage';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { EmailIcon, LockIcon, UserIcon, PhoneIcon, CpfIcon, CnpjIcon, CompanyIcon, CopyIcon } from '@/components/ui/icons';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthText } from '@/utils/passwordValidation';
import { Eye, EyeOff } from 'lucide-react';

export default function SignupBusiness() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    adminName: '',
    adminCpf: '',
    adminPhone: '',
    companyName: '',
    cnpj: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [apiKeys, setApiKeys] = useState<{ api_key?: string; api_secret?: string } | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cpfExists, setCpfExists] = useState(false);
  const [cnpjExists, setCnpjExists] = useState(false);
  const [isCheckingCpf, setIsCheckingCpf] = useState(false);
  const [isCheckingCnpj, setIsCheckingCnpj] = useState(false);
  const [showCpfTooltip, setShowCpfTooltip] = useState(false);
  const [showCnpjTooltip, setShowCnpjTooltip] = useState(false);
  const shadowRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const goToLoginBtnRef = useRef<HTMLButtonElement>(null);

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

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
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
      if (err.response?.status === 400) {
        setCpfExists(false);
      }
      console.warn("signup.check_cpf_error", { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsCheckingCpf(false);
    }
  };

  // Função para verificar se CNPJ já está cadastrado
  const checkCnpjExists = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    // Verifica se tem 14 dígitos
    if (cleanCnpj.length !== 14) {
      setCnpjExists(false);
      return;
    }

    setIsCheckingCnpj(true);
    try {
      const response = await api.get('/signup/check-document', {
        params: {
          document: cleanCnpj,
          document_type: 'cnpj'
        }
      });
      
      setCnpjExists(response.data.exists || false);
    } catch (err: any) {
      if (err.response?.status === 400) {
        setCnpjExists(false);
      }
      console.warn("signup.check_cnpj_error", { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsCheckingCnpj(false);
    }
  };

  // Função para consultar CNPJ na API do CNPJA
  const fetchCnpjData = async (cnpj: string) => {
    // Remove formatação do CNPJ
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    // Verifica se tem 14 dígitos
    if (cleanCnpj.length !== 14) {
      return;
    }

    setIsFetchingCnpj(true);
    setError('');

    try {
      const response = await fetch(`https://open.cnpja.com/office/${cleanCnpj}`);
      
      if (!response.ok) {
        throw new Error('CNPJ não encontrado');
      }

      const data = await response.json();
      
      // Preenche o nome da empresa automaticamente
      if (data.name) {
        setFormData(prev => ({ ...prev, companyName: data.name }));
        toast({
          title: 'Empresa encontrada!',
          description: 'Os dados da empresa foram preenchidos automaticamente.',
          variant: 'default',
        });
      }
    } catch (err: any) {
      // Não exibe erro se o CNPJ não for encontrado, apenas loga
      console.warn("signup.fetch_cnpj_error", { error: err instanceof Error ? err.message : String(err) });
      // Permite que o usuário continue preenchendo manualmente
    } finally {
      setIsFetchingCnpj(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar força da senha
    const passwordValidation = validatePassword(formData.adminPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join('. '));
      return;
    }

    if (formData.adminPassword !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    // Verificar se CPF ou CNPJ já estão cadastrados antes de submeter
    if (cpfExists) {
      setError('Este CPF já está cadastrado no sistema.');
      return;
    }

    if (cnpjExists) {
      setError('Este CNPJ já está cadastrado no sistema.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/signup/business', {
        admin_email: formData.adminEmail.toLowerCase(),
        admin_password: formData.adminPassword,
        admin_name: formData.adminName,
        admin_cpf: formData.adminCpf.replace(/\D/g, ''),
        admin_phone: formData.adminPhone ? formData.adminPhone.replace(/\D/g, '') : null,
        company_name: formData.companyName,
        cnpj: formData.cnpj.replace(/\D/g, ''),
      });

      if (response.data.api_key && response.data.api_secret) {
        setApiKeys({
          api_key: response.data.api_key,
          api_secret: response.data.api_secret,
        });
        setShowApiKeys(true);
      }

      toast({
        title: 'Empresa cadastrada!',
        description: response.data.message || 'Verifique seu email para ativar sua conta.',
        variant: 'default',
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: `${label} copiado para a área de transferência`,
      variant: 'default',
    });
  };

  // Tela de exibição das API Keys
  if (showApiKeys && apiKeys) {
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
        
        <div className="absolute inset-0 bg-gradient-radial from-[#EC4899]/10 via-transparent to-transparent blur-3xl" />
        
        <div className="relative z-10 w-full max-w-2xl px-5 sm:px-10">
          <div className="relative mx-auto my-auto w-full max-w-[32rem] shrink-0 overflow-hidden rounded-4xl border-t border-white/20 bg-gradient-to-t from-zinc-100/10 to-zinc-950/50 to-50% p-8 text-white shadow-2xl shadow-black outline outline-white/5 -outline-offset-1 backdrop-blur-2xl animate-fade-in-up">
            <div className="flex flex-col items-center mb-8">
              <a
              href={import.meta.env.VITE_LANDING_URL || 'https://arisara.com.br'}
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
                API Keys da Empresa
              </p>
            </div>

            <h2 className="mb-6 text-[1.4rem] font-medium text-center">
              Suas chaves de API foram geradas!
            </h2>
            <p className="text-sm text-gray-400 mb-6 text-center">
              Guarde-as em um local seguro. Elas não serão exibidas novamente.
            </p>

            <div className="space-y-4">
              <div className="rounded-2xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-300">
                <p className="font-semibold mb-1">⚠️ IMPORTANTE</p>
                <p>Salve essas credenciais agora. Você receberá um email com elas, mas guarde-as em local seguro.</p>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">API Key</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={apiKeys.api_key}
                    className="w-full px-4 py-3 rounded-md border border-white/8 bg-zinc-900/50 text-white text-sm pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => apiKeys.api_key && copyToClipboard(apiKeys.api_key, 'API Key')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-white/10 transition-colors"
                    title="Copiar API Key"
                  >
                    <CopyIcon className="h-4 w-4 text-white/70" />
                  </button>
                </div>
              </div>

              {/* API Secret */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">API Secret</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={apiKeys.api_secret}
                    className="w-full px-4 py-3 rounded-md border border-white/8 bg-zinc-900/50 text-white text-sm pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => apiKeys.api_secret && copyToClipboard(apiKeys.api_secret, 'API Secret')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-white/10 transition-colors"
                    title="Copiar API Secret"
                  >
                    <CopyIcon className="h-4 w-4 text-white/70" />
                  </button>
                </div>
              </div>
            </div>

            <button
              ref={goToLoginBtnRef}
              onClick={() => navigate('/login')}
              onMouseEnter={(e) => createRipple(e, goToLoginBtnRef)}
              className="relative mt-8 h-12 w-full rounded-2xl bg-[#0a0a0a] border border-white/10 text-white text-sm font-medium transition-all duration-300 hover:bg-[#EC4899] hover:border-[#EC4899] hover:shadow-[0_20px_60px_-20px_rgba(236,72,153,0.6)] overflow-hidden"
            >
              Ir para o Login
            </button>

            <div className="absolute inset-x-32 -bottom-20 left-32 h-10 bg-white blur-2xl opacity-20"></div>
          </div>
        </div>
      </div>
    );
  }

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
              Cadastro de Empresa
            </p>
          </div>



          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            {/* Seção 1: Dados do Responsável */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">Dados do Responsável</h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>

              <div className="space-y-4">
                {/* Nome do Responsável */}
                <div className="relative h-11 overflow-hidden">
                  <input
                    id="adminName"
                    name="adminName"
                    type="text"
                    required
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    className="peer relative z-10 h-full w-full rounded-md border border-white/8 bg-zinc-900/50 pr-4 pl-11 duration-300 placeholder:text-white/40 focus:outline-0 text-white"
                    placeholder="Nome completo do responsável"
                  />
                  <div className="pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 text-white/20 duration-300 peer-focus-visible:text-white">
                    <UserIcon />
                  </div>
                  <span className="absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40"></span>
                  <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
                </div>

                {/* Email */}
                <div className="relative h-11 overflow-hidden">
                  <input
                    id="adminEmail"
                    name="adminEmail"
                    type="email"
                    required
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    className="peer relative z-10 h-full w-full rounded-md border border-white/8 bg-zinc-900/50 pr-4 pl-11 duration-300 placeholder:text-white/40 focus:outline-0 text-white"
                    placeholder="email@empresa.com"
                  />
                  <div className="pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 text-white/20 duration-300 peer-focus-visible:text-white">
                    <EmailIcon />
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
                      id="adminCpf"
                      name="adminCpf"
                      type="text"
                      required
                      maxLength={14}
                      value={formData.adminCpf}
                      onChange={(e) => {
                        const formatted = formatCPF(e.target.value);
                        setFormData({ ...formData, adminCpf: formatted });
                        setCpfExists(false);
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
                      id="adminPhone"
                      name="adminPhone"
                      type="tel"
                      maxLength={15}
                      value={formData.adminPhone}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        setFormData({ ...formData, adminPhone: formatted });
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

            {/* Seção 2: Dados da Empresa */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">Dados da Empresa</h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>

              <div className="space-y-4">
                {/* CNPJ */}
                <div 
                  className="relative h-11 overflow-visible"
                  onMouseEnter={() => cnpjExists && setShowCnpjTooltip(true)}
                  onMouseLeave={() => setShowCnpjTooltip(false)}
                >
                  <input
                    id="cnpj"
                    name="cnpj"
                    type="text"
                    required
                    maxLength={18}
                    value={formData.cnpj}
                    onChange={(e) => {
                      const formatted = formatCNPJ(e.target.value);
                      setFormData({ ...formData, cnpj: formatted });
                      setCnpjExists(false);
                    }}
                    onBlur={async (e) => {
                      const cleanCnpj = e.target.value.replace(/\D/g, '');
                      if (cleanCnpj.length === 14) {
                        // Verificar se CNPJ já está cadastrado
                        await checkCnpjExists(e.target.value);
                        // Consulta a API do CNPJA para buscar dados
                        if (!isFetchingCnpj) {
                          fetchCnpjData(e.target.value);
                        }
                      }
                    }}
                    className={`peer relative z-10 h-full w-full rounded-md border ${
                      cnpjExists ? 'border-red-500/50' : 'border-white/8'
                    } bg-zinc-900/50 ${
                      isFetchingCnpj || isCheckingCnpj ? 'pr-11' : 'pr-4'
                    } pl-11 duration-300 placeholder:text-white/40 focus:outline-0 ${
                      cnpjExists ? 'text-red-400' : 'text-white'
                    } ${isFetchingCnpj || isCheckingCnpj ? 'opacity-70' : ''}`}
                    placeholder="00.000.000/0000-00"
                    disabled={isFetchingCnpj || isCheckingCnpj}
                  />
                  <div className={`pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 duration-300 peer-focus-visible:text-white ${
                    cnpjExists ? 'text-red-400/60' : 'text-white/20'
                  }`}>
                    <CnpjIcon />
                  </div>
                  {(isFetchingCnpj || isCheckingCnpj) && (
                    <div className="pointer-events-none absolute top-3 right-3.5 z-20">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  <span className={`absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40 ${
                    cnpjExists ? '!opacity-100 !via-red-500' : ''
                  }`}></span>
                  <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
                  
                  {/* Tooltip para CNPJ duplicado */}
                  {showCnpjTooltip && cnpjExists && (
                    <div className="absolute left-0 top-full mt-2 z-30 w-64 rounded-lg bg-red-500/95 border border-red-400/50 px-3 py-2 text-xs text-white shadow-lg animate-fade-in">
                      <p className="font-medium">CNPJ já cadastrado</p>
                      <p className="text-red-100 mt-0.5">Este documento já foi cadastrado anteriormente no sistema.</p>
                      <div className="absolute -top-1 left-6 w-2 h-2 bg-red-500/95 border-l border-t border-red-400/50 transform rotate-45"></div>
                    </div>
                  )}
                </div>

                {/* Nome da Empresa */}
                <div className="relative h-11 overflow-hidden">
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="peer relative z-10 h-full w-full rounded-md border border-white/8 bg-zinc-900/50 pr-4 pl-11 duration-300 placeholder:text-white/40 focus:outline-0 text-white"
                    placeholder="Nome da sua empresa"
                  />
                  <div className="pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 text-white/20 duration-300 peer-focus-visible:text-white">
                    <CompanyIcon />
                  </div>
                  <span className="absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40"></span>
                  <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
                </div>

              </div>
            </div>

            {/* Seção 3: Dados de Acesso */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">Dados de Acesso</h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Senha */}
                <div className="space-y-2">
                  <div className="relative h-11 overflow-hidden">
                    <input
                      id="adminPassword"
                      name="adminPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={formData.adminPassword}
                      onChange={(e) => {
                        const validation = validatePassword(e.target.value);
                        setPasswordStrength(validation.strength);
                        setFormData({ ...formData, adminPassword: e.target.value });
                        if (e.target.value.length > 0) {
                          setShowPasswordRequirements(true);
                        }
                      }}
                      onFocus={() => setShowPasswordRequirements(true)}
                      onBlur={() => {
                        if (formData.adminPassword.length === 0) {
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
                  {formData.adminPassword.length > 0 && (
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
                        <li className={formData.adminPassword.length >= 8 ? 'text-green-400' : ''}>No mínimo 8 caracteres</li>
                        <li className={/[A-Z]/.test(formData.adminPassword) ? 'text-green-400' : ''}>Pelo menos uma letra maiúscula</li>
                        <li className={/[a-z]/.test(formData.adminPassword) ? 'text-green-400' : ''}>Pelo menos uma letra minúscula</li>
                        <li className={/[0-9]/.test(formData.adminPassword) ? 'text-green-400' : ''}>Pelo menos um número</li>
                        <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.adminPassword) ? 'text-green-400' : ''}>Pelo menos um caractere especial</li>
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

            {/* Botão Submit */}
            <button
              ref={submitBtnRef}
              type="submit"
              disabled={isLoading}
              onMouseEnter={(e) => createRipple(e, submitBtnRef)}
              className="relative mt-8 h-12 w-full rounded-2xl bg-[#0a0a0a] border border-white/10 text-white text-sm font-medium transition-all duration-300 hover:bg-[#EC4899] hover:border-[#EC4899] hover:shadow-[0_20px_60px_-20px_rgba(236,72,153,0.6)] overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0a0a0a] disabled:hover:border-white/10 disabled:hover:shadow-none"
            >
              {isLoading ? 'Cadastrando...' : 'Cadastrar Empresa'}
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
        </div>
      </div>
    </div>
  );
}
