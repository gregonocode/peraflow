'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Dialog } from '@headlessui/react';
import { Toaster, toast } from 'react-hot-toast';
import { EllipsisVertical, Unplug } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Fluxos {
  id: string;
  user_id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export default function FluxosPage() {
  const [fluxos, setFluxos] = useState<Fluxos[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [fluxoName, setFluxoName] = useState('');
  const [loading, setLoading] = useState(false);
  const [planType, setPlanType] = useState<string | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const router = useRouter();

  const goToFluxo = (id: string) => router.push(`/dashboard/fluxos/${id}`);

  // Carrega fluxos do usuário
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      // Plano do usuário
      try {
        const { data: usuario, error: usuarioErr } = await supabase
          .from('usuarios')
          .select('plan_type')
          .eq('user_id', session.user.id)
          .single();
        if (usuarioErr || !usuario) {
          setPlanType('basic');
        } else {
          setPlanType(usuario.plan_type || 'basic');
        }
      } catch {
        setPlanType('basic');
      }

      const { data, error } = await supabase
        .from('fluxos')
        .select('id, user_id, nome, ativo, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && data) setFluxos(data);

      setIsLoadingPlan(false);
    };
    checkAuthAndLoad();
  }, [router]);

  const canCreateFlux = !isLoadingPlan && planType === 'premium';

  // Criar fluxo
  const handleCreateFluxo = async () => {
    if (!canCreateFlux) {
      if (isLoadingPlan) return;
      if (planType === 'basic') {
        toast.error('Seu plano atual não permite criar fluxos. Faça upgrade para o plano Premium.');
      } else {
        toast.error('Você não tem permissão para criar fluxos no seu plano atual.');
      }
      return;
    }
    if (!fluxoName) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('fluxos')
        .insert([{ nome: fluxoName, user_id: session.user.id, ativo: true }])
        .select('id, user_id, nome, ativo, created_at')
        .single();

      if (error) {
        toast.error('Erro ao criar fluxo');
        return;
      }

      setFluxos((prev) => [data, ...prev]);
      setFluxoName('');
      setIsOpen(false);
      toast.success('Fluxo criado com sucesso!');
    } finally {
      setLoading(false);
    }
  };

  // Excluir fluxo
  const handleDeleteFluxo = async (id: string) => {
    const confirm = window.confirm('Deseja realmente excluir este fluxo?');
    if (!confirm) return;

    const { error } = await supabase.from('fluxos').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao excluir fluxo');
      return;
    }

    setFluxos((prev) => prev.filter((f) => f.id !== id));
    toast.success('Fluxo excluído com sucesso!');
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Toaster position="top-right" />

      <div className="flex-1 p-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6 p-6 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">Seus Fluxos</h1>
          {isLoadingPlan ? (
            <button
              disabled
              className="px-4 py-2 bg-gray-200 text-gray-500 font-semibold rounded-full cursor-not-allowed border border-gray-300"
            >
              Carregando...
            </button>
          ) : !canCreateFlux ? (
            <button
              disabled
              className="relative px-4 py-2 bg-gray-200 text-gray-500 font-semibold rounded-full cursor-not-allowed border border-gray-300"
            >
              Recurso disponível no Premium
              <span className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-200 via-purple-200 via-blue-200 to-green-200 text-[#3C2F00] shadow-sm border border-white/30 backdrop-blur-sm text-[9px] px-2 py-0.5 rounded-full font-bold">PREMIUM</span>
            </button>
          ) : (
            <button
              onClick={() => setIsOpen(true)}
              className="px-4 py-2 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors"
            >
              Criar Fluxo
            </button>
          )}
        </div>

        {/* Lista de fluxos */}
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-xs text-gray-500 mb-2">Plano: {planType || 'Carregando...'}</p>
          {planType === 'basic' && (
            <p className="text-xs text-amber-600 mb-4">
              No plano Basic não é possível criar fluxos do Bootzap. Faça upgrade para o plano Premium para ativar automações personalizadas.
            </p>
          )}
          {fluxos.length === 0 ? (
            <p className="text-gray-600">Você não tem nenhum fluxo criado.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {fluxos.map((fluxo) => (
                <div
                  key={fluxo.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => goToFluxo(fluxo.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') goToFluxo(fluxo.id);
                  }}
                  className="flex items-center justify-between bg-white shadow-sm rounded-lg border border-gray-200 p-4 hover:bg-green-50 cursor-pointer transition-colors"
                >
                  {/* lado esquerdo */}
                  <div className="flex items-center gap-3">
                    <Unplug className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-800 font-medium">{fluxo.nome}</span>
                  </div>

                  {/* lado direito (menu) */}
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        className="p-2 rounded-full hover:bg-gray-100"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        aria-label="Ações do fluxo"
                      >
                        <EllipsisVertical className="w-5 h-5 text-gray-500" />
                      </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className="bg-white shadow-md border border-gray-200 rounded-md p-1"
                        sideOffset={5}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu.Item
                          className="px-3 py-2 text-sm text-gray-700 rounded-md cursor-pointer hover:bg-gray-100"
                          onClick={() => goToFluxo(fluxo.id)}
                        >
                          Editar
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          className="px-3 py-2 text-sm text-red-600 rounded-md cursor-pointer hover:bg-red-50"
                          onClick={() => handleDeleteFluxo(fluxo.id)}
                        >
                          Excluir
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de criação */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6">
            <Dialog.Title className="text-xl font-semibold text-gray-800">
              Criar Novo Fluxo
            </Dialog.Title>
            <input
              type="text"
              value={fluxoName}
              onChange={(e) => setFluxoName(e.target.value)}
              placeholder="Nome do fluxo"
              className="mt-4 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateFluxo}
                disabled={!fluxoName || loading}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
