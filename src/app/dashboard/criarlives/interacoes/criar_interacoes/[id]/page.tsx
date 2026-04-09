'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'react-hot-toast';
import { notFound } from 'next/navigation';
import InteracoesTabBar from '@/components/InteracoesTabBar';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CriarInteracoesPage() {
  const router = useRouter();
  const params = useParams();
  const liveId = params.id as string;

  const [liveTitle, setLiveTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLive, setUserLive] = useState('');
  const [comentario, setComentario] = useState('');
  const [minutos, setMinutos] = useState('');
  const [segundos, setSegundos] = useState('');

  // Usar useRef para evitar múltiplos toasts
  const toastTriggered = useRef(false);

  // Verificar autenticação e buscar título da live
  useEffect(() => {
    async function initialize() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('lives')
        .select('title')
        .eq('id', liveId)
        .single();

      if (error || !data) {
        console.error('Erro ao buscar live:', error);
        notFound();
      } else {
        setLiveTitle(data.title);
      }
      setLoading(false);
    }
    initialize();
  }, [liveId, router]);

  // Validar e formatar minutos
  const handleMinutosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permitir apenas números ou vazio
    const numValue = Number(value);
    if (value === '' || (Number.isInteger(numValue) && numValue >= 0)) {
      setMinutos(value);
    }
  };

  // Validar e formatar segundos (0 a 60)
  const handleSegundosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permitir apenas números ou vazio
    const numValue = Number(value);
    if (value === '' || (Number.isInteger(numValue) && numValue >= 0 && numValue <= 60)) {
      setSegundos(value);
    }
  };

  // Converter segundos para formato X:YYmin
  const formatTempo = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}min`;
  };

  // Lidar com o envio do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userLive || !comentario) {
      toast.error('Preencha os campos Nome e Comentário.');
      return;
    }

    // Converter minutos e segundos para o total em segundos
    const minutosNum = parseInt(minutos) || 0;
    const segundosNum = parseInt(segundos) || 0;
    const tempoTotal = minutosNum * 60 + segundosNum;

    const { error } = await supabase.from('interacoes').insert([
      {
        live_id: liveId,
        user_live: userLive,
        comentario,
        tempo: tempoTotal,
      },
    ]);

    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      // Resetar o controle de toast
      toastTriggered.current = false;

      // Toast custom no top-center
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <img
                    className="h-10 w-10 rounded-full"
                    src="/logo.svg"
                    alt="Logo"
                  />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{userLive}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatTempo(tempoTotal)} {comentario}!
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-800 focus:outline-none"
              >
                Fechar
              </button>
            </div>
          </div>
        ),
        { position: 'top-center' }
      );

      
      // Toast success no bottom-right após 2 segundos, apenas uma vez
      if (!toastTriggered.current) {
        toastTriggered.current = true;
        setTimeout(() => {
          toast.success('Interação criada com sucesso', { position: 'top-right' });
        }, 2000);
      }

      

      setUserLive('');
      setComentario('');
      setMinutos('');
      setSegundos('');
    }
  };

  if (loading) {
    return <div className="w-[80%] mx-auto mt-8">Carregando...</div>;
  }

  return (
    <div className="w-[80%] mx-auto bg-white p-8 rounded-xl shadow-md font-lato mt-8 space-y-8">
      <Toaster />
      <h2 className="text-3xl font-bold text-[#1e1e1e]">
        Adicionar Interação - {liveTitle || 'Live'}
      </h2>
      <InteracoesTabBar liveId={liveId} activeTab="criar" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome</label>
          <input
            type="text"
            value={userLive}
            onChange={(e) => setUserLive(e.target.value)}
            placeholder="Digite o nome"
            required
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Comentário</label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Digite o comentário"
            required
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tempo</label>
          <div className="flex gap-4">
            <input
              type="number"
              value={minutos}
              onChange={handleMinutosChange}
              placeholder="min"
              className="w-1/2 p-2 border rounded"
              min="0"
              step="1"
            />
            <input
              type="number"
              value={segundos}
              onChange={handleSegundosChange}
              placeholder="seg"
              className="w-1/2 p-2 border rounded"
              min="0"
              max="60"
              step="1"
            />
          </div>
        </div>
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/criarlives/interacoes')}
            className="border-[#181818] text-[#181818] hover:bg-gray-100"
          >
            Voltar
          </Button>
          <Button type="submit" className="bg-[#181818] hover:bg-[#2a2a2a] text-white cursor-pointer">
            Salvar
          </Button>
        </div>
      </form>
    </div>
  );
}