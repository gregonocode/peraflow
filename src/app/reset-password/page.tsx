'use client';

import { useState, useEffect, Suspense } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isValidLink, setIsValidLink] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlError = searchParams.get('error');
    const urlErrorDesc = searchParams.get('error_description');

    // Se o Supabase já mandou erro na URL, nem tenta
    if (urlError) {
      toast.error(
        urlErrorDesc ||
          'Link de redefinição inválido ou expirado. Solicite um novo link.',
        { position: 'bottom-right' }
      );
      setIsValidLink(false);
      setChecking(false);
      return;
    }

    // Verifica se existe sessão de recuperação ativa
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        toast.error(
          'Link de redefinição inválido ou expirado. Solicite um novo link.',
          { position: 'bottom-right' }
        );
        setIsValidLink(false);
      } else {
        setIsValidLink(true);
      }
      setChecking(false);
    });
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidLink) {
      toast.error(
        'Link inválido ou expirado. Solicite uma nova redefinição de senha.',
        { position: 'bottom-right' }
      );
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.', {
        position: 'bottom-right',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.', {
        position: 'bottom-right',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Erro ao redefinir senha:', error);
        toast.error(
          'Erro ao redefinir a senha. Solicite um novo link e tente novamente.',
          { position: 'bottom-right' }
        );
        return;
      }

      setIsSuccess(true);
      toast.success('Senha redefinida com sucesso!', {
        position: 'bottom-right',
      });

      // encerra sessão de recuperação e manda pro login
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado ao redefinir a senha.', {
        position: 'bottom-right',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="font-lato min-h-screen bg-[#F1F1F1] flex items-center justify-center text-gray-600">
        Validando link...
      </div>
    );
  }

  if (!isValidLink && !isSuccess) {
    return (
      <div className="font-lato min-h-screen bg-[#F1F1F1] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <Toaster position="bottom-right" />
          <h1 className="text-2xl font-bold text-[#1e1e1e] mb-3">
            Link inválido ou expirado
          </h1>
          <p className="text-gray-600 mb-4">
            Solicite uma nova redefinição de senha na página de login.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full px-4 py-2 rounded-md text-sm font-medium text-white bg-[#34D399] hover:bg-[#059669] transition-colors"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="font-lato min-h-screen bg-[#F1F1F1] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <Toaster position="bottom-right" />
        <h1 className="text-2xl font-bold text-[#1e1e1e] mb-6 text-center">
          Redefinir Senha
        </h1>
        {!isSuccess ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="text-gray-600">Nova Senha:</label>
              <div className="relative mt-1">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 pr-10 border border-gray-300 rounded-md text-[#1e1e1e] focus:border-[#059669] focus:ring-[#059669]"
                  placeholder="Digite sua nova senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-[#059669]"
                  aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-gray-600">Confirmar Senha:</label>
              <div className="relative mt-1">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2 pr-10 border border-gray-300 rounded-md text-[#1e1e1e] focus:border-[#059669] focus:ring-[#059669]"
                  placeholder="Confirme sua nova senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-[#059669]"
                  aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className={`w-full px-4 py-2 rounded-md text-sm font-medium text-white ${
                submitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#34D399] hover:bg-[#059669]'
              } transition-colors`}
            >
              {submitting ? 'Redefinindo...' : 'Redefinir Senha'}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-[#34D399] font-medium">
              Senha redefinida com sucesso!
            </p>
            <p className="text-gray-600 text-sm">
              Você será redirecionado para o login.
            </p>
          </div>
        )}
        {!isSuccess && (
          <div className="mt-4 text-center">
            <a
              href="/login"
              className="text-[#059669] hover:text-[#065F46]"
            >
              Voltar ao login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="font-lato min-h-screen bg-[#F1F1F1] flex items-center justify-center text-gray-600">
          Carregando...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
