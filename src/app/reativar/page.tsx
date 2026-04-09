'use client';

import Link from 'next/link';
import Image from 'next/image';
import '../../components/ui/shine.css';

export default function Reativar() {
  return (
    <main className="font-lato min-h-screen bg-white">
      {/* Topbar */}
      <header className="w-full bg-[radial-gradient(circle_at_center,#34D399_0%,#059669_60%)] p-8 shadow-[0_4px_6px_rgba(0,0,0,0.1)]">
        <nav className="flex items-center max-w-7xl mx-auto">
          <div className="flex space-x-4">
            <Link href="/" className="ml-8">
              <Image
                src="/logo.svg"
                alt="WorkshopLive Logo"
                width={120}
                height={40}
                className="h-10 w-auto"
              />
            </Link>
          </div>
        </nav>
      </header>

      {/* Conteúdo principal */}
      <div className="max-w-2xl mx-auto pt-16 pb-20 px-6 text-center">
        <h1 className="text-4xl font-bold text-[#333] mb-6">Sua conta está inativa</h1>
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          Parece que sua assinatura foi cancelada ou expirada. Para continuar acessando a plataforma, você precisa reativar sua conta.
        </p>
        <Link
          href="/planos"
          className="shine-button inline-block px-6 py-3 bg-gradient-to-r from-[#0AD991] to-[#07D122] text-white text-sm font-medium rounded-md hover:from-[#059669] hover:to-[#065F46] transition-all transform hover:scale-105"
        >
          Ver Planos e Reativar
        </Link>
      </div>
    </main>
  );
}
