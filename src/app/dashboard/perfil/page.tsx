'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { UserCircle, Settings, Mail, LogOut, Video } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import '../../../components/ui/shine.css';

// Inicializar Supabase
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SubscriptionData {
  plan_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      // Buscar dados do usuário
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Buscar plano
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('plan_type, status, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      if (subError) {
        console.error('Erro ao buscar plano:', subError);
        setUserPlan('Nenhum plano ativo');
        setSubscriptionData(null);
      } else {
        const planType = subscription?.plan_type?.toLowerCase();
        if (planType === 'basic') {
          setUserPlan('Basic');
        } else if (planType === 'premium') {
          setUserPlan('premium');
        } else {
          setUserPlan('Nenhum plano ativo');
        }
        setSubscriptionData(subscription);
      }

      // Buscar nome do usuário
      const { data: userData, error: userDataError } = await supabase
        .from('usuarios')
        .select('nome')
        .eq('id', user.id)
        .single<{ nome: string }>();
      if (userDataError || !userData) {
        console.error('Erro ao buscar nome:', userDataError);
        setUserName('Não informado');
      } else {
        setUserName(userData.nome || 'Não informado');
      }

      setLoading(false);
    }
    fetchData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="font-lato min-h-screen bg-[#F3F4F8] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto relative">
        {/* Dropdown Menu no canto superior direito */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="group absolute top-0 right-0 flex items-center px-4 py-2 border border-[#181818] rounded-md text-sm font-medium text-[#1e1e1e] hover:bg-[#181818] hover:text-white transition-colors">
              <UserCircle className="w-5 h-5 mr-2 text-[#1e1e1e] group-hover:text-white transition-colors" />
              {'Perfil'}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[220px] bg-white rounded-md shadow-lg p-2 mt-2 z-50"
              sideOffset={5}
            >
              <DropdownMenu.Item className="flex items-center p-2 text-[#1e1e1e]">
                <UserCircle className="w-5 h-5 mr-2 text-[#059669]" />
                <span className="font-medium">{'Usuário'}</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item className="flex items-center p-2 text-gray-600">
                <Mail className="w-5 h-5 mr-2 text-[#059669]" />
                <span>{user?.email || 'Não informado'}</span>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
              <DropdownMenu.Item
                className="flex items-center p-2 text-[#1e1e1e] hover:bg-[#E6FFFA] rounded cursor-pointer"
                onSelect={() => router.push('/dashboard/configuracao')}
              >
                <Settings className="w-5 h-5 mr-2 text-[#059669]" />
                <span>Configuração</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex items-center p-2 text-[#1e1e1e] hover:bg-[#E6FFFA] rounded cursor-pointer"
                onSelect={() => router.push('/dashboard/criarlives')}
              >
                <Video className="w-5 h-5 mr-2 text-[#059669]" />
                <span>Criar Lives</span>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
              <DropdownMenu.Item
                className="flex items-center p-2 text-[#1e1e1e] hover:bg-[#E6FFFA] rounded cursor-pointer"
                onSelect={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-2 text-[#059669]" />
                <span>Deslogar</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <h1 className="text-3xl font-bold text-[#1e1e1e] mb-6 text-center">Seu Perfil</h1>
        <p className="text-lg text-gray-600 mb-12 text-center">
          Gerencie suas informações e acompanhe os detalhes do seu plano.
        </p>

        {loading ? (
          <div className="text-center text-gray-600">Carregando...</div>
        ) : (
          <>
            <div className={`grid ${userPlan === 'Basic' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'} gap-6 mb-12`}>
              {/* Card de Informações Pessoais */}
              <div className="bg-white p-6 rounded-lg shadow-md min-w-[250px]">
                <h2 className="text-lg font-semibold text-[#1e1e1e] mb-4">Informações Pessoais</h2>
                <div className="space-y-4">
                  <div>
                    <span className="text-gray-600">Nome:</span>
                    <p className="text-[#1e1e1e] font-medium">{userName || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">E-mail:</span>
                    <p className="text-[#1e1e1e] font-medium">{user?.email || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Plano:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded-full text-sm font-semibold ${
                        userPlan === 'Basic'
                          ? 'bg-[#E6FFFA] text-[#059669]'
                          : userPlan === 'premium'
                          ? 'bg-gradient-to-r from-pink-200 via-purple-200 via-blue-200 to-green-200 text-[#3C2F00] shadow-sm border border-white/30 backdrop-blur-sm'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      Plano: {userPlan || 'Carregando...'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card de Botão de Upgrade (Condicional) */}
              {userPlan === 'Basic' && (
                <div className="bg-white p-6 rounded-lg shadow-md min-w-[250px] flex flex-col items-center justify-center">
                  <h2 className="text-lg font-semibold text-[#1e1e1e] mb-4">Eleve Sua Experiência!</h2>
                  <p className="text-gray-600 mb-6 text-center">
                    Desbloqueie todas as funcionalidades da ferramenta, lives sem limites de acesso e muito mais!
                  </p>
                  <a
                    href="/upgrade"
                    className="shine-button inline-block px-6 py-3 bg-gradient-to-r from-[#0AD991] to-[#07D122] text-white rounded-full text-sm font-medium hover:from-[#059669] hover:to-[#065F46] transition-all transform hover:scale-105 whitespace-nowrap max-w-full text-center"
                  >
                    Fazer Upgrade para Premium
                  </a>
                </div>
              )}

              {/* Card de Detalhes da Assinatura */}
              {subscriptionData && (
                <div className="bg-white p-6 rounded-lg shadow-md min-w-[250px]">
                  <h2 className="text-lg font-semibold text-[#1e1e1e] mb-4">Detalhes da Assinatura</h2>
                  <div className="space-y-4">
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <p className="text-[#059669] font-medium capitalize">{subscriptionData.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Data de Início:</span>
                      <p className="text-[#1e1e1e] font-medium">
                        {new Date(subscriptionData.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Última Atualização:</span>
                      <p className="text-[#1e1e1e] font-medium">
                        {new Date(subscriptionData.updated_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seção de Contato */}
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Precisa de ajuda?{' '}
                <a href="/contact" className="text-[#059669] hover:underline font-medium">
                  Entre em contato!
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}