'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Termos() {
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
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">Termos e Condições de Uso – WorkshopLive</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Bem-vindo aos Termos e Condições de Uso do WorkshopLive. Este documento estabelece as regras e condições para a utilização da nossa plataforma, em conformidade com a legislação brasileira, incluindo o Código de Defesa do Consumidor (Lei nº 8.078/90) e a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/18). Ao acessar ou usar a plataforma, você concorda com os termos aqui descritos.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">1. Objetivo da Plataforma</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            A WorkshopLive é uma plataforma digital destinada à criação e transmissão de eventos ao vivo com vídeos pré-gravados, oferecendo uma experiência interativa para infoprodutores e seus públicos. Nosso objetivo é fornecer ferramentas que facilitem o engajamento de leads e a conversão de vendas para empreendedores e profissionais de marketing digital.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">2. Aceitação dos Termos</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Ao se cadastrar, acessar ou utilizar os serviços da WorkshopLive, você declara ter lido, compreendido e concordado com estes Termos e Condições de Uso, bem como com nossa Política de Privacidade. Caso não concorde com qualquer disposição, recomendamos que não utilize a plataforma.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">3. Cadastro e Acesso</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Para utilizar a plataforma, é necessário realizar um cadastro fornecendo informações verdadeiras e completas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta. A WorkshopLive não se responsabiliza por acessos não autorizados decorrentes de falhas na proteção das credenciais pelo usuário.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">4. Uso Adequado da Plataforma</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Você concorda em utilizar a WorkshopLive de forma lícita e ética, respeitando as leis aplicáveis. É expressamente proibido:
          </p>
          <ul className="text-lg text-gray-600 leading-relaxed list-disc pl-6">
            <li>Publicar ou transmitir conteúdo ilegal, ofensivo, difamatório, pornográfico ou que infrinja direitos de terceiros;</li>
            <li>Violar direitos autorais, marcas registradas ou outros direitos de propriedade intelectual;</li>
            <li>Utilizar a plataforma para atividades fraudulentas ou enganosas;</li>
            <li>Tentar acessar, modificar ou interferir no funcionamento da plataforma de forma não autorizada.</li>
          </ul>
          <p className="text-lg text-gray-600 leading-relaxed mt-4">
            A violação destas regras poderá resultar na suspensão ou encerramento da sua conta, sem prejuízo de outras medidas legais cabíveis.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">5. Propriedade Intelectual</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Todo o conteúdo da plataforma, incluindo textos, logotipos, designs, softwares e funcionalidades, é de propriedade da WorkshopLive ou de seus licenciadores e está protegido por leis de propriedade intelectual. Você não pode copiar, modificar, distribuir ou utilizar qualquer conteúdo da plataforma sem autorização expressa.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            O conteúdo criado e publicado por você na plataforma permanece de sua propriedade, mas você concede à WorkshopLive uma licença não exclusiva, mundial e isenta de royalties para hospedar, exibir e processar esse conteúdo exclusivamente para a prestação dos serviços.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">6. Pagamentos e Assinaturas</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            O acesso a determinados recursos da WorkshopLive requer a assinatura de um plano pago. Você concorda em pagar as taxas aplicáveis conforme descrito na página de <Link href="/planos" className="text-[#077655] hover:text-[#0EA376]">Planos</Link>. Todas as assinaturas são renovadas automaticamente, salvo notificação de cancelamento antes do término do período vigente.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">7. Política de Reembolso</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Nos termos do Artigo 49 do Código de Defesa do Consumidor (Lei nº 8.078/90), você tem o direito de solicitar o reembolso integral dentro de 7 (sete) dias corridos a contar da data de compra, desde que não tenha utilizado a plataforma de forma significativa. Após esse período, reembolsos serão analisados caso a caso, considerando situações como falhas técnicas não resolvidas.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            Para solicitar um reembolso, entre em contato pelo e-mail <a href="mailto:suporte@workshoplive.com.br" className="text-[#077655] hover:text-[#0EA376]">suporte@workshoplive.com.br</a>, informando os detalhes da compra e o motivo da solicitação.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">8. Cancelamento de Conta</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Você pode cancelar sua conta a qualquer momento através das configurações da plataforma. Após o cancelamento, seus dados e conteúdos poderão ser permanentemente excluídos após 30 dias, conforme disposto na LGPD. O cancelamento não implica reembolso automático, salvo nos casos previstos na Política de Reembolso.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">9. Limitação de Responsabilidade</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            A WorkshopLive não se responsabiliza por danos diretos, indiretos, incidentais ou consequenciais decorrentes do uso ou incapacidade de uso da plataforma, exceto nos casos previstos em lei. Não garantimos que a plataforma estará livre de interrupções ou erros, mas trabalharemos para corrigir eventuais problemas com a maior brevidade possível.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">10. Alterações nos Termos</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            A WorkshopLive reserva-se o direito de modificar estes Termos e Condições a qualquer momento. Alterações significativas serão comunicadas por e-mail ou diretamente na plataforma. O uso contínuo da plataforma após tais alterações implica aceitação dos novos termos.
          </p>
        </section>

        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#555555] mb-6">11. Foro e Legislação Aplicável</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Estes Termos são regidos pelas leis da República do Brasil. Qualquer disputa decorrente deste documento será submetida ao foro da comarca da capital do estado onde a WorkshopLive mantém sua sede, salvo disposição em contrário prevista no Código de Defesa do Consumidor.
          </p>
        </section>

        <section className="mb-12">
          <p className="text-lg text-gray-600 leading-relaxed">
            Em caso de dúvidas sobre estes Termos ou para suporte, entre em contato conosco.
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