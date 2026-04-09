'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { toast, Toaster } from 'react-hot-toast';

// Log para depuração
console.log('SUPABASE_URL (login):', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_ANON_KEY (login):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Inicializar Supabase
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    console.log('🔄 [Login] Iniciando login com:', { email });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ [Login] Erro no login:', error.message);
      toast.error(
        error.message.includes('Invalid login')
          ? 'E-mail ou senha incorretos'
          : `Erro: ${error.message}`
      );
      return;
    }

    console.log('✅ [Login] Login bem-sucedido, usuário:', data.user);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.error('❌ [Login] Erro ao obter sessão:', sessionError.message);
    } else {
      console.log(
        '🔍 [Login] Sessão ativa:',
        sessionData.session?.access_token ? 'Token presente' : 'Token ausente'
      );
      console.log(
        '🔍 [Login] user_metadata:',
        JSON.stringify(data.user?.user_metadata)
      );
    }

    const cookies = document.cookie;
    console.log('🍪 [Login] Cookies após login:', cookies);

    toast.success('Login realizado com sucesso!');
    window.location.href = '/dashboard';
  }

  return (
    <main className="flex min-h-screen w-full font-lato bg-[#f8fffb]">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#4ff388',
            color: '#15803D',
            border: '1px solid #4ff388',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
          },
        }}
      />

      {/* Lado esquerdo / Branding */}
      <div className="relative hidden overflow-hidden md:flex md:w-[62%]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#dfffea_0%,#baf9cf_30%,#86f2ae_65%,#55EF96_100%)]" />
       
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/18 blur-3xl" />

        <div className="relative z-10 flex w-full flex-col p-8 lg:p-10">
          <div className="mb-8">
            <nav className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-8">
                <Link href="/">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl">
                    <Image
                      src="/logo.svg"
                      alt="pera flow Logo"
                      width={48}
                      height={48}
                      className="h-12 w-12 object-cover"
                    />
                  </div>
                </Link>

                <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/35 bg-white/18 px-3 py-2 backdrop-blur-md shadow-[0_8px_30px_rgba(255,255,255,0.10)]">
  <Link href="/sobre">
    <span className="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.10)] transition hover:bg-white/20">
      Sobre
    </span>
  </Link>
  <Link href="/planos">
    <span className="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.10)] transition hover:bg-white/20">
      Planos
    </span>
  </Link>
  <Link href="/contato">
    <span className="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.10)] transition hover:bg-white/20">
      Contato
    </span>
  </Link>
  <Link href="/politica">
    <span className="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.10)] transition hover:bg-white/20">
      Política
    </span>
  </Link>
</div>

              </div>
            </nav>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="flex max-w-3xl flex-col items-center text-center">
            
      

              <div className="relative flex items-center justify-center">
                <div className="absolute z-0 h-[500px] w-[500px] rounded-full bg-white/20 blur-3xl" />
                <Image
                  src="/imagens/workshoplive.webp"
                  alt="WorkshopLive Banner"
                  width={840}
                  height={560}
                  className="relative z-10 w-full max-w-[680px] object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.10)]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lado direito / Login */}
      <div className="flex w-full items-center justify-center bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fffb_45%,#eefcf4_100%)] px-5 py-8 md:w-[38%] md:px-8 lg:px-10">
        <div className="w-full max-w-md rounded-[32px] border border-[#dff7e8] bg-white/90 p-7 shadow-[0_20px_60px_rgba(18,120,74,0.10)] backdrop-blur-xl sm:p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex h-12 w-12 mb-5 items-center justify-center overflow-hidden rounded-xl">
                    <Image
                      src="/logo.svg"
                      alt="pera flow Logo"
                      width={48}
                      height={48}
                      className="h-12 w-12 object-cover"
                    />
                  </div>

            <h2 className="text-3xl font-bold text-[#101010]">
              Bem-vindo de volta
            </h2>
            <p className="mt-2 text-sm text-[#5e6a63]">
              Entre na sua conta para continuar acessando a plataforma
            </p>
          </div>

          <form onSubmit={handleLogin} className="w-full">
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-[#1c1c1c]">
                E-mail
              </label>
              <input
                type="email"
                placeholder="Coloque seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-[#d8e6dd] bg-[#fbfffc] px-4 py-3 text-base text-[#111] outline-none transition-all placeholder:text-[#91a099] focus:border-[#55EF96] focus:ring-4 focus:ring-[#55EF96]/20"
                required
              />
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-[#1c1c1c]">
                Senha
              </label>
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Coloque sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-[#d8e6dd] bg-[#fbfffc] px-4 py-3 pr-12 text-base text-[#111] outline-none transition-all placeholder:text-[#91a099] focus:border-[#55EF96] focus:ring-4 focus:ring-[#55EF96]/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7b72] transition hover:text-[#1f8b5b]"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mb-4 w-full cursor-pointer rounded-2xl bg-[linear-gradient(135deg,#55EF96_0%,#28d975_100%)] p-3.5 text-base font-bold text-white shadow-[0_15px_30px_rgba(85,239,150,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_35px_rgba(85,239,150,0.35)]"
            >
              Entrar
            </button>
          </form>

          <div className="mt-2 text-center">
            <p className="text-sm text-[#607066]">
              Não é assinante?{' '}
              <Link
                href="/planos"
                className="font-semibold text-[#11a861] transition hover:text-[#0e8b51]"
              >
                Assinar agora
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}