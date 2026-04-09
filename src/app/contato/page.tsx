'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaInstagram } from 'react-icons/fa';

export default function Contato() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Formulário enviado:', { email, message });
    alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
    setEmail('');
    setMessage('');
  };

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
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">Entre em Contato com a WorkshopLive</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Estamos aqui para ajudar! Se você tiver dúvidas, sugestões ou precisar de suporte, entre em contato conosco pelos canais abaixo ou utilize o formulário para nos enviar uma mensagem.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">Informações de Contato</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            <strong>E-mail:</strong>{' '}
            <a href="mailto:contato@workshoplive.com.br" className="text-[#077655] hover:text-[#0EA376]">
              Contatoe@workshoplive.com.br
            </a>
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">Envie Sua Mensagem</h1>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div>
              <label htmlFor="email" className="block text-lg text-gray-600 mb-2">
                Seu E-mail
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail"
                className="w-full rounded-md border border-gray-300 p-2 text-base focus:outline-none focus:ring-2 focus:ring-[#0EA376]"
                required
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-lg text-gray-600 mb-2">
                Sua Mensagem
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreva sua mensagem"
                className="w-full rounded-md border border-gray-300 p-2 text-base focus:outline-none focus:ring-2 focus:ring-[#0EA376] min-h-[120px]"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-[#077655] px-6 py-3 text-white font-bold transition-all duration-300 hover:bg-[#0EA376] hover:scale-105"
            >
              Enviar
            </button>
          </form>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">Siga-nos no Instagram</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Acompanhe nossas novidades e dicas de marketing digital no Instagram!{' '}
            <a
              href="https://www.instagram.com/workshoplive.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[#077655] hover:text-[#0EA376]"
            >
              <FaInstagram className="mr-2" size={24} />
              @workshoplive.com.br
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}