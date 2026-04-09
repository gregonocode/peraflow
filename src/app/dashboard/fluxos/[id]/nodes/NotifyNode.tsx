'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from 'reactflow';
import { Bell, Pencil, Check } from 'lucide-react';
import dynamic from 'next/dynamic';
import emojiData from '@emoji-mart/data';
import { FiSmile } from 'react-icons/fi';

const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false });

type NotifyNodeData = {
  /** Persistir no banco (em fluxo_nos.conteudo - jsonb) */
  nome?: string;      // Nome da notificação (rótulo interno)
  numero?: string;    // Número E.164. Ex.: 5593991512921
  mensagem?: string;  // Mensagem a enviar
  collapsed?: boolean;

  /** Compat com versões antigas */
  label?: string;

  /** Callbacks injetados pelo page.tsx (não vão pro banco) */
  onChangeNome?: (id: string, v: string) => void;
  onChangeNumero?: (id: string, v: string) => void;
  onChangeMensagem?: (id: string, v: string) => void;
  onToggleCollapsed?: (id: string, collapsed: boolean) => void;
  onSave?: (id: string) => void;
};

export default function NotifyNode({ id, data }: NodeProps<NotifyNodeData>) {
  const { setNodes } = useReactFlow();

  // Fallbacks iniciais
  const initialNome = useMemo(() => (typeof data.nome === 'string' ? data.nome.trim() : ''), [data.nome]);
  const initialNumero = useMemo(() => (typeof data.numero === 'string' ? data.numero.trim() : ''), [data.numero]);
  const initialMensagem = useMemo(() => {
    const m = typeof data.mensagem === 'string' ? data.mensagem.trim() : '';
    const l = typeof data.label === 'string' ? data.label.trim() : ''; // se vier legado
    return m !== '' ? m : l;
  }, [data.mensagem, data.label]);

  const [nome, setNome] = useState(initialNome);
  const [numero, setNumero] = useState(initialNumero);
  const [mensagem, setMensagem] = useState(initialMensagem);
  const [collapsed, setCollapsed] = useState<boolean>(!!data.collapsed);

  // Emoji picker (para a mensagem)
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Fechar picker ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!showEmoji) return;
      const target = e.target as Node;
      if (
        pickerRef.current &&
        !pickerRef.current.contains(target) &&
        textareaRef.current &&
        !textareaRef.current.contains(target)
      ) {
        setShowEmoji(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showEmoji]);

  // Sincroniza quando vem atualização externa (ex.: recarregar do banco)
  useEffect(() => setNome(initialNome), [initialNome]);
  useEffect(() => setNumero(initialNumero), [initialNumero]);
  useEffect(() => setMensagem(initialMensagem), [initialMensagem]);
  useEffect(() => setCollapsed(!!data.collapsed), [data.collapsed]);

  // Atualiza o estado dos nodes no ReactFlow (NÃO salva no banco!)
  const fallbackApply = useCallback(
    (updates: Partial<NotifyNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n))
      );
    },
    [id, setNodes]
  );

  // Normaliza número (mantém só dígitos)
  const onlyDigits = (v: string) => v.replace(/[^\d]/g, '');

  // Handlers de mudança (espelham no node.data.* pra ação de salvar puxar)
  const handleChangeNome = (v: string) => {
    setNome(v);
    if (data.onChangeNome) data.onChangeNome(id, v);
    else fallbackApply({ nome: v });
  };

  const handleChangeNumero = (v: string) => {
    const digits = onlyDigits(v);
    setNumero(digits);
    if (data.onChangeNumero) data.onChangeNumero(id, digits);
    else fallbackApply({ numero: digits });
  };

  const handleChangeMensagem = (v: string) => {
    setMensagem(v);
    if (data.onChangeMensagem) data.onChangeMensagem(id, v);
    else fallbackApply({ mensagem: v, label: v }); // mantém label em sincronia como fallback
  };

  // Emojis
  type EmojiWithNative = { native?: string };
  function insertAtCursor(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      handleChangeMensagem((mensagem ?? '') + emoji);
      return;
    }
    const start = el.selectionStart ?? mensagem.length;
    const end = el.selectionEnd ?? mensagem.length;
    const next = mensagem.slice(0, start) + emoji + mensagem.slice(end);
    handleChangeMensagem(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }
  function handleEmojiSelect(emoji: EmojiWithNative) {
    const ch = typeof emoji?.native === 'string' ? emoji.native : '';
    if (ch) insertAtCursor(ch);
    setShowEmoji(false);
  }

  function handleOk() {
    const nomeTrim = nome.trim();
    const numeroDigits = onlyDigits(numero);
    const mensagemTrim = mensagem.trim();

    if (data.onChangeNome) data.onChangeNome(id, nomeTrim);
    else fallbackApply({ nome: nomeTrim });

    if (data.onChangeNumero) data.onChangeNumero(id, numeroDigits);
    else fallbackApply({ numero: numeroDigits });

    if (data.onChangeMensagem) data.onChangeMensagem(id, mensagemTrim);
    else fallbackApply({ mensagem: mensagemTrim, label: mensagemTrim });

    setCollapsed(true);
    if (data.onToggleCollapsed) data.onToggleCollapsed(id, true);
    else fallbackApply({ collapsed: true });

    data.onSave?.(id);
  }

  function handleEdit() {
    setCollapsed(false);
    if (data.onToggleCollapsed) data.onToggleCollapsed(id, false);
    else fallbackApply({ collapsed: false });
  }

  // Validações simples
  const numeroOk = numero.length >= 8; // bem permissivo; seu worker pode validar E.164 certinho
  const canSave = (mensagem?.trim()?.length ?? 0) > 0 && numeroOk;

  return (
    <div className="w-[340px] rounded-2xl border border-green-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-green-100">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-green-700" />
          <span className="text-sm font-semibold text-green-800">Notificação</span>
        </div>

        {collapsed ? (
          <button
            onClick={handleEdit}
            className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
        ) : null}
      </div>

      {/* Corpo */}
      <div className="p-3 relative">
        {collapsed ? (
          <div className="space-y-1 text-sm text-zinc-800">
            <div><span className="text-zinc-500">Nome:</span> {nome || '—'}</div>
            <div><span className="text-zinc-500">Número:</span> {numero || '—'}</div>
            <div className="pt-1">
              <span className="text-zinc-500">Mensagem:</span>
              <p className="whitespace-pre-wrap mt-0.5">{mensagem || '—'}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Nome */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-600">Nome da notificação</label>
              <input
                value={nome}
                onChange={(e) => handleChangeNome(e.target.value)}
                placeholder="Ex.: Lead no fim do funil"
                className="nodrag nopan w-full rounded-xl border border-green-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>

            {/* Número */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-600">Número (E.164)</label>
              <input
                value={numero}
                onChange={(e) => handleChangeNumero(e.target.value)}
                placeholder="Ex.: 5511999999999"
                className="nodrag nopan w-full rounded-xl border border-green-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-300"
                inputMode="numeric"
                pattern="[0-9]*"
              />
              <p className="text-[11px] text-zinc-500">
                Dica: use só dígitos, com DDI/DDD. Ex.: <code>55</code> + <code>DDD</code> + número.
              </p>
            </div>

            {/* Mensagem */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-600">Mensagem</label>
              <textarea
                ref={textareaRef}
                value={mensagem}
                onChange={(e) => handleChangeMensagem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    if (canSave) handleOk();
                  }
                }}
                placeholder="Ex.: Lead chegou no final do funil."
                className="nodrag nopan w-full min-h-[100px] rounded-xl border border-green-300 p-2 text-sm outline-none focus:ring-2 focus:ring-green-300"
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              {/* Botão Emoji */}
              <button
                type="button"
                onClick={() => setShowEmoji((s) => !s)}
                className="inline-flex items-center gap-2 rounded-lg border border-green-300 px-3 py-1.5 text-xs text-green-700 hover:bg-green-50"
                title="Inserir emoji"
              >
                <FiSmile className="h-4 w-4" />
                Emojis
              </button>

              {/* Botão OK */}
              <button
                onClick={handleOk}
                disabled={!canSave}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-white active:scale-[0.98] ${
                  canSave ? 'bg-green-600 hover:bg-green-700' : 'bg-green-300 cursor-not-allowed'
                }`}
                title={canSave ? 'Salvar e fechar' : 'Preencha número e mensagem'}
              >
                <Check className="h-4 w-4" />
                OK
              </button>
            </div>

            {/* Popover de Emojis */}
            {showEmoji ? (
              <div
                ref={pickerRef}
                className="absolute right-3 mt-1 z-50 shadow-lg"
              >
                <Picker data={emojiData} onEmojiSelect={handleEmojiSelect} theme="light" />
              </div>
            ) : null}
          </div>
        )}

        <span className="mt-2 block text-[11px] text-green-600/80">Mensagem de Notificação</span>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 bg-green-600 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 bg-green-600 rounded-full"
      />
    </div>
  );
}
