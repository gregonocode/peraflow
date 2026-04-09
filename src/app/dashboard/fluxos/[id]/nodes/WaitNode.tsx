'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from 'reactflow';
import { Hourglass, Pencil, Check } from 'lucide-react';

type WaitNodeData = {
  /** Persistir no banco (em fluxo_nos.conteudo) */
  waitSeconds?: number;  // 0..90
  collapsed?: boolean;

  /** Compat antigo (se quiser exibir algum rótulo) */
  label?: string;

  /** Callbacks injetados pelo page.tsx (não vão pro banco) */
  onChangeWait?: (id: string, seconds: number) => void;
  onToggleCollapsed?: (id: string, collapsed: boolean) => void;
  onSave?: (id: string) => void;
};

export default function WaitNode({ id, data }: NodeProps<WaitNodeData>) {
  const { setNodes } = useReactFlow();

  // Fallback de valores:
  const initialSeconds = useMemo(() => {
    const s = Number(data.waitSeconds);
    return Number.isFinite(s) ? Math.min(90, Math.max(0, s)) : 0;
  }, [data.waitSeconds]);

  const [seconds, setSeconds] = useState<number>(initialSeconds);
  const [collapsed, setCollapsed] = useState<boolean>(!!data.collapsed);

  useEffect(() => setSeconds(initialSeconds), [initialSeconds]);
  useEffect(() => setCollapsed(!!data.collapsed), [data.collapsed]);

  // Atualizar só no estado do React Flow (fallback se não vier callback do page.tsx)
  const fallbackApply = useCallback(
    (updates: Partial<WaitNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n))
      );
    },
    [id, setNodes]
  );

  const clamp = (v: number) => Math.min(90, Math.max(0, Math.round(v)));

  const handleChange = (v: number) => {
    const next = clamp(v);
    setSeconds(next);
    if (data.onChangeWait) data.onChangeWait(id, next);
    else fallbackApply({ waitSeconds: next }); // mantém no node.data para o botão Salvar
  };

  function handleOk() {
    const v = clamp(seconds);

    if (data.onChangeWait) data.onChangeWait(id, v);
    else fallbackApply({ waitSeconds: v });

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
          <Hourglass className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">Delay</span>
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
          <p className="text-sm text-zinc-800">
            Aguardar <span className="font-semibold">{seconds}</span> segundo(s)
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">0s</span>
              <span className="text-sm font-semibold text-blue-700">
                {seconds}s
              </span>
              <span className="text-xs text-zinc-600">90s</span>
            </div>

            <input
              type="range"
              min={0}
              max={90}
              step={1}
              value={seconds}
              onChange={(e) => handleChange(Number(e.target.value))}
              className="nodrag nopan w-full accent-blue-600"
            />

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={90}
                value={seconds}
                onChange={(e) => handleChange(Number(e.target.value))}
                className="nodrag nopan w-24 rounded-lg border border-blue-300 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
              />
              <span className="text-sm text-zinc-700">segundos</span>

              <div className="ml-auto">
                <button
                  onClick={handleOk}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 active:scale-[0.98]"
                  title="Salvar e fechar"
                >
                  <Check className="h-4 w-4" />
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        <span className="mt-2 block text-[11px] text-blue-600/80">Intervalo de Espera</span>
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
