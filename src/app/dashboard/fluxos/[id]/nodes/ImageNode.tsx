'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Image as LucideImage, UploadCloud, X, RefreshCw } from 'lucide-react';

type ImagePayloadBase64 = {
  source: 'base64';
  data: string;        // dataURL base64
  mime?: string;
  name?: string;
  size?: number;       // bytes
  width?: number;      // px
  height?: number;     // px
};

type ImageNodeData = {
  /** (Visual) título curto do nó - não será mais usado como legenda */
  label?: string;

  /** Modo 1: payload temporário (base64) enquanto edita */
  image?: ImagePayloadBase64;

  /** Modo 2: conteúdo persistido no DB (normalizado pelo backend) */
  url?: string;             // URL pública (Supabase Storage)
  storage_path?: string;    // path interno no Storage (opcional)
  mime?: string;
  name?: string;
  size?: number;
  width?: number;
  height?: number;

  /** Legenda OPCIONAL (vai pro banco e pode ser usada no envio) */
  text?: string;            // << usamos "text" para a caption

  /** Estado visual */
  collapsed?: boolean;
};

const MAX_SIZE = 16 * 1024 * 1024; // 16 MB

export default function ImageNode({ id, data }: { id: string; data: ImageNodeData }) {
  const { setNodes } = useReactFlow();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Título visual fixo do nó (não persiste)
  const nodeTitle = 'Imagem';

  const initialCollapsed = useMemo(
    () => (typeof data.collapsed === 'boolean' ? data.collapsed : true),
    [data.collapsed]
  );

  // Legenda opcional (persistida em data.text)
  const initialCaption = useMemo(
    () => (typeof data.text === 'string' ? data.text : ''),
    [data.text]
  );

  // Estados locais sincronizados
  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed);
  const [caption, setCaption] = useState<string>(initialCaption);
  const [imageB64, setImageB64] = useState<ImagePayloadBase64 | undefined>(data.image);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reidratação vinda do banco / alterações externas
  useEffect(() => setCollapsed(initialCollapsed), [initialCollapsed]);
  useEffect(() => setCaption(initialCaption), [initialCaption]);
  useEffect(() => setImageB64(data.image), [data.image]);

  // Fonte da imagem para o <img>: prioriza o que o usuário acabou de escolher (base64), senão a url persistida
  const imgSrc = imageB64?.data ?? data.url ?? '';

  // Metadados exibidos (prioriza os do base64, senão os persistidos)
  const meta = {
    name: imageB64?.name ?? data.name,
    mime: imageB64?.mime ?? data.mime,
    size: imageB64?.size ?? data.size,
    width: imageB64?.width ?? data.width,
    height: imageB64?.height ?? data.height,
  };

  const mutateNode = useCallback(
    (updates: Partial<ImageNodeData>) => {
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

  // Atualiza SOMENTE a legenda opcional (não mexe mais em label)
  const handleCaptionChange = (value: string) => {
    setCaption(value);
    // salva em "text" (campo que o runner já entende como caption)
    mutateNode({ text: value || undefined });
  };

  async function handleFile(file: File) {
    setError(null);

    if (file.size > MAX_SIZE) {
      setError('Arquivo muito grande (máx. 16 MB).');
      return;
    }

    const okTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const extOk = ['png', 'jpg', 'jpeg', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!okTypes.includes(file.type) && !extOk.includes(ext ?? '')) {
      setError('Formato não suportado. Use .png, .jpg/.jpeg ou .webp');
      return;
    }

    const base64 = await fileToDataURL(file);

    // medir dimensões do base64
    const { width, height } = await getImageDimensions(base64);

    const payload: ImagePayloadBase64 = {
      source: 'base64',
      data: base64,
      mime: file.type || guessMimeFromExt(ext),
      name: file.name,
      size: file.size,
      width,
      height,
    };

    // Atualiza preview local e indica ao backend que deve subir/substituir
    setImageB64(payload);
    mutateNode({
      image: payload,
      url: undefined,
      storage_path: undefined,
      mime: payload.mime,
      name: payload.name,
      size: payload.size,
      width,
      height,
      // IMPORTANTÍSSIMO: não salvar label automático aqui
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

  const triggerPick = () => fileInputRef.current?.click();

  const removeImage = () => {
    setImageB64(undefined);
    setError(null);
    // Limpa tanto o payload local quanto o persistido
    mutateNode({
      image: undefined,
      url: undefined,
      storage_path: undefined,
      mime: undefined,
      name: undefined,
      size: undefined,
      width: undefined,
      height: undefined,
      // Mantém a legenda que o usuário escreveu (se quiser limpar: setCaption(''); mutateNode({ text: undefined }))
    });
  };

  // Ao carregar a imagem (seja base64 ou url persistida), aproveita para salvar dimensões no data
  const onImageLoad = () => {
    if (!imgRef.current || !imgSrc) return;
    const w = imgRef.current.naturalWidth || undefined;
    const h = imgRef.current.naturalHeight || undefined;
    if (!w || !h) return;

    if (imageB64) {
      // Atualiza o payload local e persiste as dimensões
      if (imageB64.width !== w || imageB64.height !== h) {
        const payload = { ...imageB64, width: w, height: h };
        setImageB64(payload);
        mutateNode({ image: payload, width: w, height: h });
      }
    } else {
      // Persistido via URL: grava dimensões em data
      if (data.width !== w || data.height !== h) {
        mutateNode({ width: w, height: h });
      }
    }
  };

  return (
    <div className="bg-white border-2 border-yellow-600 rounded-2xl p-3 shadow-sm min-w-[280px] w-[360px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LucideImage className="w-5 h-5 text-yellow-700" />
          <div className="font-semibold text-yellow-800 text-sm">{nodeTitle}</div>
        </div>
        <button
          onClick={handleToggleCollapsed}
          className="text-xs text-yellow-700 hover:text-yellow-900"
        >
          {collapsed ? 'Editar' : 'OK'}
        </button>
      </div>

      {/* Body */}
      <div className="mt-3 space-y-3">
        {collapsed ? (
          <div className="space-y-2">
            {imgSrc ? (
              <>
                <div className="rounded-lg border border-yellow-200 p-2">
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt={meta.name ?? 'imagem'}
                    className="w-full h-auto rounded-md object-contain"
                    onLoad={onImageLoad}
                  />
                  <div className="mt-1 text-[11px] text-yellow-800/80 flex flex-wrap gap-2">
                    <span>{meta.name ?? 'arquivo'}</span>
                    <span>• {meta.mime ?? 'image/*'}</span>
                    {typeof meta.size === 'number' ? (
                      <span>• {(meta.size / (1024 * 1024)).toFixed(1)} MB</span>
                    ) : null}
                    {meta.width && meta.height ? (
                      <span>• {meta.width}×{meta.height}px</span>
                    ) : null}
                  </div>
                  {caption?.trim() ? (
                    <div className="mt-2 text-[12px] text-yellow-900/90">
                      <span className="opacity-70">Legenda:</span> {caption}
                    </div>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={triggerPick}
                    className="inline-flex items-center gap-2 rounded-lg border border-yellow-300 px-3 py-1.5 text-xs text-yellow-800 hover:bg-yellow-50"
                    title="Trocar imagem"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Trocar
                  </button>
                  <button
                    onClick={removeImage}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                    title="Remover imagem"
                  >
                    <X className="w-4 h-4" />
                    Remover
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-yellow-700/70">Nenhuma imagem selecionada.</p>
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
                dragOver ? 'border-yellow-700 bg-yellow-50' : 'border-yellow-300 hover:bg-yellow-50',
              ].join(' ')}
              title="Clique para selecionar uma imagem ou arraste um arquivo"
            >
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className="w-8 h-8 text-yellow-600" />
                <div className="text-sm text-yellow-800">
                  Clique para enviar <span className="font-semibold">imagem</span>
                </div>
                <div className="text-[11px] text-yellow-700/70">
                  Formatos: .png, .jpg/.jpeg, .webp — até 16 MB
                </div>
              </div>
            </div>

            {/* Input oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              onChange={onFileInput}
              className="hidden"
            />

            {/* Preview durante edição */}
            {imgSrc ? (
              <div className="rounded-lg border border-yellow-200 p-2">
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt={meta.name ?? 'imagem'}
                  className="w-full h-auto rounded-md object-contain"
                  onLoad={onImageLoad}
                />
              </div>
            ) : null}

            {/* Campo de legenda opcional */}
            <div className="space-y-1">
              <label className="text-[11px] text-yellow-800/80">Legenda (opcional)</label>
              <input
                className="w-full rounded-lg border border-yellow-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                value={caption}
                onChange={(e) => handleCaptionChange(e.target.value)}
                placeholder="Digite um texto curto para enviar junto com a imagem (opcional)"
                maxLength={2000}
              />
              <p className="text-[10px] text-yellow-700/60">
                Se deixar em branco, enviaremos somente a imagem.
              </p>
            </div>

            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </>
        )}

        <span className="block text-[11px] text-yellow-700/80">Mensagem de Imagem</span>
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-yellow-600 rounded-full" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-yellow-600 rounded-full" />
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
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return undefined;
  }
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = dataUrl;
  });
}
