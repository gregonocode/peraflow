'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { IoLogoYoutube } from 'react-icons/io';
import { CopyPlus } from 'lucide-react';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { FileText, Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";

// Definir a interface para os dados da tabela lives
interface Live {
  id: string;
  title: string;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Interacoes() {
  const router = useRouter();
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLiveId, setSelectedLiveId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Verificar usuário e buscar lives do próprio usuário
  useEffect(() => {
    async function checkUserAndFetchLives() {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/login');
        return;
      }

      setLoading(true);

      const { data, error: livesError } = await supabase
        .from('lives')
        .select('id, title')
        .eq('user_id', user.id);

      if (livesError) {
        console.error('Erro ao buscar lives:', livesError);
        setLives([]);
      } else {
        setLives((data || []) as Live[]);
      }

      setLoading(false);
    }

    checkUserAndFetchLives();
  }, [router]);

  // Abrir modal e definir live_id
  const openModal = (liveId: string) => {
    setSelectedLiveId(liveId);
    setIsModalOpen(true);
  };

  // Fechar modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedLiveId(null);
    setFile(null);
    setUploadError(null);
  };

  // Lidar com upload do arquivo
  const handleFileUpload = async () => {
    if (!file || !selectedLiveId) {
      setUploadError('Por favor, selecione um arquivo.');
      toast.error('Por favor, selecione um arquivo.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('live_id', selectedLiveId);

    try {
      const uploadPromise = fetch('/api/gerartxt', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      await toast.promise(uploadPromise, {
        loading: 'Enviando arquivo...',
        success: 'Comentários adicionados com sucesso!',
        error: (err) => err.message || 'Erro ao processar o arquivo.',
      });

      const response = await uploadPromise;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar o arquivo.');
      }

      // Redirecionar para a página desejada após upload bem-sucedido
      router.push(`/dashboard/criarlives/interacoes/ver_interacoes/${selectedLiveId}`);
    } catch (error: unknown) {
      console.error('Erro ao enviar:', error);
      if (error instanceof Error) {
        setUploadError(error.message || 'Erro desconhecido.');
      } else {
        setUploadError('Erro desconhecido.');
      }
    }
  };

  // Componente Dropzone
  const DropzoneArea = ({ onFileSelected }: { onFileSelected: (file: File | null) => void }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      accept: { 'text/plain': ['.txt'] },
      onDrop: (acceptedFiles) => {
        onFileSelected(acceptedFiles[0] || null);
      },
    });

    return (
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <FileText size={32} />
          {isDragActive ? (
            <p className="text-emerald-700 font-medium">Solte o arquivo aqui...</p>
          ) : file ? (
            <p className="text-sm">
              Arquivo selecionado: <span className="font-medium">{file.name}</span>
            </p>
          ) : (
            <p className="text-sm">
              Arraste e solte um arquivo <span className="font-medium">.txt</span> ou clique para selecionar.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[80%] mx-auto bg-white p-8 rounded-xl shadow-md font-lato mt-8 space-y-8">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-[#1e1e1e]">Criar Interações</h2>
        <Button variant="destructive" className="flex items-center gap-2 cursor-pointer">
          <IoLogoYoutube className="w-6 h-6" />
          Assistir tutorial
        </Button>
      </div>

      <p className="text-gray-600">
        Aqui você pode gerenciar comentários simulados para suas lives. Escolha uma live para começar.
      </p>

      {loading ? (
        <p className="text-center text-gray-500">Carregando lives...</p>
      ) : lives.length === 0 ? (
        <p className="text-center text-gray-500">Nenhuma live encontrada.</p>
      ) : (
        <Accordion type="single" collapsible className="w-full space-y-4">
          {lives.map((live) => (
            <AccordionItem
              key={live.id}
              value={live.id}
              className="bg-gray-50 rounded-lg shadow-sm"
            >
              <AccordionTrigger className="px-4 py-3 hover:bg-gray-100 hover:no-underline focus:no-underline cursor-pointer">
                <div className="flex items-center gap-3">
                  <Image
                    src="/play.svg"
                    alt="Play Icon"
                    width={30}
                    height={30}
                    className="text-gray-700"
                  />
                  <span className="text-lg font-semibold cursor-pointer ">
                    {live.title}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-4 bg-white">
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-gray-500">
                    Adicione interações simuladas para esta live.
                  </p>
                  <div className="flex gap-4">
                    <Button
                      className="bg-[#181818] hover:bg-[#2a2a2a] text-white flex items-center gap-2 cursor-pointer"
                      onClick={() => openModal(live.id)}
                    >
                      <CopyPlus className="w-5 h-5" />
                      Adicionar .Txt
                    </Button>
                    <Link href={`/dashboard/criarlives/interacoes/criar_interacoes/${live.id}`}>
                      <Button
                        variant="outline"
                        className="border-[#181818] text-[#181818] hover:bg-gray-100 cursor-pointer"
                      >
                        Add Manualmente
                      </Button>
                    </Link>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    
      {/* Modal para upload de arquivo */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md border border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-emerald-700 flex items-center gap-2">
                <FileText size={20} /> Adicionar Comentários
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              Selecione ou arraste um arquivo <code>.txt</code> com o formato:
              <br />
              <span className="text-gray-500">HH:MM:SS - Nome: Comentário</span>
            </p>

            {/* Área de dropzone */}
            <DropzoneArea onFileSelected={setFile} />

            {uploadError && (
              <p className="text-red-500 mt-2 text-sm">{uploadError}</p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={closeModal}
                className="border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 cursor-pointer"
                onClick={handleFileUpload}
              >
                <Upload size={16} /> Enviar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
