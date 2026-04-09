'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'react-hot-toast';
import { notFound } from 'next/navigation';
import InteracoesTabBar from '@/components/InteracoesTabBar';
import { Pencil, Trash2 } from 'lucide-react';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Interacao {
  id: string;
  user_live: string;
  comentario: string;
  tempo: number;
}

export default function VerInteracoesPage() {
  const router = useRouter();
  const params = useParams();
  const liveId = params.id as string;

  const [liveTitle, setLiveTitle] = useState<string | null>(null);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingInteracao, setEditingInteracao] = useState<Interacao | null>(null);
  const [deletingInteracaoId, setDeletingInteracaoId] = useState<string | null>(null);
  const [editUserLive, setEditUserLive] = useState('');
  const [editComentario, setEditComentario] = useState('');
  const [editMinutos, setEditMinutos] = useState('');
  const [editSegundos, setEditSegundos] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const interacoesPerPage = 20;

  // Verificar autenticação, buscar título da live e interações
  useEffect(() => {
    async function initialize() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: liveData, error: liveError } = await supabase
        .from('lives')
        .select('title')
        .eq('id', liveId)
        .single();

      if (liveError || !liveData) {
        console.error('Erro ao buscar live:', liveError);
        notFound();
      } else {
        setLiveTitle(liveData.title);
      }

      const { data: interacoesData, error: interacoesError } = await supabase
        .from('interacoes')
        .select('id, user_live, comentario, tempo')
        .eq('live_id', liveId)
        .order('tempo', { ascending: true });

      if (interacoesError) {
        console.error('Erro ao buscar interações:', interacoesError);
        toast.error('Erro ao carregar interações.');
      } else {
        setInteracoes(interacoesData || []);
      }

      setLoading(false);
    }
    initialize();
  }, [liveId, router]);

  // Converter segundos para formato X:YYmin
  const formatTempo = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}min`;
  };

  // Abrir modal de exclusão
  const handleOpenDeleteModal = (id: string) => {
    setDeletingInteracaoId(id);
  };

  // Fechar modal de exclusão
  const handleCloseDeleteModal = () => {
    setDeletingInteracaoId(null);
  };

  // Lidar com exclusão de interação
  const handleDelete = async () => {
    if (!deletingInteracaoId) return;

    const { error } = await supabase.from('interacoes').delete().eq('id', deletingInteracaoId);

    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
    } else {
      setInteracoes(interacoes.filter((interacao) => interacao.id !== deletingInteracaoId));
      toast.success('Interação excluída com sucesso');
      // Ajustar página atual se necessário
      const totalPages = Math.ceil(interacoes.length / interacoesPerPage);
      if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
      }
    }

    setDeletingInteracaoId(null);
  };

  // Abrir modal de edição
  const handleEdit = (interacao: Interacao) => {
    setEditingInteracao(interacao);
    setEditUserLive(interacao.user_live);
    setEditComentario(interacao.comentario);
    const minutes = Math.floor(interacao.tempo / 60);
    const seconds = interacao.tempo % 60;
    setEditMinutos(minutes.toString());
    setEditSegundos(seconds.toString());
  };

  // Validar e formatar minutos no modal
  const handleEditMinutosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = Number(value);
    if (value === '' || (Number.isInteger(numValue) && numValue >= 0)) {
      setEditMinutos(value);
    }
  };

  // Validar e formatar segundos no modal (0 a 60)
  const handleEditSegundosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = Number(value);
    if (value === '' || (Number.isInteger(numValue) && numValue >= 0 && numValue <= 60)) {
      setEditSegundos(value);
    }
  };

  // Salvar edição
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editUserLive || !editComentario) {
      toast.error('Preencha os campos Nome e Comentário.');
      return;
    }

    const minutosNum = parseInt(editMinutos) || 0;
    const segundosNum = parseInt(editSegundos) || 0;
    const tempoTotal = minutosNum * 60 + segundosNum;

    const { error } = await supabase
      .from('interacoes')
      .update({
        user_live: editUserLive,
        comentario: editComentario,
        tempo: tempoTotal,
      })
      .eq('id', editingInteracao!.id);

    if (error) {
      toast.error('Erro ao atualizar: ' + error.message);
    } else {
      setInteracoes(
        interacoes.map((interacao) =>
          interacao.id === editingInteracao!.id
            ? { ...interacao, user_live: editUserLive, comentario: editComentario, tempo: tempoTotal }
            : interacao
        )
      );
      toast.success('Interação atualizada com sucesso');
      setEditingInteracao(null);
    }
  };

  // Lógica de paginação
  const totalPages = Math.ceil(interacoes.length / interacoesPerPage);
  const startIndex = (currentPage - 1) * interacoesPerPage;
  const endIndex = startIndex + interacoesPerPage;
  const currentInteracoes = interacoes.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return <div className="w-[80%] mx-auto mt-8">Carregando...</div>;
  }

  return (
    <div className="w-[80%] mx-auto bg-white p-8 rounded-xl shadow-md font-lato mt-8 space-y-8">
      <Toaster />
      <h2 className="text-3xl font-bold text-[#1e1e1e]">
        Ver Interações - {liveTitle || 'Live'}
      </h2>
      <InteracoesTabBar liveId={liveId} activeTab="ver" />
      <div className="space-y-3">
        {interacoes.length === 0 ? (
          <p className="text-gray-500">Nenhuma interação encontrada.</p>
        ) : (
          currentInteracoes.map((interacao) => (
            <div
              key={interacao.id}
              className="max-w-2xl mx-auto p-3 border rounded-lg shadow-sm bg-gray-50 flex justify-between items-center"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{interacao.user_live}</p>
                <p className="text-sm text-gray-500">{formatTempo(interacao.tempo)} {interacao.comentario}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(interacao)}
                  className="text-gray-600 hover:text-gray-800"
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleOpenDeleteModal(interacao.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Componente de paginação */}
      {interacoes.length > interacoesPerPage && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <Button
              key={page}
              onClick={() => handlePageChange(page)}
              variant={currentPage === page ? 'default' : 'outline'}
              className={`px-3 py-1 ${currentPage === page ? 'bg-[#181818] text-white' : 'border-[#181818] text-[#181818] hover:bg-gray-100'}`}
            >
              {page}
            </Button>
          ))}
        </div>
      )}

      {/* Modal de edição */}
      {editingInteracao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Editar Interação</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  value={editUserLive}
                  onChange={(e) => setEditUserLive(e.target.value)}
                  placeholder="Digite o nome"
                  required
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Comentário</label>
                <textarea
                  value={editComentario}
                  onChange={(e) => setEditComentario(e.target.value)}
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
                    value={editMinutos}
                    onChange={handleEditMinutosChange}
                    placeholder="min"
                    className="w-1/2 p-2 border rounded"
                    min="0"
                    step="1"
                  />
                  <input
                    type="number"
                    value={editSegundos}
                    onChange={handleEditSegundosChange}
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
                  onClick={() => setEditingInteracao(null)}
                  className="border-[#181818] text-[#181818] hover:bg-gray-100"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#181818] hover:bg-[#2a2a2a] text-white">
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deletingInteracaoId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Confirmar Exclusão</h3>
            <p className="text-sm text-gray-600 mb-6">
              Tem certeza que deseja excluir esta interação?
            </p>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDeleteModal}
                className="border-[#181818] text-[#181818] hover:bg-gray-100"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}