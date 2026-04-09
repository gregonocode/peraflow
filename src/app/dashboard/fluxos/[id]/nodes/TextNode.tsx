'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from 'reactflow';
import { MessageSquare, Pencil, Check } from 'lucide-react';
import dynamic from 'next/dynamic';
import emojiData from '@emoji-mart/data';
import { FiSmile } from 'react-icons/fi';

const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false });

type TextNodeData = {
  /** Persistir no banco (em fluxo_nos.conteudo) */
  text?: string;
  collapsed?: boolean;

  /** Compatibilidade com sua versão antiga */
  label?: string;

  /** Callbacks injetados pelo page.tsx (não vão pro banco) */
  onChangeText?: (id: string, newText: string) => void;
  onToggleCollapsed?: (id: string, collapsed: boolean) => void;
  onSave?: (id: string) => void;
};

export default function TextNode({ id, data }: NodeProps<TextNodeData>) {
  const { setNodes } = useReactFlow();

  // Fallback correto: se text vier vazio (""), usa label.
  const initialText = useMemo(() => {
    const t = typeof data.text === 'string' ? data.text.trim() : '';
    const l = typeof data.label === 'string' ? data.label.trim() : '';
    return t !== '' ? t : l;
  }, [data.text, data.label]);

  const [draft, setDraft] = useState(initialText);
  const [collapsed, setCollapsed] = useState<boolean>(!!data.collapsed);

  // Emoji picker
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
  useEffect(() => setDraft(initialText), [initialText]);
  useEffect(() => setCollapsed(!!data.collapsed), [data.collapsed]);

  // Atualiza o estado dos nodes no ReactFlow (NÃO salva no banco!)
  const fallbackApply = useCallback(
    (updates: Partial<TextNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n))
      );
    },
    [id, setNodes]
  );

  // Enquanto digita, já espelha no node.data.text (assim o botão Salvar pega o valor)
  const handleChange = (value: string) => {
    setDraft(value);
    if (data.onChangeText) data.onChangeText(id, value);
    else fallbackApply({ text: value, label: value }); // mantém label em sincronia para fallback visual
  };

  function insertAtCursor(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      handleChange((draft ?? '') + emoji);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    handleChange(next);
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

    if (data.onChangeText) data.onChangeText(id, value);
    else fallbackApply({ text: value, label: value });

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
    <div className="w-[320px] rounded-2xl border border-blue-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">Mensagem</span>
        </div>

        {collapsed ? (
          <button
            onClick={handleEdit}
            className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900"
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
          <p className="whitespace-pre-wrap text-sm text-zinc-800">
            {draft || '—'}
          </p>
        ) : (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleOk();
                }
              }}
              placeholder="Digite sua mensagem..."
              className="nodrag nopan w-full min-h-[100px] rounded-xl border border-blue-300 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
              rows={4}
            />

            <div className="flex items-center justify-end gap-2">
              {/* Botão Emoji */}
              <button
                type="button"
                onClick={() => setShowEmoji((s) => !s)}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-300 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50"
                title="Inserir emoji"
              >
                <FiSmile className="h-4 w-4" />
                Emojis
              </button>

              {/* Botão OK */}
              <button
                onClick={handleOk}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 active:scale-[0.98]"
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
                <Picker data={emojiData} onEmojiSelect={handleEmojiSelect} theme="light" />
              </div>
            ) : null}
          </div>
        )}

        <span className="mt-2 block text-[11px] text-blue-600/80">Mensagem de Texto</span>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 bg-blue-600 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 bg-blue-600 rounded-full"
      />
    </div>
  );
}
