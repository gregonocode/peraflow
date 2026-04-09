"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import WistiaPlayer from '../components/WistiaPlayer';
import '../components/ui/shine.css';
import { FaCheck, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { MessageSquareHeart, SquareActivity, Flame } from 'lucide-react';


// Declaração de tipo para o Web Component wistia-player
declare global {
  interface HTMLElementTagNameMap {
    "wistia-player": HTMLElement;
  }
}

// Componente FaqItem para gerenciar o estado de cada item do FAQ
type FaqItemProps = {
  question: string;
  answer: string;
};

const FaqItem = ({ question, answer }: FaqItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 py-4">
      <button
        className="w-full flex justify-between items-center text-left text-lg font-semibold text-[#1e1e1e]"
        style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{question}</span>
        {isOpen ? (
          <FaChevronUp className="text-[#0BE76E]" />
        ) : (
          <FaChevronDown className="text-[#0BE76E]" />
        )}
      </button>
      {isOpen && (
        <p
          className="mt-2 text-gray-500"
          style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}
        >
          {answer}
        </p>
      )}
    </div>
  );
};

export default function Home() {
  useEffect(() => {
    // Carregar scripts do player
    const script1 = document.createElement("script");
    script1.src = "https://fast.wistia.com/player.js";
    script1.async = true;
    document.body.appendChild(script1);

    const script2 = document.createElement("script");
    script2.src = "https://fast.wistia.com/embed/jpdjr1qgno.js";
    script2.type = "module";
    script2.async = true;
    document.body.appendChild(script2);
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-white font-lato">
      {/* Topbar */}
      <div className="w-full px-8 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/">
           <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl">
             <img src="/logo.svg" alt="Pera Flow Logo" className="h-10 w-10 object-cover" />
            </div>
           </Link>
            <div className="flex space-x-4">
              <Link href="/sobre">
                <span className="text-[#1e1e1e] hover:text-[#077655] cursor-pointer text-sm hidden md:inline-block">
                  Sobre
                </span>
              </Link>
              <Link href="/planos">
                <span className="text-[#1e1e1e] hover:text-[#077655] cursor-pointer text-sm">
                  Planos
                </span>
              </Link>
              <Link href="/contato">
                <span className="text-[#1e1e1e] hover:text-[#077655] cursor-pointer text-sm">
                  Contato
                </span>
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="#oferta">
              <Button
                variant="outline"
                className="hidden md:block border-[#0BE76E] text-[#0BE76E] hover:bg-[#0BE76E] hover:text-white px-6 py-2 rounded-full cursor-pointer"
              >
                Inscreva-se
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-[#0BE76E] hover:bg-[#0AD060] text-white px-6 py-2 rounded-full cursor-pointer">
                Login
              </Button>
            </Link>
          </div>
        </nav>
        <hr className="mt-4 border-t border-gray-200" />
      </div>

      {/* Conteúdo principal */}
      <div className="flex flex-col items-center justify-center flex-1 px-8 pt-4 md:pt-8 pb-12">
        <div className="relative text-center z-10">
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-[#0AD991] to-[#07D122] text-transparent bg-clip-text"
            style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}
          >
            Vendas no Automático com a<br />Experiência de uma Transmissão Real.
          </h1>
          <p className="mt-0 text-2xl md:text-4xl bg-gradient-to-r from-[#333333] to-[#696666] bg-clip-text text-transparent" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
            Mais conversão, menos esforço.
          </p>
        </div>

        {/* Player Wistia com efeito de loading */}
        <div className="mt-0 mb-0 z-10 w-full max-w-[800px] pt-0 md:pt-0 pb-12">
          <WistiaPlayer mediaId="jpdjr1qgno" />
        </div>
        <a
          href="#oferta"
          className="shine-button inline-block px-6 py-4 mt-0 bg-gradient-to-r from-[#0AD991] to-[#07D122] text-white rounded-full text-sm font-medium hover:from-[#059669] hover:to-[#065F46] transition-all transform hover:scale-105"
        >
          QUERO COMEÇAR AINDA HOJE!
        </a>
      </div>
      <section className="w-full py-12 px-8 pb-20" style={{ backgroundColor: "#00D664" }}>
        <div className="max-w-7xl mx-auto text-center">
          <h2
            className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#F0FCE1]"
            style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700 }}
          >
            Por que escolher a PeraFLow?
          </h2>
          <p className="mt-4 text-lg text-white mt-0" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}>
            Descubra como nossa plataforma revoluciona suas vendas.
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-[#0BE06F] rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <MessageSquareHeart className="h-12 w-12 mx-auto mb-4 text-white" />
              <h3 className="text-xl font-semibold text-[#F0FCE1]" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600 }}>
                Engajamento
              </h3>
              <p className="mt-2 text-white" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}>
                82% das pessoas preferem vídeos ao vivo a posts nas redes sociais
              </p>
            </div>
            <div className="p-6 bg-[#0BE06F] rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <SquareActivity className="h-12 w-12 mx-auto mb-4 text-white" />
              <h3 className="text-xl font-semibold text-[#F0FCE1]" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600 }}>
                Retenção
              </h3>
              <p className="mt-2 text-white" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}>
                O tempo de retenção em lives é 3x maior do que em vídeos gravados
              </p>
            </div>
            <div className="p-6 bg-[#0BE06F] rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <Flame className="h-12 w-12 mx-auto mb-4 text-white" />
              <h3 className="text-xl font-semibold text-[#F0FCE1]" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600 }}>
                Conversão
              </h3>
              <p className="mt-2 text-white" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}>
                Taxas de conversão em lives podem chegar a 20-30% em campanhas bem executadas
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="w-full py-12 px-8 bg-[#F0FCE1]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <div className="w-full md:w-1/2">
            <div className="p-6 rounded-2xl">
              <img
                src="/imagens/workshoplive.webp"
                alt="Perafkow"
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
          <div className="w-full md:w-1/2 text-center md:text-left">
            <h2
              className="text-left text-3xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#0AD991] to-[#07D122] text-transparent bg-clip-text"
              style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700 }}
            >
              O jeito mais fácil de vender na internet!
            </h2>
            <p
              className="text-left mt-4 text-lg text-gray-500"
              style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}
            >
              Com a estratégia Call Live, você transforma suas <strong> lives em verdadeiras máquinas de vendas</strong>, direcionando seu lead para o checkout de forma automatica, quando ele estiver mais engajado e pronto para comprar.
            </p>
          </div>
        </div>
      </section>
      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto pt-12 pb-12 px-4 sm:px-6 lg:px-8">
        <section className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">Escolha o Plano Perfeito para Você</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Descubra os planos do WorkshopLive e comece a criar experiências de venda incríveis com a tecnologia Call Live. Seja para iniciantes ou grandes empresas, temos a solução ideal!
          </p>
        </section>

        <section id="oferta" className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
              className="text-center inline-block px-6 py-3 bg-[#181818] text-white text-bold rounded-full text-sm font-medium hover:bg-[#0EA376] transition-all transform hover:scale-105"
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
                <FaCheck className="text-[#077655] mr-2" /> até 50 Mil Acessos em suas Lives
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
              className="text-center shine-button inline-block px-6 py-3 bg-gradient-to-r from-[#0AD991] to-[#07D122] text-white rounded-full text-sm font-medium hover:from-[#059669] hover:to-[#065F46] transition-all transform hover:scale-105"
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
              className="text-center inline-block px-6 py-3 bg-[#181818] text-white rounded-full text-sm font-medium hover:bg-[#0EA376] transition-all transform hover:scale-105"
            >
              Entrar em Contato
            </Link>
          </div>
        </section>
      </div>
      <section className="w-full py-12 px-8 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2
            className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#0AD991] to-[#07D122] text-transparent bg-clip-text"
            style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700 }}
          >
            Perguntas Frequentes
          </h2>
          <p
            className="mt-4 text-lg text-gray-500"
            style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}
          >
            Tire suas dúvidas sobre a Pera Flow e comece a vender mais!
          </p>
          <div className="mt-8 max-w-3xl mx-auto">
            <FaqItem
              question="Quantos dias eu tenho pra testar a ferramenta?"
              answer="Você tem 7 dias para fazer o teste da ferramenta garantidos por lei."
            />
            <FaqItem
              question="Preciso de conhecimentos técnicos para usar a Pera Flow?"
              answer="Não! Nossa plataforma é intuitiva e projetada para que qualquer pessoa possa configurar campanhas de Call Lives em poucos minutos, sem precisar de experiência técnica."
            />
            <FaqItem
              question="Posso redirecionar para checkout de quais plataformas?"
              answer="Todas, você pode usar qualquer checkout ou qualquer links de pagamento que você desejar."
            />
            <FaqItem
              question="O que fazer após a compra?"
              answer="Nada, você recebe o acesso de forma automática no seu e-mail."
            />
          </div>
        </div>
      </section>

      <footer className="w-full py-12 px-8 bg-[#181818]">
  <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
    <div className="w-full md:w-1/3 text-center md:text-left ">
      <img src="/logo.svg" alt="WorkshopLive Logo" className="h-10 w-auto mx-auto md:mx-0 rounded-xl" />
      <p
        className="mt-4 text-gray-400"
        style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}
      >
        Faça interações humanizadas como lives e calls ao vivo enquanto você dorme!
      </p>
    </div>
    <div className="w-full md:w-1/3 text-center flex flex-col md:flex-row justify-center gap-8">
      <div>
        <h3
          className="text-lg font-semibold text-white"
          style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600 }}
        >
          Menu
        </h3>
        <div className="mt-4 flex flex-col space-y-2">
          <Link href="/">
            <span className="text-gray-400 hover:text-[#0BE76E] cursor-pointer" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}>
              Home
            </span>
          </Link>
          <Link href="/login">
            <span className="text-gray-400 hover:text-[#0BE76E] cursor-pointer" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}>
              Login
            </span>
          </Link>
          <Link href="/planos">
            <span className="text-gray-400 hover:text-[#0BE76E] cursor-pointer" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}>
              Planos
            </span>
          </Link>
        </div>
      </div>
      <div>
        <h3
          className="text-lg font-semibold text-white"
          style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600 }}
        >
          Canais
        </h3>
        <div className="mt-4 flex flex-col space-y-2">
          <a href="https://www.instagram.com/workshoplive.com.br/" target="_blank" rel="noopener noreferrer">
            <span className="text-gray-400 hover:text-[#0BE76E] cursor-pointer" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}>
              Instagram
            </span>
          </a>
          <a href="https://www.youtube.com/@metodolive" target="_blank" rel="noopener noreferrer">
            <span className="text-gray-400 hover:text-[#0BE76E] cursor-pointer" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}>
              YouTube
            </span>
          </a>
          <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer">
            <span className="text-gray-400 hover:text-[#0BE76E] cursor-pointer" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}>
              TikTok
            </span>
          </a>
        </div>
      </div>
      <div>
        <h3
          className="text-lg font-semibold text-white"
          style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600 }}
        >
          Outros
        </h3>
        <div className="mt-4 flex flex-col space-y-2">
          <Link href="/sobre">
            <span className="text-gray-400 hover:text-[#0BE76E] cursor-pointer" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}>
              Sobre
            </span>
          </Link>
          <Link href="/politica">
            <span className="text-gray-400 hover:text-[#0BE76E] cursor-pointer" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}>
              Política
            </span>
          </Link>
          <Link href="/contato">
            <span className="text-gray-400 hover:text-[#0BE76E] cursor-pointer" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}>
              Contato
            </span>
          </Link>
        </div>
      </div>
    </div>
    <div className="w-full md:w-1/3 text-center md:text-right">
      <h3
        className="text-lg font-semibold text-white"
        style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600 }}
      >
        Contatos
      </h3>
      <p
        className="mt-4 text-gray-400"
        style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}
      >
        contato@peraflow.com.br
      </p>
    </div>
  </div>
  <div className="mt-12 text-center">
    <p
      className="text-gray-400 text-sm"
      style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400 }}
    >
      © 2025 - Todos os direitos Reservados. | WorkLive |{" "}
      <Link href="/termos">
        <span className="text-gray-400 hover:text-[#0BE76E] cursor-pointer">Termos e Condições de Uso</span>
      </Link>{" "}
      |{" "}
      <Link href="/politica">
        <span className="text-gray-400 hover:text-[#0BE76E] cursor-pointer">Política de privacidade</span>
      </Link>
    </p>
  </div>
</footer>
    </main>
  );
}