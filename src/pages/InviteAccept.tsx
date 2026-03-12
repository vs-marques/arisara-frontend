import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';

export default function InviteAccept() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Token de convite não encontrado.');
      setIsValidating(false);
      return;
    }

    let isMounted = true;

    const validateToken = async () => {
      try {
        const response = await api.get('/signup/invitation/validate', { params: { token } });
        if (!isMounted) return;
        navigate({
          pathname: '/signup/individual',
          search: `token=${encodeURIComponent(token)}`,
        }, {
          replace: true,
          state: {
            invitationToken: token,
            inviteContext: response.data,
          },
        });
      } catch (err: any) {
        if (!isMounted) return;
        const message = err.response?.data?.detail || 'Este convite é inválido ou expirou.';
        setError(message);
      } finally {
        if (isMounted) {
          setIsValidating(false);
        }
      }
    };

    validateToken();

    return () => {
      isMounted = false;
    };
  }, [token, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
        <div className="max-w-md space-y-6">
          <h1 className="text-2xl font-semibold">Convite inválido</h1>
          <p className="text-gray-400">
            {error}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/login"
              className="rounded-full border border-white/20 px-5 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Ir para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
      <div className="max-w-md space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Arisara</p>
        <h1 className="text-3xl font-semibold">Validando convite</h1>
        <p className="text-gray-400">
          Estamos verificando seu token de convite. Você será redirecionado para concluir o cadastro em alguns instantes.
        </p>
        {isValidating && (
          <div className="mt-6 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}
      </div>
    </div>
  );
}

