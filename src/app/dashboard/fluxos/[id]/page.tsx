'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  Connection,
  Edge as RFEdge,
  Node as RFNode,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import StartNode from './nodes/StartNode';
import TextNode from './nodes/TextNode';
import AudioNode from './nodes/AudioNode';
import ImageNode from './nodes/ImageNode';
import NextFlowNode from './nodes/NextFlowNode';
import WaitNode from './nodes/WaitNode';
import NotifyNode from './nodes/NotifyNode';
import AguardeNode from './nodes/AguardeNode';
import AgendarNode from './nodes/agendarNode';



import { FilePlus2, ChevronDown } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { save_fluxo_completo, type FluxNodeInput, type FluxEdgeInput } from '@/actions/fluxos';
import { Toaster, toast } from 'react-hot-toast';

/* =========================
   Tipos base (Front)
========================= */
type NodeData = {
  dbId?: string;
  label?: string;

  // TextNode
  text?: string;
  collapsed?: boolean;

  // AgendarNode
  time?: string; // horário no formato "HH:MM"

  // NextFlowNode
  targetFluxoId?: string;

  // WaitNode
  waitSeconds?: number;

  [key: string]: unknown;

    // NotifyNode
  nome?: string;      // nome da notificação
  numero?: string;    // número a notificar (E.164, ex: 5593991512921)
  mensagem?: string;  // mensagem a enviar


  // AguardeNode
  timeoutSeconds?: number;
  followupText?: string;

};

type EdgeData = {
  dbId?: string;
  frontId?: string;
  outcome?: string;
  [key: string]: unknown;
};

type FlowNode = RFNode<NodeData>;
type FlowEdge = RFEdge<EdgeData>;

/* =========================
   Tipos vindos do DB/RPC
========================= */
// O RPC pode devolver em dois formatos:
// A) { id, tipo, conteudo, position }
// B) { id, type, data, position }
type DbNode = {
  id: string;
  tipo?: string; // A
  type?: string; // B
  conteudo?:
    | {
        frontId?: string;
        label?: string;
        text?: string;
        time?: string;
        collapsed?: boolean;
        targetFluxoId?: string;
        // NotifyNode 👇
        nome?: string;
        numero?: string;
        mensagem?: string;
        [key: string]: unknown;

        // AguardeNode 👇
        timeoutSeconds?: number;
        followupText?: string;

      }
    | string; // A (pode vir string-JSON)
  data?:
    | {
        frontId?: string;
        label?: string;
        text?: string;
        time?: string;
        collapsed?: boolean;
        targetFluxoId?: string;
        // NotifyNode 👇
        nome?: string;
        numero?: string;
        mensagem?: string;
        // AguardeNode 👇
        timeoutSeconds?: number;
        followupText?: string;

        [key: string]: unknown;
      }
    | string; // B (pode vir string-JSON)
  position?: { x: number; y: number } | string;
};

type DbEdge = {
  id: string;
  source: string; // sempre ids do DB
  target: string;
  data?:
    | {
        frontId?: string;
        outcome?: string;
        [key: string]: unknown;
      }
    | string;
};

type Mapping = {
  clientId: string;
  dbId: string;
};

/* =========================
   Tipos (React Flow) ⇄ DB
========================= */

// 👉 DB → RF (aceita seus nomes antigos e atuais)
const DB_TO_RF_TYPE: Record<string, FlowNode['type']> = {
  // possíveis nomes legados
  mensagem_texto: 'text',
  mensagem_audio: 'audio',
  mensagem_imagem: 'image',
  mensagem_espera: 'wait',
  mensagem_notificada: 'notify', // novo tipo (legacy/DB)
  aguarde_resposta: 'aguarde',   // 👈 novo (nome no DB → nome RF)
  agendar_mensagem: 'agendar',
  
  


  // nomes atuais
  text: 'text',
  audio: 'audio',
  image: 'image',
  next_flow: 'next_flow',
  wait: 'wait',
  notify: 'notify',              // por segurança, caso já venha assim
  aguarde: 'aguarde',            // por segurança
  agendar: 'agendar',
};

const nodeTypes = {
  start: StartNode,
  text: TextNode,
  audio: AudioNode,
  image: ImageNode,
  next_flow: NextFlowNode,
  wait: WaitNode,
  notify: NotifyNode,
  aguarde: AguardeNode,
  agendar: AgendarNode,

};

/* =========================
   Helpers
========================= */

function normalizeType(raw?: string): FlowNode['type'] {
  if (!raw) return 'text';
  if (DB_TO_RF_TYPE[raw]) return DB_TO_RF_TYPE[raw];
  // já vem em RF:
  if (
    raw === 'text' ||
    raw === 'audio' ||
    raw === 'image' ||
    raw === 'next_flow' ||
    raw === 'wait' ||
    raw === 'start' ||
    raw === 'notify' ||
    raw === 'aguarde' ||
    raw === 'agendar'
  ) {
    return raw;
  }
  return 'text';
}

function safeParse<T>(v: unknown, fallback: T): T {
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  if (v && typeof v === 'object') {
    return v as T;
  }
  return fallback;
}

type Payload = {
  frontId?: string;
  label?: string;
  text?: string;
  time?: string;
  collapsed?: boolean;
  targetFluxoId?: string;
  waitSeconds?: number;
  [key: string]: unknown;
    // NotifyNode
  nome?: string;
  numero?: string;
  mensagem?: string;
   // AguardeNode
  timeoutSeconds?: number;
  followupText?: string;

};

// Aceita ambos os formatos {tipo, conteudo} e {type, data}
function toRFNodeFromDb(dbNode: DbNode): FlowNode {
  const payload = safeParse<Payload>(dbNode.conteudo ?? dbNode.data ?? {}, {} as Payload);

  const frontId =
    typeof payload.frontId === 'string' && payload.frontId.trim()
      ? payload.frontId.trim()
      : dbNode.id;

  const rfType = normalizeType(dbNode.tipo ?? dbNode.type);

  const pos = safeParse<{ x: number; y: number } | null>(dbNode.position ?? null, null);
  const position = pos && Number.isFinite(pos.x) && Number.isFinite(pos.y) ? pos : { x: 250, y: 200 };

  // normalização de campos comuns
  const rawText = typeof payload.text === 'string' ? payload.text.trim() : '';
  const rawLabel = typeof payload.label === 'string' ? payload.label.trim() : '';
  const text = rawText !== '' ? rawText : rawLabel;
  const label =
    rawLabel !== '' ? rawLabel :
    text || (rfType === 'next_flow'
      ? 'Próximo Fluxo'
      : rfType === 'wait'
        ? 'Espera': rfType === 'notify'
          ? 'Notificação'
          : rfType === 'aguarde'
          ? 'Aguarde'
          : 'Novo Texto');

  const collapsed = typeof payload.collapsed === 'boolean' ? payload.collapsed : true;

  const baseData: NodeData = { ...(payload as Record<string, unknown>) };

  if (rfType === 'wait') {
    const raw = Number(payload.waitSeconds);
    (baseData as NodeData).waitSeconds = Number.isFinite(raw) ? Math.min(90, Math.max(0, raw)) : 0;
  }

  // defaults específicos por tipo
  if (rfType === 'next_flow') {
    baseData.targetFluxoId = typeof payload.targetFluxoId === 'string' ? payload.targetFluxoId : '';
  }

  if (rfType === 'notify') {
    baseData.nome = typeof payload.nome === 'string' ? payload.nome : '';
    baseData.numero = typeof payload.numero === 'string' ? payload.numero : '';
    baseData.mensagem = typeof payload.mensagem === 'string' ? payload.mensagem : '';
  }

  // ⬅️ REF: "function toRFNodeFromDb"
if (rfType === 'aguarde') {
  const raw = Number(payload.timeoutSeconds);
  baseData.timeoutSeconds = Number.isFinite(raw) ? Math.max(0, Math.min(86400, Math.floor(raw))) : 60;
  baseData.followupText = typeof payload.followupText === 'string' ? payload.followupText : '';
}

  if (rfType === 'agendar') {
    baseData.text = typeof payload.text === 'string' ? payload.text : '';
    baseData.time = typeof payload.time === 'string' ? payload.time : '';
  }


  return {
    id: String(frontId),
    type: rfType,
    position,
    data: {
      ...baseData,
      dbId: dbNode.id,
      text,
      label,
      collapsed,
    },
  };
}

function ensureStartEdge(nodes: FlowNode[], edges: FlowEdge[]): FlowEdge[] {
  const ids = new Set(nodes.filter((n) => n.id !== 'start').map((n) => n.id));
  const targets = new Set(edges.map((e) => e.target));
  const entries = [...ids].filter((id) => !targets.has(id));
  const first = entries[0];
  const hasStart = edges.some((e) => e.source === 'start');
  if (first && !hasStart) {
    return [{ id: `start-${first}`, source: 'start', target: first, data: { outcome: 'success' } } as FlowEdge, ...edges];
  }
  return edges;
}

// O que vai pro DB em fluxo_nos.conteudo (minimalista)
function extractConteudoForDb(n: FlowNode) {
  switch (n.type) {
    case 'text':
      return { text: (n.data?.text ?? '').toString() };

    case 'next_flow':
      return { targetFluxoId: (n.data?.targetFluxoId ?? '').toString() };

    case 'wait': {
      const s = Number(n.data?.waitSeconds);
      const clamped = Number.isFinite(s) ? Math.min(90, Math.max(0, Math.round(s))) : 0;
      return { waitSeconds: clamped };
    }

    case 'audio':
    case 'image':
      // se você já persiste algo custom em áudio/imagem, mantenha:
      return { ...(n.data ?? {}) };

        case 'notify': {
      const nome = (n.data?.nome ?? '').toString();
      const numero = (n.data?.numero ?? '').toString();
      const mensagem = (n.data?.mensagem ?? '').toString();
      return { nome, numero, mensagem };
    }

  
    case 'aguarde': {
     const s = Number(n.data?.timeoutSeconds);
     const timeout = Number.isFinite(s) ? Math.max(0, Math.min(86400, Math.round(s))) : 60;
     const follow = (n.data?.followupText ?? '').toString();
    return { timeoutSeconds: timeout, followupText: follow };
    }

    case 'agendar': {
      const text = (n.data?.text ?? '').toString();
      const time = (n.data?.time ?? '').toString();
      return { text, time };
    }

    case 'start':
    default:
      return {};
  }
}

function normalizeEdgeForDb(e: FlowEdge) {
  const data: EdgeData = { ...(e.data ?? {}) };
  if (!data.outcome) data.outcome = 'success'; // default usado pelo motor
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    data,
  } as FluxEdgeInput;
}

/* =========================
   Helpers de posicionamento (NOVOS)
========================= */
const NODE_SIZE = { w: 220, h: 80 }; // aprox do seu card; ajuste se necessário
const OFFSET = { x: 260, y: 0 };     // nasce à direita do âncora; use {x:0,y:140} p/ nascer abaixo
const STEP_Y = 120;                  // passo vertical quando há colisão

function pickAnchorNode(nodes: FlowNode[], selectedIds: Set<string>) {
  // Preferência: algum nó selecionado (evita o 'start')
  const selected = nodes.find(n => n.id !== 'start' && selectedIds.has(n.id));
  if (selected) return selected;

  // Caso contrário: "último" = mais embaixo; empate -> mais à direita
  return nodes
    .filter(n => n.id !== 'start')
    .reduce<FlowNode | undefined>((acc, n) => {
      if (!acc) return n;
      if (n.position.y !== acc.position.y) {
        return n.position.y > acc.position.y ? n : acc;
      }
      return n.position.x > acc.position.x ? n : acc;
    }, undefined);
}

function findFreeSpot(base: { x: number; y: number }, nodes: FlowNode[]) {
  const collides = (p: { x: number; y: number }) =>
    nodes.some(n =>
      Math.abs(n.position.x - p.x) < NODE_SIZE.w &&
      Math.abs(n.position.y - p.y) < NODE_SIZE.h
    );

  // tentativa inicial: à direita do âncora
  let pos = { x: base.x + OFFSET.x, y: base.y + OFFSET.y };
  while (collides(pos)) {
    pos = { x: pos.x, y: pos.y + STEP_Y }; // desce até encontrar espaço
  }
  return pos;
}

function timeToMinutes(t?: string | null): number | null {
  if (!t || typeof t !== 'string') return null;
  const [hh, mm] = t.split(':').map((v) => Number(v));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

/* =========================
   Página
========================= */

function FluxoPageContent() {
  const { id } = useParams();
  const { setNodes } = useReactFlow();

  const [nodes, setNodesState, onNodesChange] = useNodesState<NodeData>([
    {
      id: 'start',
      type: 'start',
      data: { label: 'Start' },
      position: { x: 250, y: 50 },
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeData>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // seleção atual
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());

  // sessão (debug)
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();
      console.log('Sessão atual:', session);
    };
    checkSession();
  }, []);

  // carrega o fluxo
  useEffect(() => {
    const loadFluxo = async () => {
      const fluxoId = String(id);
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(fluxoId)) {
        console.error('ID do fluxo inválido:', id);
        toast.error('ID do fluxo inválido. Verifique o URL.');
        return;
      }

      const { data, error } = await supabaseBrowser.rpc('get_fluxo_completo', {
        fluxo_id_input: fluxoId,
      });

      if (error) {
        console.error('Erro ao carregar fluxo:', JSON.stringify(error, null, 2));
        toast.error('Erro ao carregar fluxo. Veja o console para detalhes.');
        return;
      }

      if (!data || !data.length) return;

      const fluxo = data[0] as { nodes?: unknown[]; edges?: unknown[] };

      const dbNodes: DbNode[] = Array.isArray(fluxo.nodes) ? (fluxo.nodes as DbNode[]) : [];
      const dbEdges: DbEdge[] = Array.isArray(fluxo.edges) ? (fluxo.edges as DbEdge[]) : [];

      const rfNodes = dbNodes.map(toRFNodeFromDb);

      // Mapa dbId -> clientId (frontId)
      const clientIdByDbId = new Map<string, string>();
      rfNodes.forEach((n) => {
        const dbId = n.data?.dbId as string | undefined;
        if (dbId) clientIdByDbId.set(dbId, n.id);
      });

      const rfEdges: FlowEdge[] = dbEdges
        .map((e): FlowEdge | null => {
          const src = clientIdByDbId.get(e.source);
          const tgt = clientIdByDbId.get(e.target);
          if (!src || !tgt) return null;

          const dataObj = safeParse<EdgeData>(e.data ?? {}, {} as EdgeData);
          const clientId = dataObj.frontId ?? `${src}-${tgt}`;

          let sourceHandle: string | undefined;
          if (dataObj.outcome === 'answered') {
            sourceHandle = 'answered';
          } else if (dataObj.outcome === 'no_reply') {
            sourceHandle = 'no_reply';
          } else {
            sourceHandle = undefined;
          }

          return {
            id: String(clientId),
            source: src,
            target: tgt,
            sourceHandle,
            data: {
              ...dataObj,
              outcome: dataObj.outcome ?? 'success',
              dbId: e.id,
            },
          };
        })
        .filter((v): v is FlowEdge => Boolean(v));

      const nodesWithStart: FlowNode[] = [
        {
          id: 'start',
          type: 'start',
          data: { label: 'Start' },
          position: { x: 250, y: 50 },
        },
        ...rfNodes,
      ];
      const edgesWithStart = ensureStartEdge(nodesWithStart, rfEdges);

      setNodesState(nodesWithStart);
      setEdges(edgesWithStart);
    };

    loadFluxo();
  }, [id, setNodesState, setEdges]);

  // [ADD] Delete/Backspace → remove nós/arestas selecionados
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;

      // evita apagar enquanto digita em inputs/textarea/contenteditable
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) {
        return;
      }

      e.preventDefault();

      // 1) remove arestas selecionadas OU conectadas a nós selecionados
      setEdges((eds) =>
        eds.filter(
          (ed) =>
            !selectedEdgeIds.has(ed.id) &&
            !selectedNodeIds.has(ed.source) &&
            !selectedNodeIds.has(ed.target)
        )
      );

      // 2) remove nós selecionados (protege o 'start')
      setNodes((nds) => nds.filter((n) => n.id === 'start' || !selectedNodeIds.has(n.id)));

      // 3) limpa seleção após deletar
      setSelectedEdgeIds(new Set());
      setSelectedNodeIds(new Set());
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setNodes, setEdges, selectedNodeIds, selectedEdgeIds]);

  // ⬅️ REF: "const onConnect"
const onConnect = useCallback(
  (connection: Connection) => {
    const outcome: EdgeData['outcome'] =
      connection.sourceHandle === 'answered'
        ? 'answered'
        : connection.sourceHandle === 'no_reply'
        ? 'no_reply'
        : 'success';

    // Connection oficial não tem `data`. Se vier (de código externo),
    // lemos de forma segura sem usar `any`.
    const existingData = (connection as unknown as { data?: EdgeData }).data;

    setEdges((eds) =>
      addEdge(
        {
          ...connection,
          data: { ...(existingData ?? {}), outcome } as EdgeData,
        },
        eds
      )
    );
  },
  [setEdges]
);


  // [ADD] quando a seleção mudar no diagrama, atualiza nossos states
  const handleSelectionChange = useCallback(
    (params: { nodes: FlowNode[]; edges: FlowEdge[] }) => {
      setSelectedNodeIds(new Set(params.nodes.map((n) => n.id)));
      setSelectedEdgeIds(new Set(params.edges.map((e) => e.id)));
    },
    []
  );

  // [ADD] duplo clique na aresta remove só aquela aresta
  const handleEdgeDoubleClick = useCallback(
    (_evt: React.MouseEvent, edge: FlowEdge) => {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    },
    [setEdges]
  );

  // ===== handleAddNode (NOVA) =====
  const handleAddNode = useCallback(
    (nodeType: 'text' | 'audio' | 'image' | 'next_flow' | 'wait'| 'notify'| 'aguarde' | 'agendar') => {
      // 1) decide âncora: selecionado -> último -> start
      const anchor =
        pickAnchorNode(nodes, selectedNodeIds) ||
        nodes.find(n => n.id === 'start');

      // 2) fallback de base
      const base = anchor?.position ?? { x: 250, y: 50 };

      // 3) acha spot livre perto da âncora
      const position = findFreeSpot(base, nodes);

      // 4) monta data padrão por tipo (sem "Nova Imagem" forçada)
      let data: NodeData = { label: '', collapsed: false };
      if (nodeType === 'text') {
        data = { label: 'Novo Texto', text: '', collapsed: false };
      } else if (nodeType === 'audio') {
        data = { label: 'Novo Áudio', collapsed: false };
      } else if (nodeType === 'image') {
      // antes: data = { label: 'Nova Imagem' };
       data = { label: '', text: '', collapsed: false }; // ou até remover label de vez
      } else if (nodeType === 'next_flow') {
        data = { label: 'Próximo Fluxo', targetFluxoId: '', collapsed: false };
      } else if (nodeType === 'wait') {
        data = { label: 'Espera', waitSeconds: 0, collapsed: false };

      } else if (nodeType === 'notify') {
        data = { label: 'Notificação', nome: '', numero: '', mensagem: '', collapsed: false };
        } else if (nodeType === 'aguarde') {
        data = { label: 'Aguarde', timeoutSeconds: 60, followupText: '', collapsed: false };
      } else if (nodeType === 'agendar') {
        data = { label: 'Agendar Mensagem', text: '', time: '', collapsed: false };
       // coloque os novos sempre nesse espaço.
      }
      

      


      // 5) cria nó
      const newNodeId = `${nodeType}-${Date.now()}`;
      const newNode: FlowNode = {
        id: newNodeId,
        type: nodeType,
        position,
        data,
      };

      setNodes((nds) => [...nds, newNode]);
      setIsDropdownOpen(false);
    },
    [nodes, selectedNodeIds, setNodes]
  );

  const handleSave = useCallback(async () => {
    const toastId = toast.loading('Salvando fluxo...');
    try {
      setIsSaving(true);

      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Você precisa estar logado para salvar o fluxo!');
      }

      const fluxoId = String(id);
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(fluxoId)) {
        throw new Error('ID do fluxo inválido. Verifique o URL.');
      }

      // validação: NEXT_FLOW sem destino
      const invalidNext = nodes.find(
        (n) => n.type === 'next_flow' && !(n.data?.targetFluxoId)
      );
      if (invalidNext) {
        toast.error('Selecione o fluxo de destino no nó “Próximo Fluxo”.', { id: toastId });
        setIsSaving(false);
        return;
      }

      // Validação: horários dos nós "agendar"
      const agendarNodes = nodes.filter((n) => n.type === 'agendar');

      if (agendarNodes.length > 1) {
        // Primeiro nó agendar na ordem atual do array
        const first = agendarNodes[0];
        const firstTimeStr: string | undefined = first.data?.time;
        const firstMinutes = timeToMinutes(firstTimeStr);

        if (firstMinutes !== null) {
          const invalid = agendarNodes.slice(1).find((n) => {
            const t: string | undefined = n.data?.time;
            const m = timeToMinutes(t);
            // Só bloqueia se o nó tiver horário válido definido e for menor que o do primeiro
            return m !== null && m < firstMinutes;
          });

          if (invalid) {
            toast.error(
              'Horário inválido: existe um nó "Agendar Mensagem" com horário menor que o do primeiro nó agendado.',
              { id: toastId }
            );
            setIsSaving(false);
            return;
          }
        }
      }

      // Mapeia nodes RF -> DB
      const nodesToSave: FluxNodeInput[] = nodes
        .filter((node) => node.type !== 'start')
        .map((node, index) => {
          const dbType: FluxNodeInput['type'] =
            node.type === 'audio' ? 'audio' :
            node.type === 'image' ? 'image' :
            node.type === 'next_flow' ? 'next_flow' :
            node.type === 'wait' ? 'wait' :
            node.type === 'notify' ? 'mensagem_notificada' :
            node.type === 'aguarde' ? 'aguarde_resposta' : // (ou 'wait' temporário)
            node.type === 'agendar' ? 'agendar_mensagem' :
            'text';

          return {
            id: node.id,
            type: dbType,
            conteudo: extractConteudoForDb(node),
            ordem: index,
            position: {
              x: node.position?.x ?? 250,
              y: node.position?.y ?? 200,
            },
          };
        });

      // Mapeia edges RF -> DB
      const edgesToSave: FluxEdgeInput[] = edges
        .filter((e) => e.source !== 'start' && e.target !== 'start')
        .map((edge) => normalizeEdgeForDb(edge));

      const result = await save_fluxo_completo({
        fluxoId,
        nodes: nodesToSave,
        edges: edgesToSave,
      });

      // atualiza os dbIds no front (não altera texto/label)
      const nodeMap = new Map<string, string>(
        (result?.nodesMapping ?? ([] as Mapping[])).map((m) => [m.clientId, m.dbId])
      );
      const edgeMap = new Map<string, string>(
        (result?.edgesMapping ?? ([] as Mapping[])).map((m) => [m.clientId, m.dbId])
      );

      setNodes((nds) =>
        nds.map((n) =>
          n.type === 'start'
            ? n
            : {
                ...n,
                data: {
                  ...(n.data ?? {}),
                  dbId: nodeMap.get(n.id) ?? n.data?.dbId,
                },
              }
        )
      );

      setEdges((eds) =>
        eds.map((e) => {
          const data: EdgeData = { ...(e.data ?? {}) };
          data.dbId = edgeMap.get(e.id) ?? data.dbId;
          if (!data.outcome) data.outcome = 'success';
          return { ...e, data };
        })
      );

      toast.success('Fluxo salvo com sucesso!', { id: toastId });
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Erro ao salvar fluxo:', error);
      toast.error(error?.message ?? 'Erro ao salvar fluxo. Veja o console.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  }, [id, nodes, edges, setNodes, setEdges]);

  return (
    <div className="h-screen w-full relative">
      <Toaster position="top-right" />
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1 bg-[#181818] text-white px-4 py-2 rounded-full hover:bg-[#2a2a2a] transition cursor-pointer"
          >
            <FilePlus2 className="w-4 h-4" />
            Adicionar
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {isDropdownOpen && (
            <div className="absolute top-12 right-0 bg-white border border-gray-200 rounded-md shadow-lg w-56 z-20">
              <button
                onClick={() => handleAddNode('text')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition">
                Texto
              </button>
              <button
                onClick={() => handleAddNode('audio')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition">
                Áudio
              </button>
              <button
                onClick={() => handleAddNode('wait')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition">
                Delay
              </button>
              <button
                onClick={() => handleAddNode('image')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition">
                Imagem
              </button>
              <button
                onClick={() => handleAddNode('aguarde')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition">
                Aguarde Resposta
              </button>
              <button
                onClick={() => handleAddNode('notify')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition">
                Notificação
              </button>

              <button
                onClick={() => handleAddNode('agendar')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition">
                Agendar Mensagem
              </button>

              <button
                onClick={() => handleAddNode('next_flow')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition">
                Próximo Fluxo
              </button>
            </div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`${isSaving ? 'opacity-60 cursor-not-allowed' : ''} bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition cursor-pointer`}
        >
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
      <div className="h-full border rounded-lg">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          onSelectionChange={handleSelectionChange}
          onEdgeDoubleClick={handleEdgeDoubleClick}
          // Se preferir usar a deleção nativa do React Flow, remova o useEffect acima e descomente:
          // deleteKeyCode={['Delete', 'Backspace']}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function FluxoPage() {
  return (
    <ReactFlowProvider>
      <FluxoPageContent />
    </ReactFlowProvider>
  );
}
