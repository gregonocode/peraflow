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
    // Verifica a sessão
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ [Login] Erro ao obter sessão:', sessionError.message);
    } else {
      console.log('🔍 [Login] Sessão ativa:', sessionData.session?.access_token ? 'Token presente' : 'Token ausente');
      console.log('🔍 [Login] user_metadata:', JSON.stringify(data.user?.user_metadata));
    }

    // Verifica os cookies no navegador
    const cookies = document.cookie;
    console.log('🍪 [Login] Cookies após login:', cookies);

    toast.success('Login realizado com sucesso!');
    window.location.href = '/dashboard';
  }

  return (
    <main className="flex h-screen w-full font-lato">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#F0FFF4',
            color: '#15803D',
            border: '1px solid #BBF7D0',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        }}
      />
      <div className="hidden w-[80%] flex-col bg-[radial-gradient(circle_at_center,#34D399_0%,#059669_60%)] p-8 md:flex">
        <div className="w-full mb-8">
          <nav className="flex items-center space-x-8">
            <Link href="/">
              <Image
                src="/logo.svg"
                alt="WorkshopLive Logo"
                width={120}
                height={40}
                className="h-10 w-auto"
              />
            </Link>
            <div className="flex space-x-4">
              <Link href="/sobre">
                <span className="text-[#E6FFFA] text-lg font-medium px-4 py-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] hover:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0%,transparent_70%)] hover:text-[#A7F3D0] transition-all duration-300 ease-in-out">
                  Sobre
                </span>
              </Link>
              <Link href="/planos">
                <span className="text-[#E6FFFA] text-lg font-medium px-4 py-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] hover:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0%,transparent_70%)] hover:text-[#A7F3D0] transition-all duration-300 ease-in-out">
                  Planos
                </span>
              </Link>
              <Link href="/contato">
                <span className="text-[#E6FFFA] text-lg font-medium px-4 py-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] hover:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0%,transparent_70%)] hover:text-[#A7F3D0] transition-all duration-300 ease-in-out">
                  Contato
                </span>
              </Link>
              <Link href="/politica">
                <span className="text-[#E6FFFA] text-lg font-medium px-4 py-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] hover:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0%,transparent_70%)] hover:text-[#A7F3D0] transition-all duration-300 ease-in-out">
                  Política
                </span>
              </Link>
            </div>
          </nav>
        </div>
        <div className="flex flex-col items-center justify-center flex-grow">
          <Image
            src="/imagens/workshoplive.webp"
            alt="WorkshopLive Banner"
            width={500}
            height={300}
            className="object-contain"
          />
        </div>
      </div>
      <div className="flex w-full flex-col items-center justify-center bg-white p-5 md:w-[20%]">
        <h2 className="mb-6 text-2xl font-semibold">Bem vindo de Volta!</h2>
        <form onSubmit={handleLogin} className="w-full">
          <input
            type="email"
            placeholder="Coloque seu E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-md border border-gray-300 p-2 text-base focus:outline-none focus:ring-2 focus:ring-[#0EA376]"
            required
          />
          <div className="relative mb-4 w-full">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Coloque sua Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-base focus:outline-none focus:ring-2 focus:ring-[#0EA376]"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-[#077655]"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button
            type="submit"
            className="rounded-full w-full bg-[#0BE76E] mb-4 p-2 text-white font-bold transition-all duration-300 hover:bg-[#0EA376] hover:scale-105 cursor-pointer"
          >
            Entrar
          </button>
        </form>
        <p className="text-sm text-gray-600">
          Não é assinante?{' '}
          <Link href="/planos" className="text-[#077655] hover:text-[#0EA376]">
            Assinar Agora!
          </Link>
        </p>
      </div>
    </main>
  );
}