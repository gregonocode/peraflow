'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Politica() {
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
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">Política de Uso e Reembolso – WorkshopLive</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Bem-vindo à Política de Uso e Reembolso do WorkshopLive. Esta página estabelece as regras, responsabilidades e direitos dos usuários e da plataforma, em conformidade com as leis brasileiras, incluindo o Código de Defesa do Consumidor (Lei nº 8.078/90) e a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/18).
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">1. Sobre a WorkshopLive</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            A WorkshopLive é uma plataforma digital que permite a criação e transmissão de eventos ao vivo com vídeos pré-gravados, simulando experiências interativas para infoprodutores e seus alunos. Nossa missão é capacitar empreendedores e profissionais de marketing digital com uma ferramenta inovadora para engajar leads e maximizar conversões.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">2. Aceite dos Termos</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Ao utilizar a plataforma WorkshopLive, o usuário concorda com todos os termos desta política, incluindo as regras de uso, prazos e condições de reembolso, bem como o compromisso com a boa-fé e o respeito às leis brasileiras. O não cumprimento destes termos pode resultar em suspensão ou cancelamento da conta.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">3. Acesso à Plataforma</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            O acesso à WorkshopLive é realizado mediante cadastro e assinatura de um plano. É de responsabilidade do usuário manter seus dados de cadastro atualizados e protegidos, garantindo a segurança de sua conta.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">4. Regras de Uso</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            É expressamente proibido o uso da plataforma para disseminar conteúdos ilegais, ofensivos, pornográficos, discriminatórios ou que violem direitos autorais. O conteúdo publicado nas lives simuladas é de responsabilidade exclusiva do usuário criador. A WorkshopLive reserva-se o direito de suspender ou encerrar contas que violem estas regras, sem direito a reembolso.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">5. Política de Reembolso</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            De acordo com o Artigo 49 do Código de Defesa do Consumidor (Lei nº 8.078/90), o usuário tem o direito de solicitar o reembolso total do valor pago por qualquer plano em até 7 dias corridos após a compra, desde que não tenha feito uso substancial da plataforma. Após esse período, reembolsos serão concedidos apenas em casos excepcionais, como problemas técnicos não resolvidos pela equipe de suporte ou cobranças indevidas.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            Para solicitar um reembolso, o usuário deve entrar em contato pelo e-mail <a href="mailto:suporte@workshoplive.com.br" className="text-[#077655] hover:text-[#0EA376]">suporte@workshoplive.com.br</a>, informando os dados da compra e o motivo da solicitação.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">6. Cancelamento de Conta</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            O usuário pode cancelar sua conta a qualquer momento através da plataforma. O cancelamento não implica reembolso automático, exceto nos casos previstos na Política de Reembolso. Após o cancelamento, todos os dados e lives criadas poderão ser removidos permanentemente após 30 dias.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">7. Privacidade e Segurança</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            A WorkshopLive trata todos os dados dos usuários em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/18). As informações fornecidas são usadas exclusivamente para fins operacionais, como gerenciamento de contas e suporte, e nunca são compartilhadas ou vendidas a terceiros.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">8. Alterações nesta Política</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            A WorkshopLive poderá atualizar esta política a qualquer momento para refletir mudanças na legislação, melhorias na plataforma ou outras necessidades operacionais. Notificações sobre alterações significativas serão enviadas por e-mail ou exibidas diretamente na plataforma.
          </p>
        </section>

        <section className="mb-12">
          <p className="text-lg text-gray-600 leading-relaxed">
            Caso tenha dúvidas sobre esta política ou precise de suporte, entre em contato conosco.
          </p>
          <Link
            href="/contato"
            className="inline-block mt-6 rounded-md bg-[#077655] px-6 py-3 text-white font-bold transition-all duration-300 hover:bg-[#0EA376] hover:scale-105"
          >
            Entre em Contato
          </Link>
        </section>
      </div>
    </main>
  );
}