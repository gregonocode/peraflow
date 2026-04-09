'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaCheck } from 'react-icons/fa';
import '../../components/ui/shine.css';

export default function Planos() {
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
        <section className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">Escolha o Plano Perfeito para Você</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Descubra os planos do WorkshopLive e comece a criar experiências de venda incríveis com a tecnologia Call Live. Seja para iniciantes ou grandes empresas, temos a solução ideal!
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Plano Basic */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 flex flex-col">
            <h2 className="text-2xl font-bold text-[#555555] mb-4">Basic</h2>
            <p className="text-3xl font-bold text-[#555555] mb-4">R$ 47<span className="text-lg font-normal">/mês</span></p>
            <ul className="text-gray-600 mb-6 flex-grow">
              <li className="flex items-center mb-2">
                <FaCheck className="text-[#077655] mr-2" /> 1 Call Live
              </li>
              <li className="flex items-center mb-2">
                <FaCheck className="text-[#077655] mr-2" /> Até 1.000 acessos por live
              </li>
              <li className="flex items-center mb-2">
                <FaCheck className="text-[#077655] mr-2" /> Rastreamento de Engajamento
              </li>
              <li className="flex items-center mb-2">
                <FaCheck className="text-[#077655] mr-2" /> Relatórios de Visualizações
              </li>
            </ul>
            <Link
              href="/assinar"
              className="text-center inline-block px-6 py-3 bg-[#181818] text-white text-bold rounded-md text-sm font-medium hover:bg-[#0EA376] transition-all transform hover:scale-105"
            >
              Assinar Agora
            </Link>
          </div>

          {/* Plano Premium */}
          <div className="bg-white border border-[#0EA376] rounded-lg shadow-lg p-6 flex flex-col relative">
            <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0EA376] text-white text-sm font-medium px-4 py-1 rounded-full">
              Mais Vendido
            </span>
            <h2 className="text-2xl font-bold text-[#555555] mb-4">Premium</h2>
            <p className="text-3xl font-bold text-[#555555] mb-4">R$ 147<span className="text-lg font-normal">/mês</span></p>
            <ul className="text-gray-600 mb-6 flex-grow">
              <li className="flex items-center mb-2">
                <FaCheck className="text-[#077655] mr-2" /> Até 5 Call Lives
              </li>
              <li className="flex items-center mb-2">
                <FaCheck className="text-[#077655] mr-2" /> Acessos ilimitados por live
              </li>
              <li className="flex items-center mb-2">
                <FaCheck className="text-[#077655] mr-2" /> Rastreamento de Engajamento
              </li>
              <li className="flex items-center mb-2">
                <FaCheck className="text-[#077655] mr-2" /> Relatórios de Visualizações
              </li>
            </ul>
            <Link
              href="/assinar"
              className=" text-center shine-button inline-block px-6 py-3 bg-gradient-to-r from-[#0AD991] to-[#07D122] text-white rounded-md text-sm font-medium hover:from-[#059669] hover:to-[#065F46] transition-all transform hover:scale-105"
            >
              Assinar Agora
            </Link>
          </div>

          {/* Plano Enterprise */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 flex flex-col">
            <h2 className="text-2xl font-bold text-[#555555] mb-4">Enterprise</h2>
            <p className="text-3xl font-bold text-[#555555] mb-4">Personalizado</p>
            <p className="text-gray-600 mb-4">Precisa de mais? Fale conosco para uma solução sob medida!</p>
            <ul className="text-gray-600 mb-6 flex-grow">
              <li className="flex items-center mb-2">
                <FaCheck className="text-[#077655] mr-2" /> Call Lives personalizadas
              </li>
              <li className="flex items-center mb-2">
                <FaCheck className="text-[#077655] mr-2" /> Acessos ilimitados
              </li>
              <li className="flex items-center mb-2">
                <FaCheck className="text-[#077655] mr-2" /> Rastreamento de Engajamento
              </li>
              <li className="flex items-center mb-2">
                <FaCheck className="text-[#077655] mr-2" /> Relatórios de Visualizações
              </li>
            </ul>
            <Link
              href="/contato"
              className="text-center inline-block px-6 py-3 bg-[#181818] text-white rounded-md text-sm font-medium hover:bg-[#0EA376] transition-all transform hover:scale-105"
            >
              Entrar em Contato
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}