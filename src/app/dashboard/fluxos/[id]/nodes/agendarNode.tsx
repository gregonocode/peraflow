'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from 'reactflow';
import { CalendarClock, Pencil, Check } from 'lucide-react';
import dynamic from 'next/dynamic';
import emojiData from '@emoji-mart/data';
import { FiSmile } from 'react-icons/fi';

const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false });

type AgendarNodeData = {
  /** Persistir no banco (em fluxo_nos.conteudo) */
  text?: string;
  time?: string; // ex: "14:30"
  collapsed?: boolean;

  /** Compatibilidade com versão antiga, se você quiser reaproveitar label */
  label?: string;

  /** Callbacks injetados pelo page.tsx (não vão pro banco) */
  onChangeText?: (id: string, newText: string) => void;
  onChangeTime?: (id: string, newTime: string) => void;
  onToggleCollapsed?: (id: string, collapsed: boolean) => void;
  onSave?: (id: string) => void;
};

export default function AgendarNode({ id, data }: NodeProps<AgendarNodeData>) {
  const { setNodes } = useReactFlow();

  // Fallback de texto (mesma lógica do TextNode)
  const initialText = useMemo(() => {
    const t = typeof data.text === 'string' ? data.text.trim() : '';
    const l = typeof data.label === 'string' ? data.label.trim() : '';
    return t !== '' ? t : l;
  }, [data.text, data.label]);

  const [draft, setDraft] = useState(initialText);
  const [time, setTime] = useState<string>(data.time ?? '');
  const [collapsed, setCollapsed] = useState<boolean>(!!data.collapsed);

  // Emoji picker
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Fecha picker ao clicar fora
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
  useEffect(() => setDraft(initialText), [initialText]);
  useEffect(() => setCollapsed(!!data.collapsed), [data.collapsed]);
  useEffect(() => {
    if (typeof data.time === 'string') {
      setTime(data.time);
    }
  }, [data.time]);

  // Atualiza o estado dos nodes no ReactFlow (NÃO salva no banco!)
  const fallbackApply = useCallback(
    (updates: Partial<AgendarNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n))
      );
    },
    [id, setNodes]
  );

  // Enquanto digita, já espelha no node.data.text
  const handleChangeText = (value: string) => {
    setDraft(value);
    if (data.onChangeText) data.onChangeText(id, value);
    else fallbackApply({ text: value, label: value });
  };

  const handleChangeTime = (value: string) => {
    setTime(value);
    if (data.onChangeTime) data.onChangeTime(id, value);
    else fallbackApply({ time: value });
  };

  function insertAtCursor(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      handleChangeText((draft ?? '') + emoji);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    handleChangeText(next);
    // reposiciona o cursor após o emoji
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  type EmojiWithNative = { native?: string };

  function handleEmojiSelect(emoji: EmojiWithNative) {
    const ch = typeof emoji?.native === 'string' ? emoji.native : '';
    if (ch) insertAtCursor(ch);
    setShowEmoji(false);
  }

  function handleOk() {
    const value = draft.trim();
    const scheduledTime = time;

    if (data.onChangeText) data.onChangeText(id, value);
    else fallbackApply({ text: value, label: value });

    if (data.onChangeTime) data.onChangeTime(id, scheduledTime);
    else fallbackApply({ time: scheduledTime });

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

  return (
    <div className="w-[320px] rounded-2xl border border-emerald-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">
            Agendar Mensagem
          </span>
        </div>

        {collapsed ? (
          <button
            onClick={handleEdit}
            className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
        ) : null}
      </div>

      {/* Corpo */}
      <div className="p-3 relative space-y-2">
        {collapsed ? (
          <>
            <p className="whitespace-pre-wrap text-sm text-zinc-800">
              {draft || '—'}
            </p>

            <p className="text-xs text-emerald-700 font-medium">
              Horário agendado:{' '}
              <span className="font-semibold">
                {time ? time : 'não definido'}
              </span>
            </p>
          </>
        ) : (
          <div className="space-y-3">
            {/* Mensagem */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-emerald-800">
                Mensagem a ser enviada
              </label>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => handleChangeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleOk();
                  }
                }}
                placeholder="Digite a mensagem que será enviada no horário escolhido..."
                className="nodrag nopan w-full min-h-[90px] rounded-xl border border-emerald-300 p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300"
                rows={4}
              />
            </div>

            {/* Horário */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-emerald-800">
                Horário de envio
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => handleChangeTime(e.target.value)}
                className="nodrag nopan w-[140px] rounded-lg border border-emerald-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <p className="text-[11px] text-emerald-700/80">
                O horário informado é considerado em <span className="font-semibold">
                  horário de Brasília (GMT-3)
                </span>.
              </p>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-between gap-2">
              {/* Botão Emoji */}
              <button
                type="button"
                onClick={() => setShowEmoji((s) => !s)}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50"
                title="Inserir emoji"
              >
                <FiSmile className="h-4 w-4" />
                Emojis
              </button>

              {/* Botão OK */}
              <button
                onClick={handleOk}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 active:scale-[0.98]"
                title="Salvar e fechar"
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
                <Picker
                  data={emojiData}
                  onEmojiSelect={handleEmojiSelect}
                  theme="light"
                />
              </div>
            ) : null}
          </div>
        )}

        <span className="mt-1 block text-[11px] text-emerald-600/80">
          Agenda o envio de uma mensagem em um horário específico.
        </span>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 bg-emerald-600 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 bg-emerald-600 rounded-full"
      />
    </div>
  );
}
