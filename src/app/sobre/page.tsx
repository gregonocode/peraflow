'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Sobre() {
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
      </header>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto pt-12 pb-12 px-4 sm:px-6 lg:px-8">
        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">Sobre o WorkshopLive</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            O WorkshopLive é uma plataforma inovadora de Software as a Service que transforma a maneira como empreendedores e profissionais de marketing digital engajam seus leads. Idealizado em dezembro de 2024 por um empreendedor com vasta experiência em programação, tecnologia e marketing digital, o WorkshopLive combina inovação e expertise para oferecer uma solução única no mercado.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">O Poder do Call Live</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Nossa tecnologia introduz a técnica revolucionária <strong>Call Live</strong>, que permite criar lives simuladas que capturam a atenção dos leads por mais tempo. Com o WorkshopLive, você pode guiar automaticamente os espectadores de sua live de vendas para o checkout da sua escola ou produto no momento exato que desejar, otimizando conversões de forma fluida e eficaz.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">Nossa Missão</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Capacitar empreendedores, agências e criadores de conteúdo a converterem leads em clientes com uma ferramenta inteligente, intuitiva e automatizada, projetada para maximizar resultados no marketing digital.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">Por que Escolher o WorkshopLive?</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Desenvolvido com base em anos de experiência no mercado digital, o WorkshopLive oferece uma interface amigável, tecnologia de ponta e resultados comprovados. Seja você um empreendedor individual ou uma agência, nossa plataforma ajuda a criar experiências de venda envolventes que convertem.
          </p>
          <Link
            href="/planos"
            className="inline-block mt-6 rounded-md bg-[#077655] px-6 py-3 text-white font-bold transition-all duration-300 hover:bg-[#0EA376] hover:scale-105"
          >
            Conheça Nossos Planos
          </Link>
        </section>
      </div>
    </main>
  );
}