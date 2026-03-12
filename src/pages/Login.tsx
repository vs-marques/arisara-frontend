import { useState, FormEvent, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import FloatingLanguageSelector from '@/components/FloatingLanguageSelector';
import { EmailIcon, LockIcon, UserIcon } from '@/components/ui/icons';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verifyMfa } = useAuth();
  const { refreshCompanies } = useCompany();
  
  // Toggle entre Sign in e Sign up
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Estado para Sign in
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Estado para Sign up (modal)
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    userType: 'individual' as 'individual' | 'business', // Física ou Jurídica
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaMessage, setMfaMessage] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(
    location.state?.message || null
  );
  const shadowRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const loginBtnRef = useRef<HTMLButtonElement>(null);
  const mfaBtnRef = useRef<HTMLButtonElement>(null);
  const signupBtnRef = useRef<HTMLButtonElement>(null);

  // Efeito ripple (mesmo da landing page)
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

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.requiresMfa) {
        setPendingEmail(result.email ?? email);
        setMfaMessage(result.message ?? t('login.mfa.defaultMessage'));
        setIsMfaStep(true);
        setSuccessMessage(null);
        return;
      }

      if (result.success) {
        const companies = await refreshCompanies();
        const isSuperadmin = Boolean(result.user?.is_superadmin);
        const hasMultipleCompanies = companies.length > 1;

        if (!isSuperadmin && companies.length === 0) {
          navigate('/dashboard');
          return;
        }

        navigate(isSuperadmin || hasMultipleCompanies ? '/organizations' : '/dashboard');
      } else {
        setError(t('login.errors.invalidCredentials'));
      }
    } catch (err: any) {
      setError(err.message || t('login.errors.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMfa = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userData = await verifyMfa(pendingEmail || email, mfaCode.trim());
      if (userData) {
        const companies = await refreshCompanies();
        const isSuperadmin = Boolean(userData.is_superadmin);
        const hasMultipleCompanies = companies.length > 1;

        if (!isSuperadmin && companies.length === 0) {
          navigate('/dashboard');
          return;
        }

        navigate(isSuperadmin || hasMultipleCompanies ? '/organizations' : '/dashboard');
      } else {
        setError(t('login.errors.mfaInvalid'));
      }
    } catch (err: any) {
      setError(err.message || t('login.errors.mfaInvalid'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações básicas
    if (!signupData.name.trim()) {
      setError(t('login.errors.nameRequired'));
      return;
    }

    if (!signupData.email.trim()) {
      setError(t('login.errors.emailRequired'));
      return;
    }

    // Redirecionar para página de signup completo com os dados pré-preenchidos
    const route = signupData.userType === 'business' 
      ? '/signup/business' 
      : '/signup/individual';
    
    navigate(route, {
      state: {
        prefill: {
          name: signupData.name,
          email: signupData.email,
        }
      }
    });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden">
      <FloatingLanguageSelector />

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

      <div className="relative z-10 w-full max-w-md px-5 sm:px-10">
        {/* Card principal */}
        <div
          id="card"
          ref={cardRef}
          className="relative mx-auto my-auto w-full max-w-[28rem] shrink-0 overflow-hidden rounded-4xl border-t border-white/20 bg-gradient-to-t from-zinc-100/10 to-zinc-950/50 to-50% p-8 text-white shadow-2xl shadow-black outline outline-white/5 -outline-offset-1 backdrop-blur-2xl animate-fade-in-up"
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <a
              href={import.meta.env.VITE_LANDING_URL || 'https://nyoka.ai'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity duration-200"
            >
              <img
                src="https://res.cloudinary.com/dtijk612b/image/upload/v1771249756/logo_arisara_login_hxwqm8.png"
                alt="Arisara"
                className="h-[11.52rem] w-auto"
              />
            </a>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mt-4">
              {t('login.title')}
            </p>
          </div>

          {/* Tabs Sign in / Sign up */}
          {!isMfaStep && (
            <div className="mb-8 inline-flex h-12 items-center rounded-full bg-zinc-950/75 p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className={`inline-flex h-full items-center rounded-full px-6 transition-all duration-200 ${
                  !isSignUp
                    ? 'bg-zinc-800'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {t('login.tabs.signIn')}
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className={`inline-flex h-full items-center rounded-full px-6 transition-all duration-200 ${
                  isSignUp
                    ? 'bg-zinc-800'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {t('login.tabs.signUp')}
              </button>
            </div>
          )}

          <h2 className="mb-7 text-[1.4rem] font-medium">
            {isMfaStep
              ? t('login.headings.mfa')
              : isSignUp
              ? t('login.headings.signUp')
              : t('login.headings.signIn')}
          </h2>

          {/* Form Sign In */}
          {!isSignUp && !isMfaStep && (
            <form onSubmit={handleLogin} className="space-y-4">
              {successMessage && (
                <div className="rounded-2xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-300">
                  {successMessage}
                </div>
              )}
              {error && (
                <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              )}

              {/* Email Input */}
              <div className="relative h-11 overflow-hidden">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="peer relative z-10 h-full w-full rounded-md border border-white/8 bg-zinc-900/50 pr-4 pl-11 duration-300 placeholder:text-white/40 focus:outline-0 text-white"
                  placeholder={t('login.placeholders.email')}
                />
                <div className="pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 text-white/20 duration-300 peer-focus-visible:text-white">
                  <EmailIcon />
                </div>
                <span className="absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40"></span>
                <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
              </div>

              {/* Password Input */}
              <div className="relative h-11 overflow-hidden [&_input::-ms-reveal]:hidden [&_input::-ms-clear]:hidden">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="peer relative z-10 h-full w-full rounded-md border border-white/8 bg-zinc-900/50 pr-11 pl-11 duration-300 placeholder:text-white/40 focus:outline-0 text-white"
                  placeholder={t('login.placeholders.password')}
                />
                <div className="pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 text-white/20 duration-300 peer-focus-visible:text-white">
                  <LockIcon />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 z-20 p-1 text-white hover:text-white/90 transition-colors duration-300 focus:outline-none"
                  aria-label={showPassword ? t('login.aria.hidePassword') : t('login.aria.showPassword')}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5 shrink-0" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-4.5 w-4.5 shrink-0" strokeWidth={1.5} />
                  )}
                </button>
                <span className="absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40"></span>
                <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
              </div>

              <button
                ref={loginBtnRef}
                type="submit"
                disabled={isLoading}
                onMouseEnter={(e) => createRipple(e, loginBtnRef)}
                className="relative mt-7 h-12 w-full rounded-2xl bg-[#0a0a0a] border border-white/10 text-white text-sm font-medium transition-all duration-300 hover:bg-[#EC4899] hover:border-[#EC4899] hover:shadow-[0_20px_60px_-20px_rgba(236,72,153,0.6)] overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0a0a0a] disabled:hover:border-white/10 disabled:hover:shadow-none"
              >
                {isLoading ? t('login.buttons.signInLoading') : t('login.buttons.signIn')}
              </button>

              <div className="text-center space-y-2 mt-6">
                <a
                  href="#"
                  className="text-sm text-gray-500 hover:text-[#EC4899] transition-colors block"
                >
                  {t('login.buttons.forgotPassword')}
                </a>
              </div>
            </form>
          )}

          {/* MFA verification */}
          {isMfaStep && (
            <form onSubmit={handleVerifyMfa} className="space-y-4">
              {mfaMessage && (
                <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-sm text-blue-200">
                  {mfaMessage}
                  {pendingEmail && (
                    <span className="block text-xs text-blue-300/80 mt-1">
                      {t('login.mfa.sentTo')} <strong>{pendingEmail}</strong>
                    </span>
                  )}
                </div>
              )}
              {error && (
                <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              )}

              <div className="relative h-11 overflow-hidden">
                <input
                  id="mfa-code"
                  name="mfa-code"
                  type="text"
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  maxLength={8}
                  className="peer relative z-10 h-full w-full rounded-md border border-white/8 bg-zinc-900/50 pr-4 pl-4 uppercase tracking-[0.2em] text-center text-white duration-300 placeholder:text-white/40 focus:outline-0"
                  placeholder={t('login.placeholders.mfaCode')}
                />
                <span className="absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40"></span>
              </div>

              <button
                ref={mfaBtnRef}
                type="submit"
                disabled={isLoading || !mfaCode.trim()}
                onMouseEnter={(e) => createRipple(e, mfaBtnRef)}
                className="relative mt-7 h-12 w-full rounded-2xl bg-[#0a0a0a] border border-white/10 text-white text-sm font-medium transition-all duration-300 hover:bg-[#EC4899] hover:border-[#EC4899] hover:shadow-[0_20px_60px_-20px_rgba(236,72,153,0.6)] overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0a0a0a] disabled:hover:border-white/10 disabled:hover:shadow-none"
              >
                {isLoading ? t('login.buttons.validateCodeLoading') : t('login.buttons.validateCode')}
              </button>

              <button
                type="button"
                className="w-full text-sm text-gray-500 hover:text-white transition-colors"
                onClick={() => {
                  setIsMfaStep(false);
                  setMfaCode('');
                  setPendingEmail('');
                  setMfaMessage(null);
                }}
              >
                {t('login.buttons.backToLogin')}
              </button>
            </form>
          )}

          {/* Form Sign Up (modal simples) */}
          {isSignUp && !isMfaStep && (
            <form onSubmit={handleSignUp} className="space-y-4">
              {error && (
                <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              )}

              {/* Name Input */}
              <div className="relative h-11 overflow-hidden">
                <input
                  id="signup-name"
                  name="name"
                  type="text"
                  required
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  className="peer relative z-10 h-full w-full rounded-md border border-white/8 bg-zinc-900/50 pr-4 pl-11 duration-300 placeholder:text-white/40 focus:outline-0 text-white"
                  placeholder={t('login.placeholders.fullName')}
                />
                <div className="pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 text-white/20 duration-300 peer-focus-visible:text-white">
                  <UserIcon />
                </div>
                <span className="absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40"></span>
                <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
              </div>

              {/* Email Input */}
              <div className="relative h-11 overflow-hidden">
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  className="peer relative z-10 h-full w-full rounded-md border border-white/8 bg-zinc-900/50 pr-4 pl-11 duration-300 placeholder:text-white/40 focus:outline-0 text-white"
                  placeholder={t('login.placeholders.email')}
                />
                <div className="pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 text-white/20 duration-300 peer-focus-visible:text-white">
                  <EmailIcon />
                </div>
                <span className="absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40"></span>
                <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
              </div>

              {/* Tipo de Pessoa (Física/Jurídica) */}
              <div className="relative h-11 overflow-hidden">
                <select
                  id="signup-user-type"
                  name="userType"
                  required
                  value={signupData.userType}
                  onChange={(e) => setSignupData({ ...signupData, userType: e.target.value as 'individual' | 'business' })}
                  className="peer relative z-10 h-full w-full rounded-md border border-white/8 bg-zinc-900/50 px-4 duration-300 focus:outline-0 text-white appearance-none cursor-pointer"
                >
                  <option value="individual" className="bg-zinc-950 text-white">{t('login.userType.individual')}</option>
                  <option value="business" className="bg-zinc-950 text-white">{t('login.userType.business')}</option>
                </select>
                <div className="pointer-events-none absolute top-3 right-3 z-20 h-4 w-4 text-white/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
                <span className="absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40"></span>
                <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
              </div>

              <button
                ref={signupBtnRef}
                type="submit"
                onMouseEnter={(e) => createRipple(e, signupBtnRef)}
                className="relative mt-7 h-12 w-full rounded-2xl bg-[#0a0a0a] border border-white/10 text-white text-sm font-medium transition-all duration-300 hover:bg-[#EC4899] hover:border-[#EC4899] hover:shadow-[0_20px_60px_-20px_rgba(236,72,153,0.6)] overflow-hidden"
              >
                {t('login.buttons.continueSignUp')}
              </button>

              <div className="text-center space-y-2 mt-6">
                <p className="text-sm text-gray-500">
                  {t('login.signUpFooter')}{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="text-[#EC4899] hover:text-[#EC4899]/80 transition-colors"
                  >
                    {t('login.buttons.doLogin')}
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Efeito de brilho inferior */}
          <div className="absolute inset-x-32 -bottom-20 left-32 h-10 bg-white blur-2xl opacity-20"></div>
        </div>
      </div>
    </div>
  );
}
