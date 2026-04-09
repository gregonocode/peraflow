'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from 'reactflow';
import { GitMerge, Pencil, Check } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type FlowLite = { id: string; nome: string };

type NextFlowNodeData = {
  /** Persistir no banco (em fluxo_nos.conteudo) */
  targetFluxoId?: string;
  collapsed?: boolean;

  /** Compat para versões antigas (se quiser exibir algum rótulo) */
  label?: string;

  /** Callbacks injetados pelo page.tsx (não vão pro banco) */
  onChangeTargetFlow?: (id: string, fluxoId: string) => void;
  onToggleCollapsed?: (id: string, collapsed: boolean) => void;
  onSave?: (id: string) => void;
};

export default function NextFlowNode({ id, data }: NodeProps<NextFlowNodeData>) {
  const { setNodes } = useReactFlow();

  const [flows, setFlows] = useState<FlowLite[]>([]);
  const [loading, setLoading] = useState(true);

  // controla o selecionado localmente (draft), como no TextNode
  const initialSelected = useMemo(() => data.targetFluxoId ?? '', [data.targetFluxoId]);
  const [selected, setSelected] = useState<string>(initialSelected);
  const [collapsed, setCollapsed] = useState<boolean>(!!data.collapsed);

  // Quando o React Flow atualizar data externamente (ex.: recarregou do banco)
  useEffect(() => setSelected(initialSelected), [initialSelected]);
  useEffect(() => setCollapsed(!!data.collapsed), [data.collapsed]);

  // Carrega fluxos do Supabase
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sb = supabaseBrowser;
        // ajuste o select/order conforme suas colunas (created_at é comum)
        const { data: rows, error } = await sb
          .from('fluxos')
          .select('id, nome')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!mounted) return;
        setFlows((rows || []) as FlowLite[]);
      } catch (err) {
        console.error('Erro carregando fluxos:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Utilidade de fallback: atualiza node.data dentro do canvas (não salva no banco!)
  const fallbackApply = useCallback(
    (updates: Partial<NextFlowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...updates } } : n
        )
      );
    },
    [id, setNodes]
  );

  // Nome amigável do fluxo selecionado (para exibir quando estiver colapsado)
  const selectedName = useMemo(() => {
    const f = flows.find((x) => x.id === (selected || data.targetFluxoId));
    return f?.nome ?? '';
  }, [flows, selected, data.targetFluxoId]);

  /** Atualiza o draft e o node.data.targetFluxoId (sem persistir no banco ainda) */
  const handleSelect = (fluxoId: string) => {
    setSelected(fluxoId);
    if (data.onChangeTargetFlow) data.onChangeTargetFlow(id, fluxoId);
    else fallbackApply({ targetFluxoId: fluxoId, label: fluxoId }); // label opcionalmente espelha o id
  };

  function handleOk() {
    const value = (selected || '').trim();

    if (data.onChangeTargetFlow) data.onChangeTargetFlow(id, value);
    else fallbackApply({ targetFluxoId: value, label: value });

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
          <GitMerge className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">Próximo Fluxo</span>
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
      <div className="p-3">
        {collapsed ? (
          <div className="space-y-1">
            <p className="text-sm text-zinc-800">
              {selectedName || '—'}
            </p>
            <span className="mt-1 block text-[11px] text-blue-600/80">
              Ao chegar aqui, a sessão será movida para o START do fluxo selecionado.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs text-gray-500">Fluxo de destino</label>
            <select
              className="nodrag nopan mt-1 w-full border rounded px-2 py-1 text-sm"
              disabled={loading}
              value={selected}
              onChange={(e) => handleSelect(e.target.value)}
            >
              <option value="">{loading ? 'Carregando...' : 'Selecione um fluxo'}</option>
              {flows.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>

            <div className="flex justify-end">
              <button
                onClick={handleOk}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 active:scale-[0.98]"
                title="Salvar e fechar"
                disabled={!selected}
              >
                <Check className="h-4 w-4" />
                OK
              </button>
            </div>

            <span className="block text-[11px] text-blue-600/80">
              Ao salvar, este nó fará a sessão “pular” para o START do fluxo escolhido.
            </span>
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 bg-blue-600 rounded-full"
      />
      
    </div>
  );
}
