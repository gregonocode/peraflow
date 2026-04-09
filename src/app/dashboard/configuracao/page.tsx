'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Settings, Mail, LogOut, Video, UserCircle, Edit } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import toast, { Toaster } from 'react-hot-toast';
import '../../../components/ui/shine.css';

// Inicializar Supabase
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AddressData {
  cidade: string;
  endereco: string;
  phone: string;
  numero_casa: string;
  cep: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null);
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [addressData, setAddressData] = useState<AddressData>({
    cidade: '',
    endereco: '',
    phone: '',
    numero_casa: '',
    cep: '',
  });
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLinkSent, setIsLinkSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
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
        .select('plan_type')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single<{ plan_type: string }>();
      if (subError) {
        console.error('Erro ao buscar plano:', subError);
        setUserPlan('Nenhum plano ativo');
      } else {
        const planType = subscription?.plan_type?.toLowerCase();
        if (planType === 'basic') {
          setUserPlan('Basic');
        } else if (planType === 'pro') {
          setUserPlan('Premium');
        } else {
          setUserPlan('Nenhum plano ativo');
        }
      }

      // Buscar dados de endereço e nome
      const { data: userData, error: addressError } = await supabase
        .from('usuarios')
        .select('cidade, endereco, phone, numero_casa, cep, nome, email')
        .eq('id', user.id)
        .single<AddressData & { nome: string; email: string }>();
      if (!addressError && userData) {
        setAddressData({
          cidade: userData.cidade || '',
          endereco: userData.endereco || '',
          phone: userData.phone || '',
          numero_casa: userData.numero_casa || '',
          cep: userData.cep || '',
        });
        setUserName(userData.nome || 'Não informado');
      } else {
        setUserName('Não informado');
      }
      setLoading(false);
    }
    fetchData();
  }, [router]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddressData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Atualizar dados de endereço
      const { error: addressError } = await supabase
        .from('usuarios')
        .update({
          cidade: addressData.cidade,
          endereco: addressData.endereco,
          phone: addressData.phone,
          numero_casa: addressData.numero_casa,
          cep: addressData.cep,
        })
        .eq('id', user.id);
      if (addressError) {
        console.error('Erro ao atualizar dados de endereço:', addressError);
        toast.error('Erro ao atualizar dados de endereço. Tente novamente.', {
          position: 'bottom-right',
        });
        return;
      }

      toast.success('Alterações salvas com sucesso!', {
        position: 'bottom-right',
      });
      setIsEditingAddress(false);
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado ao salvar os dados.', {
        position: 'bottom-right',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleResetPassword = async () => {
    if (!user?.email) {
      toast.error('Erro: Email do usuário não encontrado.', {
        position: 'bottom-right',
      });
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        console.error('Erro ao enviar link de redefinição:', error);
        toast.error('Erro ao enviar o link de redefinição. Tente novamente.', {
          position: 'bottom-right',
        });
        return;
      }

      // Marcar a barra de aviso como fechada
      localStorage.setItem('hasClosedWarning', 'true');
      setIsLinkSent(true);
      toast.success('Link de redefinição enviado com sucesso!', {
        position: 'bottom-right',
      });
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado ao enviar o link.', {
        position: 'bottom-right',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsLinkSent(false); // Reseta o estado do modal ao fechar
  };

  return (
    <div className="font-lato min-h-screen bg-[#F1F1F1] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto relative">
        <Toaster position="bottom-right" />

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-lg font-semibold text-[#1e1e1e] mb-4">
                Redefinir Senha
              </h2>
              <p className="text-gray-600 mb-4">
                {isLinkSent ? (
                  <span className="text-[#34D399] font-medium">
                    Você recebeu o Link de alteração de senha no seu email.
                  </span>
                ) : (
                  <>
                    Clique em Receber Link e receba o Link no seu email <strong> ({user?.email || 'Não informado'})</strong>, e altere sua senha agora!
                  </>
                )}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={isLinkSent ? handleCloseModal : handleResetPassword}
                  disabled={isSending}
                  className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                    isSending ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#34D399] hover:bg-[#059669]'
                  } transition-colors`}
                  aria-label={isLinkSent ? 'Fechar modal' : 'Receber link de redefinição'}
                >
                  {isSending ? 'Enviando...' : isLinkSent ? 'Fechar' : 'Receber Link'}
                </button>
              </div>
            </div>
          </div>
        )}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="group absolute top-0 right-0 flex items-center px-4 py-2 border border-[#181818] rounded-md text-sm font-medium text-[#1e1e1e] hover:bg-[#181818] hover:text-white transition-colors">
              <Settings className="w-5 h-5 mr-2 text-[#1e1e1e] group-hover:text-white transition-colors" />
              Config.
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[220px] bg-white rounded-md shadow-lg p-2 mt-2 z-50"
              sideOffset={5}
            >
              <DropdownMenu.Item className="flex items-center p-2 text-[#1e1e1e]">
                <UserCircle className="w-5 h-5 mr-2 text-[#059669]" />
                <span className="font-medium">Usuário</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item className="flex items-center p-2 text-gray-600">
                <Mail className="w-5 h-5 mr-2 text-[#059669]" />
                <span>{user?.email || 'Não informado'}</span>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
              <DropdownMenu.Item
                className="flex items-center p-2 text-[#1e1e1e] hover:bg-[#E6FFFA] rounded cursor-pointer"
                onSelect={() => router.push('/dashboard/perfil')}
              >
                <UserCircle className="w-5 h-5 mr-2 text-[#059669]" />
                <span>Perfil</span>
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

        <h1 className="text-3xl font-bold text-[#1e1e1e] mb-6 text-center">Configurações</h1>
        <p className="text-lg text-gray-600 mb-12 text-center">
          Personalize sua experiência e gerencie suas preferências.
        </p>

        {loading ? (
          <div className="text-center text-gray-600">Carregando...</div>
        ) : (
          <>
            {userPlan === 'Basic' && (
              <div className="bg-white p-4 rounded-lg shadow-md mb-8 flex justify-between items-center">
                <div className="flex items items-center">
                  <span className="text-gray-600 mr-2">Plano Atual:</span>
                  <span className="px-2 py-1 rounded-full text-sm font-semibold bg-[#E6FFFA] text-[#059669]">
                    Basic
                  </span>
                </div>
                <a
                  href="/upgrade"
                  className="shine-button inline-block px-4 py-2 bg-gradient-to-r from-[#0AD991] to-[#07D122] text-white rounded-md text-sm font-medium hover:from-[#059669] hover:to-[#065F46] transition-all transform hover:scale-105"
                >
                  Fazer Upgrade para Premium
                </a>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <div className="flex items-center mb-4">
                <Settings className="w-5 h-5 text-[#1e1e1e] mr-2" />
                <h1 className="text-lg font-semibold text-[#1e1e1e]">Informações da Conta</h1>
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <UserCircle className="w-5 h-5 text-[#1e1e1e] mr-2" />
                  <div>
                    <span className="text-gray-600">Nome Completo:</span>
                    <p className="text-[#1e1e1e] font-medium">{userName || 'Não informado'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-[#1e1e1e] mr-2" />
                  <div>
                    <span className="text-gray-600">E-mail:</span>
                    <p className="text-[#1e1e1e] font-medium">{user?.email || 'Não informado'}</p>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-block px-4 py-2 bg-[#059669] text-white rounded-md text-sm font-medium hover:bg-[#065F46] transition-colors"
                  >
                    Alterar Senha
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#1e1e1e]">Dados de Endereço</h2>
                <button
                  onClick={() => setIsEditingAddress(true)}
                  className="flex items-center px-4 py-2 bg-[#059669] text-white rounded-md text-sm font-medium hover:bg-[#065F46] transition-colors"
                >
                  <Edit className="w-5 h-5 mr-2" />
                  Editar
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-600" htmlFor="cidade">Cidade:</label>
                  <input
                    id="cidade"
                    name="cidade"
                    type="text"
                    value={addressData.cidade}
                    onChange={handleAddressChange}
                    disabled={!isEditingAddress}
                    className={`w-full mt-1 p-2 border border-gray-300 rounded-md text-[#1e1e1e] ${
                      isEditingAddress ? 'focus:border-[#059669] focus:ring-[#059669]' : 'bg-gray-100'
                    }`}
                    placeholder="Digite sua cidade"
                  />
                </div>
                <div>
                  <label className="text-gray-600" htmlFor="endereco">Endereço:</label>
                  <input
                    id="endereco"
                    name="endereco"
                    type="text"
                    value={addressData.endereco}
                    onChange={handleAddressChange}
                    disabled={!isEditingAddress}
                    className={`w-full mt-1 p-2 border border-gray-300 rounded-md text-[#1e1e1e] ${
                      isEditingAddress ? 'focus:border-[#059669] focus:ring-[#059669]' : 'bg-gray-100'
                    }`}
                    placeholder="Digite seu endereço"
                  />
                </div>
                <div>
                  <label className="text-gray-600" htmlFor="telefone">WhatsApp:</label>
                  <input
                    id="telefone"
                    name="telefone"
                    type="text"
                    value={addressData.phone}
                    onChange={handleAddressChange}
                    disabled={!isEditingAddress}
                    className={`w-full mt-1 p-2 border border-gray-300 rounded-md text-[#1e1e1e] ${
                      isEditingAddress ? 'focus:border-[#059669] focus:ring-[#059669]' : 'bg-gray-100'
                    }`}
                    placeholder="Digite seu número de WhatsApp"
                  />
                </div>
                <div>
                  <label className="text-gray-600" htmlFor="numero_casa">Número:</label>
                  <input
                    id="numero_casa"
                    name="numero_casa"
                    type="text"
                    value={addressData.numero_casa}
                    onChange={handleAddressChange}
                    disabled={!isEditingAddress}
                    className={`w-full mt-1 p-2 border border-gray-300 rounded-md text-[#1e1e1e] ${
                      isEditingAddress ? 'focus:border-[#059669] focus:ring-[#059669]' : 'bg-gray-100'
                    }`}
                    placeholder="Digite o número da casa"
                  />
                </div>
                <div>
                  <label className="text-gray-600" htmlFor="cep">CEP:</label>
                  <input
                    id="cep"
                    name="cep"
                    type="text"
                    value={addressData.cep}
                    onChange={handleAddressChange}
                    disabled={!isEditingAddress}
                    className={`w-full mt-1 p-2 border border-gray-300 rounded-md text-[#1e1e1e] ${
                      isEditingAddress ? 'focus:border-[#059669] focus:ring-[#059669]' : 'bg-gray-100'
                    }`}
                    placeholder="Digite seu CEP"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mb-8">
              <button
                onClick={handleSavePreferences}
                disabled={saving}
                className={`px-6 py-3 rounded-md text-sm font-medium text-white ${
                  saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#181818] hover:bg-[#2D2D2D]'
                } transition-colors`}
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>

            <div className="flex justify-center space-x-2 text-gray-600">
              <p>Precisa de ajuda?</p>
              <a href="/contact" className="text-[#059669] hover:text-[#065F46]">
                Entre em contato!
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}