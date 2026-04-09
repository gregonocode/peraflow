'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import * as tus from 'tus-js-client';
import { CircleHelp, MoreVertical, X, CloudUpload, Video } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

interface Live {
  id: string;
  title: string;
  user_id: string;
  video_url: string | null;
  expires_at: string;
  link_oferta: string | null;
  visitantes_live: number | null;
  minuto_oferta: number | null;
  bunny_guid: string | null;
}

interface BunnyApiResponse {
  guid: string;
  tusEndpoint: string;
  signature: string;
  expire: number;
  libraryId: string;
  videoUrl: string;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CriarLive() {
  const router = useRouter();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [showModal, setShowModal] = useState(false);
  const [nomeLive, setNomeLive] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [minuto, setMinuto] = useState('');
  const [segundo, setSegundo] = useState('');
  const [linkOferta, setLinkOferta] = useState('');
  const [visitantes, setVisitantes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lives, setLives] = useState<Live[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [selectedLive, setSelectedLive] = useState<Live | null>(null);
  const [totalInteracoes, setTotalInteracoes] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [liveIdToDelete, setLiveIdToDelete] = useState<string | null>(null);
  const [planType, setPlanType] = useState<string | null>(null);
  const [maxLives, setMaxLives] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && menuOpen !== null) {
        setMenuOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const fetchLives = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('lives')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(`Erro ao carregar lives: ${error.message}`, { position: 'top-center' });
      return;
    }
    setLives(data || []);
  };

  const fetchPlanType = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('plan_type')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (error || !data) {
        setPlanType('basic');
        return;
      }
      const { plan_type } = data as { plan_type: string | null };
      setPlanType(plan_type ?? 'basic');
    } catch {
      setPlanType('basic');
    }
  };

  const fetchInteracoes = async (liveId: string) => {
    const { data, error } = await supabase
      .from('interacoes_por_live')
      .select('total_interacoes')
      .eq('live_id', liveId)
      .limit(1);
    if (error) {
      console.error('Erro ao carregar interações:', error.message);
      setTotalInteracoes(null);
      return;
    }
    if (data.length === 0) {
      console.log(`Nenhuma interação encontrada para live_id: ${liveId}`);
      setTotalInteracoes(null);
      return;
    }
    setTotalInteracoes(data[0].total_interacoes ?? 0);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setIsLoadingData(true);
        await Promise.all([
          fetchPlanType(user.id),
          fetchLives(),
        ]);
        setIsLoadingData(false);
      }
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    if (planType === 'premium') {
      setMaxLives(5);
    } else if (planType) {
      setMaxLives(2);
    }
  }, [planType]);

  const livesCount = lives.length;
  const canCreateLive = !!planType && maxLives > 0 && livesCount < maxLives;

  const requestTusCredentials = async (title: string): Promise<BunnyApiResponse> => {
    const res = await fetch('/api/upload-bunny', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ titulo: title }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Erro ao criar vídeo na Bunny.net');
    }
    const data = await res.json();
    console.log('–– upload-bunny response ––', {
      guid: data.guid,
      tusEndpoint: data.tusEndpoint,
      signature: data.signature,
      expire: data.expire,
      libraryId: data.libraryId,
      videoUrl: data.videoUrl,
    });
    return data;
  };

const insertLive = async (
  userId: string,
  title: string,
  videoUrl: string,
  guid: string,
  totalSegundos: number | null,
): Promise<string> => {
  const { data: liveData, error: liveError } = await supabase
    .from('lives')
    .insert({
      title,
      user_id: userId,  // Mantém como está
      video_url: videoUrl,
      link_oferta: linkOferta || null,
      visitantes_live: visitantes ? parseInt(visitantes) : null,
      minuto_oferta: totalSegundos || null,
      bunny_guid: guid,
    })
    .select('id')
    .single();
  if (liveError) throw new Error(liveError.message);

  const liveUrl = `http://www.workshoplive.com.br/live/${liveData.id}`;
  const { error: linkError } = await supabase // Adicione 'data: linkData' para retornar o insert (opcional, mas útil)
    .from('links')
    .insert({
      live_id: liveData.id,
      url: liveUrl,
      is_active: true,
      nome: title,
      user_id: userId  // Adicione isso aqui! Agora user_id será preenchido com o ID do usuário autenticado.
    })
    .select();  // Adicione .select() para retornar o registro inserido (opcional, mas ajuda em logs/erros)
  if (linkError) throw new Error(linkError.message);

  return liveUrl;
};

  const handleAdicionar = async () => {
    if (!canCreateLive) {
      toast.error('Você atingiu o limite de lives do seu plano.', { position: 'top-center' });
      return;
    }
    if (!nomeLive.trim()) {
      toast.error('O nome da live é obrigatório.', { position: 'top-center' });
      return;
    }
    if (!videoFile) {
      toast.error('O vídeo da live é obrigatório.', { position: 'top-center' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const uploadPromise = new Promise<{ liveUrl: string }>(async (resolve, reject) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Você precisa estar logado para criar uma live.', { position: 'top-center' });
          throw new Error('Usuário não autenticado');
        }

        if (!navigator.onLine) {
          throw new Error('Sem conexão com a internet');
        }

        const { guid, tusEndpoint, signature, expire, libraryId, videoUrl } = await requestTusCredentials(nomeLive);

        const upload = new tus.Upload(videoFile, {
          endpoint: tusEndpoint,
          retryDelays: [0, 1000, 3000, 5000, 10000, 20000, 30000],
          chunkSize: 100 * 1024 * 1024,
          headers: {
            AuthorizationSignature: signature,
            AuthorizationExpire: String(expire),
            LibraryId: libraryId,
            VideoId: guid,
          },
          metadata: {
            filename: videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_'),
            filetype: videoFile.type || 'video/mp4',
          },
          onError(error) {
            console.error('Erro no upload TUS:', error);
            reject(new Error(`Falha no upload: ${error.message}`));
          },
          onProgress(bytesUploaded, bytesTotal) {
            const pct = Math.round((bytesUploaded / bytesTotal) * 100);
            console.log(`Progresso: ${pct}% (${bytesUploaded}/${bytesTotal} bytes)`);
            setUploadProgress(pct);
          },
          onSuccess: async () => {
            console.log('Upload concluído com sucesso!');
            try {
              const totalSegundos = minuto
                ? parseInt(minuto) * 60 + (segundo ? parseInt(segundo) : 0)
                : null;

              const liveUrl = await insertLive(
                user.id,
                nomeLive,
                videoUrl,
                guid,
                totalSegundos
              );
              resolve({ liveUrl });
            } catch (error) {
              reject(error);
            }
          },
        });

        console.log('Iniciando upload:', {
          fileSize: (videoFile.size / (1024 * 1024)).toFixed(2),
          fileName: videoFile.name,
          fileType: videoFile.type,
          tusEndpoint,
          guid,
          videoUrl,
        });
        upload.start();
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Erro desconhecido'));
      }
    });

    toast.promise(
      uploadPromise,
      {
        loading: 'Enviando live...',
        success: ({ liveUrl }) => (
          <div>
            Live criada com sucesso!{' '}
            <a href={liveUrl} className="underline text-blue-500" target="_blank" rel="noopener noreferrer">
              Acesse aqui
            </a>
          </div>
        ),
        error: (err: Error) => err.message || 'Erro ao criar live.',
      }
    ).finally(() => {
      setIsUploading(false);
      setUploadProgress(0);
      setShowModal(false);
      setNomeLive('');
      setVideoFile(null);
      setMinuto('');
      setSegundo('');
      setLinkOferta('');
      setVisitantes('');
      fetchLives();
    });
  };

  const validateAndSetVideo = (file: File) => {
    const maxSize = 1000 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('O vídeo deve ter menos de 1 GB.', { position: 'top-center' });
      return;
    }
    if (!file.type.startsWith('video/')) {
      toast.error('Por favor, envie um arquivo de vídeo válido.', { position: 'top-center' });
      return;
    }
    setVideoFile(file);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetVideo(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetVideo(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleOpenFileDialog = () => {
    videoInputRef.current?.click();
  };

  const handleDeleteClick = (liveId: string) => {
    setLiveIdToDelete(liveId);
    setShowDeleteModal(true);
  };

  const handleDelete = async (liveId: string) => {
    try {
      const { data: live, error: fetchError } = await supabase
        .from('lives')
        .select('bunny_guid, title')
        .eq('id', liveId)
        .single();
      if (fetchError) throw new Error(`Erro ao buscar live: ${fetchError.message}`);

      if (live.bunny_guid) {
        console.log('Enviando requisição DELETE para Bunny:', { guid: live.bunny_guid, liveId, title: live.title });
        const deleteRes = await fetch('/api/upload-bunny', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guid: live.bunny_guid }),
        });

        const deleteResBody = await deleteRes.json();
        console.log('Resposta da API DELETE:', {
          status: deleteRes.status,
          ok: deleteRes.ok,
          body: deleteResBody,
        });

        if (!deleteRes.ok) {
          throw new Error(`Falha ao excluir vídeo do Bunny: ${deleteResBody.message || 'Erro desconhecido'} - Detalhes: ${deleteResBody.details || 'Nenhum detalhe fornecido'}`);
        }
      } else {
        console.warn('Nenhum bunny_guid encontrado para a live:', { liveId, title: live.title });
      }

      console.log('Excluindo live do Supabase:', { liveId, title: live.title });
      const { error } = await supabase.from('lives').delete().eq('id', liveId);
      if (error) throw new Error(`Erro ao excluir live do Supabase: ${error.message}`);

      toast.success('Live e vídeo excluídos com sucesso!', { position: 'top-center' });
      await fetchLives();
      setMenuOpen(null);
    } catch (err) {
      console.error('Erro durante a exclusão:', err);
      toast.error(`Erro ao excluir live: ${err instanceof Error ? err.message : 'Erro desconhecido'}`, {
        position: 'top-center',
      });
    }
  };

  const confirmDelete = () => {
    if (liveIdToDelete) {
      handleDelete(liveIdToDelete);
      setShowDeleteModal(false);
      setLiveIdToDelete(null);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setLiveIdToDelete(null);
  };

  const handleEdit = (live: Live) => {
    toast(`Editar live: ${live.title} (Funcionalidade a implementar)`, {
      position: 'top-center',
      style: { background: '#e0f7fa', color: '#006064', border: '1px solid #b2ebf2' },
    });
    setMenuOpen(null);
  };

  const handleLiveClick = async (live: Live) => {
    setSelectedLive(live);
    await fetchInteracoes(live.id);
  };

  const closeModal = () => {
    setSelectedLive(null);
    setTotalInteracoes(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-lato">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#F0FFF4',
            color: '#15803D',
            border: '1px solid #BBF7D0',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        }}
      />
      <div className="flex-1 p-6">
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-800">Crie Sua Live</h1>
            {isLoadingData ? (
              <button
                className="px-4 py-2 bg-gray-200 text-gray-500 font-semibold rounded-full cursor-not-allowed"
                disabled
              >
                Carregando...
              </button>
            ) : canCreateLive ? (
              <button
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors cursor-pointer"
                onClick={() => setShowModal(true)}
              >
                Adicionar Live
              </button>
            ) : (
              <button
                className="px-4 py-2 bg-gray-200 text-gray-500 font-semibold rounded-full cursor-not-allowed"
                disabled
              >
                {planType === 'basic' ? 'Limite do plano Basic atingido' : 'Limite de lives atingido'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-xs text-gray-500 mb-2">
            Plano: {planType || 'Carregando...'} · Lives usadas: {livesCount}/{maxLives || '-'}
          </div>
          {planType === 'basic' && livesCount >= maxLives && (
            <p className="text-xs text-gray-500 mb-3">
              Você atingiu o limite de 2 lives no plano Basic.{' '}
              <span className="text-green-600">Faça upgrade para o Premium</span> para criar até 5 lives.
            </p>
          )}
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Suas Lives</h2>
          {lives.length === 0 ? (
            <p className="text-gray-500">Nenhuma live encontrada.</p>
          ) : (
            <ul className="space-y-2">
              {lives.map((live) => (
                <li
                  key={live.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => handleLiveClick(live)}
                >
                  <div className="flex items-center gap-3">
                    <Image src="/play.svg" alt="Play Icon" width={60} height={60} />
                    <span className="text-gray-800">{live.title}</span>
                  </div>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setMenuOpen(menuOpen === live.id ? null : live.id)}
                      className="p-2 hover:bg-gray-200 rounded-full"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-600" />
                    </button>
                    {menuOpen === live.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                      >
                        <button
                          onClick={() => handleEdit(live)}
                          className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteClick(live.id)}
                          className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl p-6 rounded-xl shadow-2xl border border-green-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Video className="text-green-600" size={22} /> Adicionar Nova Live
            </h2>

            <label className="block mb-2 text-sm font-medium text-gray-700">Nome da Live</label>
            <input
              type="text"
              placeholder="Adicionar nome da live"
              className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              value={nomeLive}
              onChange={(e) => setNomeLive(e.target.value)}
            />

            <label className="block mb-2 text-sm font-medium text-gray-700">Vídeo da Live</label>
            <div
              ref={dropAreaRef}
              className={`w-full h-36 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer mb-4 transition-all duration-200 ${
                isDragging ? 'bg-green-50 border-green-500' : 'border-gray-300'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleOpenFileDialog}
            >
              {videoFile ? (
                <p className="text-green-600 font-medium">🎉 Vídeo selecionado: {videoFile.name}</p>
              ) : (
                <>
                  <CloudUpload className="w-8 h-8 text-green-500 mb-2" />
                  <p className="text-gray-500 text-sm text-center">
                    Arraste o vídeo aqui ou <span className="text-green-600 font-semibold">clique para enviar</span>
                  </p>
                </>
              )}
            </div>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoChange}
              ref={videoInputRef}
            />

            {isUploading && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div className="bg-green-500 h-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-center text-sm text-gray-600 mt-1">{uploadProgress}%</p>
              </div>
            )}

            <label className="block mb-2 text-sm font-medium text-gray-700">Minuto da Oferta</label>
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                placeholder="Min"
                className="w-1/2 p-3 border border-gray-300 rounded-lg"
                value={minuto}
                onChange={(e) => setMinuto(Math.max(0, Number(e.target.value)).toString())}
              />
              <input
                type="number"
                placeholder="Seg"
                className="w-1/2 p-3 border border-gray-300 rounded-lg"
                value={segundo}
                onChange={(e) => setSegundo(Math.min(60, Math.max(0, Number(e.target.value))).toString())}
              />
            </div>

            <label className="block mb-2 text-sm font-medium text-gray-700">Link da Oferta</label>
            <input
              type="url"
              className="w-full p-3 mb-4 border border-gray-300 rounded-lg"
              placeholder="https://seulinkCheckout"
              value={linkOferta}
              onChange={(e) => setLinkOferta(e.target.value)}
            />

            <label className="block mb-2 text-sm font-medium text-gray-700 flex items-center gap-1">
              Número de Visitantes
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CircleHelp className="w-4 h-4 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Indique o número de pessoas que estarão online durante a live.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <input
              type="number"
              placeholder="Quantidade de visitantes"
              className="w-full p-3 mb-6 border border-gray-300 rounded-lg"
              value={visitantes}
              onChange={(e) => setVisitantes(Math.max(0, Number(e.target.value)).toString())}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                disabled={isUploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleAdicionar}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                disabled={isUploading}
              >
                {isUploading ? 'Enviando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm p-6 rounded-xl shadow-2xl border border-red-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Você tem certeza que deseja excluir essa Live? Essa ação não pode ser desfeita.
            </h2>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                aria-label="Cancelar exclusão da live"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                aria-label="Confirmar exclusão da live"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedLive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-6 rounded-lg shadow-lg relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="mb-6">
              <Image
                src="/personagem.webp"
                alt="Personagem"
                width={200}
                height={200}
                className="mx-auto"
                quality={100}
              />
            </div>
            <div className="space-y-4">
              <p className="text-gray-800">
                <strong>Nome da Live:</strong> {selectedLive.title}
              </p>
              <p className="text-gray-800">
                <strong>URL da Oferta:</strong>{' '}
                {selectedLive.link_oferta ? (
                  <a href={selectedLive.link_oferta} className="text-[#333333]" rel="noopener noreferrer">
                    {selectedLive.link_oferta}
                  </a>
                ) : (
                  'Não fornecido'
                )}
              </p>
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-gray-800">Interações</h1>
                {totalInteracoes !== null ? (
                  <p className="text-gray-800">Número de interações dessa Live: {totalInteracoes}</p>
                ) : (
                  <p className="text-gray-800">
                    Ainda não há interações.{' '}
                    <Link href="/dashboard/criarlives/interacoes" className="underline text-blue-500 hover:text-blue-700">
                      Crie interações
                    </Link>
                  </p>
                )}
              </div>
              <div className="flex gap-4 justify-center">
                <Link href="/dashboard/criarlives/interacoes">
                  <button className="px-4 py-2 border border-green-600 text-green-600 rounded-full hover:bg-green-50">
                    Criar Interações
                  </button>
                </Link>
                <Link href={`/dashboard/criarlives/interacoes/ver_interacoes/${selectedLive.id}`}>
                  <button className="px-4 py-2 border border-green-600 text-green-600 rounded-full hover:bg-green-50">
                    Lista de Interações
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
