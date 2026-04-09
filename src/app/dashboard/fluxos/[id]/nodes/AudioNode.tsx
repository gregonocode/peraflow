'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Mic, UploadCloud, X, RefreshCw } from 'lucide-react';

type AudioPayloadBase64 = {
  source: 'base64';
  audio: string;      // dataURL base64
  mime?: string;
  name?: string;
  size?: number;      // bytes
  duration?: number;  // segundos
};

type AudioNodeData = {
  /** Título curto do nó */
  label?: string;

  /** Modo 1: payload temporário (base64) enquanto edita */
  audio?: AudioPayloadBase64;

  /** Modo 2: conteúdo persistido no DB (normalizado pelo backend) */
  url?: string;            // URL pública do Supabase Storage
  storage_path?: string;   // path interno do Storage (opcional, preenchido no backend)
  mime?: string;
  name?: string;
  size?: number;
  duration?: number;

  /** Estado visual */
  collapsed?: boolean;
};

const MAX_SIZE = 16 * 1024 * 1024; // 16 MB (limite prático)

export default function AudioNode({ id, data }: { id: string; data: AudioNodeData }) {
  const { setNodes } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const initialLabel = useMemo(
    () => (data.label && data.label.trim() !== '' ? data.label : 'Áudio'),
    [data.label]
  );
  const initialCollapsed = useMemo(
    () => (typeof data.collapsed === 'boolean' ? data.collapsed : true),
    [data.collapsed]
  );

  // Estados locais, sincronizados com "data"
  const [label, setLabel] = useState<string>(initialLabel);
  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed);
  const [audioB64, setAudioB64] = useState<AudioPayloadBase64 | undefined>(data.audio);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quando reidratar do banco / ou data mudar
  useEffect(() => setLabel(initialLabel), [initialLabel]);
  useEffect(() => setCollapsed(initialCollapsed), [initialCollapsed]);
  useEffect(() => setAudioB64(data.audio), [data.audio]);

  // Fonte para o player (prioriza o que o usuário acabou de escolher)
  const playerSrc = audioB64?.audio ?? data.url ?? '';

  // Metadados mostrados (preferimos os do base64 se existirem)
  const meta = {
    name: audioB64?.name ?? data.name,
    mime: audioB64?.mime ?? data.mime,
    size: audioB64?.size ?? data.size,
    duration: audioB64?.duration ?? data.duration,
  };

  const mutateNode = useCallback(
    (updates: Partial<AudioNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n))
      );
    },
    [id, setNodes]
  );

  const handleToggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    mutateNode({ collapsed: next });
  };

  const handleLabelChange = (value: string) => {
    setLabel(value);
    mutateNode({ label: value });
  };

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_SIZE) {
      setError('Arquivo muito grande (máx. 16 MB).');
      return;
    }
    // formatos com boa compatibilidade: .ogg (Opus), .m4a/.mp4
    const acceptTypes = [
      'audio/ogg',
      'audio/opus',
      'audio/mp4',
      'audio/m4a',
    ];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const okByExt = ['ogg', 'opus', 'm4a', 'mp4'].includes(ext ?? '');
    if (!acceptTypes.includes(file.type) && !okByExt) {
      setError('Formato não suportado. Use .ogg/.opus/.m4a/.mp4');
      return;
    }

    const base64 = await fileToDataURL(file);
    const payload: AudioPayloadBase64 = {
      source: 'base64',
      audio: base64,
      mime: file.type || guessMimeFromExt(ext),
      name: file.name,
      size: file.size,
    };

    // Atualiza preview local e o data para salvar depois
    setAudioB64(payload);
    // ⚠️ quando o usuário seleciona um novo arquivo, limpamos a url persistida
    // para indicar ao backend que deve subir este base64 e substituir
    mutateNode({
      audio: payload,
      url: undefined,
      storage_path: undefined,
      mime: payload.mime,
      name: payload.name,
      size: payload.size,
      // duration será preenchida ao carregar o metadata
    });
  }

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const removeAudio = () => {
    setAudioB64(undefined);
    setError(null);
    // Removemos tanto o payload local quanto o persistido do data;
    // o backend, no save, vai detectar remoção e limpar no storage.
    mutateNode({
      audio: undefined,
      url: undefined,
      storage_path: undefined,
      mime: undefined,
      name: undefined,
      size: undefined,
      duration: undefined,
    });
  };

  const triggerPick = () => fileInputRef.current?.click();

  const onLoadedMetadata = () => {
    if (!audioRef.current) return;
    if (!playerSrc) return;

    const dur = Math.round(audioRef.current.duration || 0);
    if (!dur) return;

    // Se estamos no modo base64, atualiza o payload local
    if (audioB64 && dur !== audioB64.duration) {
      const payload = { ...audioB64, duration: dur };
      setAudioB64(payload);
      mutateNode({ audio: payload, duration: dur });
      return;
    }

    // Se estamos tocando a URL persistida do DB, gravar duration no data
    if (!audioB64 && dur !== data.duration) {
      mutateNode({ duration: dur });
    }
  };

  return (
    <div className="bg-white border-2 border-purple-600 rounded-2xl p-3 shadow-sm min-w-[280px] w-[360px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-purple-700" />
          <input
            className="bg-transparent font-semibold text-purple-800 text-sm outline-none w-[220px]"
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
          />
        </div>
        <button
          onClick={handleToggleCollapsed}
          className="text-xs text-purple-700 hover:text-purple-900"
        >
          {collapsed ? 'Editar' : 'OK'}
        </button>
      </div>

      {/* Body */}
      <div className="mt-3 space-y-3">
        {collapsed ? (
          <div className="space-y-2">
            {playerSrc ? (
              <>
                <div className="rounded-lg border border-purple-200 p-2">
                  <audio
                    ref={audioRef}
                    controls
                    src={playerSrc}
                    onLoadedMetadata={onLoadedMetadata}
                    className="w-full"
                  />
                  <div className="mt-1 text-[11px] text-purple-700/80 flex items-center gap-2 flex-wrap">
                    <span>{meta.name ?? 'arquivo'}</span>
                    <span>• {meta.mime ?? 'audio/*'}</span>
                    {typeof meta.size === 'number' ? (
                      <span>• {(meta.size / (1024 * 1024)).toFixed(1)} MB</span>
                    ) : null}
                    {meta.duration ? <span>• {meta.duration}s</span> : null}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={triggerPick}
                    className="inline-flex items-center gap-2 rounded-lg border border-purple-300 px-3 py-1.5 text-xs text-purple-800 hover:bg-purple-50"
                    title="Trocar áudio"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Trocar
                  </button>
                  <button
                    onClick={removeAudio}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                    title="Remover áudio"
                  >
                    <X className="w-4 h-4" />
                    Remover
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-purple-700/70">Nenhum áudio selecionado.</p>
            )}
          </div>
        ) : (
          <>
            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={triggerPick}
              className={[
                'nodrag nopan cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition',
                dragOver ? 'border-purple-700 bg-purple-50' : 'border-purple-300 hover:bg-purple-50',
              ].join(' ')}
              title="Clique para selecionar um áudio ou arraste um arquivo"
            >
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className="w-8 h-8 text-purple-600" />
                <div className="text-sm text-purple-800">
                  Clique para enviar <span className="font-semibold">áudio</span>
                </div>
                <div className="text-[11px] text-purple-700/70">
                  Formatos: .ogg (Opus), .m4a, .mp4 — até 16 MB
                </div>
              </div>
            </div>

            {/* Input oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".ogg,.opus,.m4a,.mp4,audio/ogg,audio/opus,audio/mp4,audio/m4a"
              onChange={onFileInput}
              className="hidden"
            />

            {/* Preview durante edição */}
            {playerSrc ? (
              <div className="rounded-lg border border-purple-200 p-2">
                <audio
                  ref={audioRef}
                  controls
                  src={playerSrc}
                  onLoadedMetadata={onLoadedMetadata}
                  className="w-full"
                />
              </div>
            ) : null}

            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </>
        )}

        <span className="block text-[11px] text-purple-600/80">Mensagem de Áudio</span>
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-600 rounded-full" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-600 rounded-full" />
    </div>
  );
}

/* Utils */

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function guessMimeFromExt(ext?: string): string | undefined {
  switch (ext) {
    case 'ogg':
    case 'opus':
      return 'audio/ogg';
    case 'm4a':
    case 'mp4':
      return 'audio/mp4';
    default:
      return undefined;
  }
}
