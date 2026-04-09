'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home, Video, User, Settings, Film, BookOpen, CodeXml, BotMessageSquare } from 'lucide-react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isWarningVisible, setIsWarningVisible] = useState(false);

  useEffect(() => {
    // Verifica se o aviso deve ser exibido com base no localStorage
    const hasClosedWarning = localStorage.getItem('hasClosedWarning');
    if (!hasClosedWarning) {
      setIsWarningVisible(true);
    }
  }, []);

  const handleCloseWarning = () => {
    // Oculta a barra e salva no localStorage
    setIsWarningVisible(false);
    localStorage.setItem('hasClosedWarning', 'true');
  };

  return (
    <div className="flex min-h-screen w-full font-lato bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-[20%] bg-[radial-gradient(circle_at_center,#34D399_0%,#059669_60%)] p-6 transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center mb-8">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logo.svg"
              alt="WorkshopLive Logo"
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="text-[#E6FFFA] text-2xl font-bold">WorkshopLive</span>
          </Link>
        </div>
        <nav className="space-y-4">
          <Link href="/dashboard">
            <div className="flex items-center space-x-3 text-[#E6FFFA] hover:text-[#A7F3D0] cursor-pointer px-4 py-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] hover:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0%,transparent_70%)] transition-all">
              <Home size={20} />
              <span>Dashboard</span>
            </div>
          </Link>
          <Link href="/dashboard/criarlives">
            <div className="flex items-center space-x-3 text-[#E6FFFA] hover:text-[#A7F3D0] cursor-pointer px-4 py-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] hover:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0%,transparent_70%)] transition-all">
              <Video size={20} />
              <span>Criar Lives</span>
            </div>
          </Link>
          <Link href="/dashboard/criarlives/links">
            <div className="flex items-center space-x-3 text-[#E6FFFA] hover:text-[#A7F3D0] cursor-pointer px-4 py-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] hover:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0%,transparent_70%)] transition-all">
              <Film size={20} />
              <span>Minhas Lives</span>
            </div>
          </Link>
          <Link href="/dashboard/trackeamento">
            <div className="flex items-center space-x-3 text-[#E6FFFA] hover:text-[#A7F3D0] cursor-pointer px-4 py-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] hover:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0%,transparent_70%)] transition-all">
              <CodeXml size={20} />
              <span>Trackeamento</span>
            </div>
          </Link>
          <Link href="/dashboard/bootzap">
            <div className="flex items-center space-x-3 text-[#E6FFFA] hover:text-[#A7F3D0] cursor-pointer px-4 py-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] hover:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0%,transparent_70%)] transition-all">
              <BotMessageSquare size={20} />
              <span className="flex items-center space-x-2">
                <span>Bootzap</span>
                <span className="bg-[#41E2AB] text-white text-xs font-medium px-2 py-0.5 rounded-full border border-white transform scale-90">
                  Novo
                </span>
              </span>
            </div>
          </Link>
          <Link href="/dashboard/tutorial">
            <div className="flex items-center space-x-3 text-[#E6FFFA] hover:text-[#A7F3D0] cursor-pointer px-4 py-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] hover:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0%,transparent_70%)] transition-all">
              <BookOpen size={20} />
              <span>Tutorial</span>
            </div>
          </Link>
          <Link href="/dashboard/perfil">
            <div className="flex items-center space-x-3 text-[#E6FFFA] hover:text-[#A7F3D0] cursor-pointer px-4 py-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] hover:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0%,transparent_70%)] transition-all">
              <User size={20} />
              <span>Perfil</span>
            </div>
          </Link>
          <Link href="/dashboard/configuracao">
            <div className="flex items-center space-x-3 text-[#E6FFFA] hover:text-[#A7F3D0] cursor-pointer px-4 py-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] hover:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.35)_0%,transparent_70%)] transition-all">
              <Settings size={22} />
              <span>Configuração</span>
            </div>
          </Link>
        </nav>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col">
        {/* Barra de aviso */}
        {isWarningVisible && (
          <div className="fixed top-0 left-[20%] right-0 bg-yellow-50 p-4 z-30 md:left-[20%] md:right-0 max-w-[80%]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" aria-hidden="true" />
                <p className="text-sm font-medium text-yellow-800">
                  Aviso: Você precisa alterar sua senha.{' '}
                  <Link
                    href="/dashboard/configuracao"
                    className="font-semibold underline hover:text-yellow-900"
                  >
                    Trocar Senha
                  </Link>
                </p>
              </div>
              <button
                type="button"
                className="text-yellow-700 hover:text-yellow-900"
                onClick={handleCloseWarning}
                aria-label="Fechar aviso"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Botão para abrir/fechar sidebar em dispositivos móveis */}
        <button
          className="md:hidden fixed top-4 left-4 z-40 text-[#059669] p-2"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? '✕' : '☰'}
        </button>

        {/* Conteúdo principal */}
        <main className="flex-1 p-8 pt-16 md:pt-8">{children}</main>
      </div>
    </div>
  );
}