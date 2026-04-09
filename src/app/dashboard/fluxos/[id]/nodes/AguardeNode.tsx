'use client';

import * as React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

type Data = {
  label?: string;
  collapsed?: boolean;
  timeoutSeconds?: number; // 0..86400
  followupText?: string;
  dbId?: string;
};

export default function AguardeNode({ id, data }: NodeProps<Data>) {
  const rf = useReactFlow();

  const label =
    typeof data?.label === 'string' && data.label.trim()
      ? data.label.trim()
      : 'Aguarde Resposta';

  const collapsed = data?.collapsed ?? false;
  const timeoutSeconds = Number.isFinite(Number(data?.timeoutSeconds))
    ? Math.max(0, Math.min(86400, Math.floor(Number(data?.timeoutSeconds))))
    : 60;

  const followupText = typeof data?.followupText === 'string' ? data.followupText : '';

  const update = (patch: Partial<Data>) => {
    rf.setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...(n.data || {}), ...patch } } : n))
    );
  };

  return (
    <div className="relative w-[260px] rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* ENTRADA (target) — maior */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 bg-blue-600 rounded-full"
        style={{ top: '50%' }}
      />

      {/* TOPO */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4" />
          {label}
        </div>
        <button
          type="button"
          onClick={() => update({ collapsed: !collapsed })}
          className="p-1 rounded hover:bg-gray-100"
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* HANDLE "NÃO RESPONDEU"
          - Recolhido: no TOPO (aresta passa na frente do node)
          - Expandido: na LATERAL DIREITA (alinhado com a linha do tempo)
      */}
      {collapsed ? (
        <Handle
          id="no_reply"
          type="source"
          position={Position.Top}
          className="!w-3 !h-3 bg-orange-500 rounded-full"
          style={{ left: '92%' }} // topo-direita
        />
      ) : null}

      {!collapsed && (
        <div className="px-3 py-3 space-y-3">
          {/* Linha do tempo + handle "não respondeu" à direita */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Se não responder em (segundos)</label>

            <input
              type="number"
              min={0}
              max={86400}
              value={timeoutSeconds}
              onChange={(e) =>
                update({
                  timeoutSeconds: Math.max(
                    0,
                    Math.min(86400, Math.floor(Number(e.target.value || 0)))
                  ),
                })
              }
              className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="60"
            />

            <span className="text-xs text-gray-400">máx 86400</span>

            {/* Handle na direita quando expandido */}
            <Handle
              id="no_reply"
              type="source"
              position={Position.Right}
              className="!w-3 !h-3 bg-orange-500 rounded-full"
            />
          </div>

          {/* Mensagem de follow-up (opcional) */}
          <div>
            <div className="flex justify-end">
              <span className="rounded-full bg-orange-100 text-orange-700 text-[10px] px-2 py-[2px] mb-2">
                Não Respondeu
              </span>
            </div>

            <label className="block text-xs text-gray-500 mb-1">
              Mensagem de follow-up (opcional)
            </label>

            <textarea
              rows={3}
              value={followupText}
              onChange={(e) => update({ followupText: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex.: Oi! Só passando para lembrar…"
            />
          </div>
        </div>
      )}

      {/* SAÍDA (source) RESPONDEU — sempre EMBAIXO */}
      <div className="flex flex-col items-center mt-1">
        <Handle
          id="answered"
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 bg-green-500 rounded-full"
          style={{ left: '50%' }}
        />
        <span className="mb-4 rounded-full bg-green-100 text-green-700 text-[10px] px-2 py-[2px]">
          Respondeu
        </span>
      </div>
    </div>
  );
}
