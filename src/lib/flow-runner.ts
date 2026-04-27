// workshoplive/src/lib/flow-runner.ts
import supabaseAdmin from '@/lib/supabaseAdmin';
import {
  evoSendTextWithFallback,
  evoSendImageWithFallback,
  evoSendAudioWithFallback,
} from '@/lib/evolution';
import { DIRECAO } from '@/lib/constants';
import { createHash } from 'node:crypto';

type Dict = Record<string, unknown>;

/* =========================
   Sessão / Normalização
========================= */
// Normaliza msisdn a partir de JID/phone (só dígitos)
function normalizeMsisdn(jidOrNumber?: string | null): string {
  if (!jidOrNumber) return '';
  const base = jidOrNumber.split('@')[0].split(':')[0];
  return base.replace(/[^\d]/g, '').trim();
}

// UUID determinístico estilo v3 a partir de md5(conexao|remote) — não inclui fluxo
function makeSessionKey(conexaoId: string, remoteMsisdn: string): string {
  const h = createHash('md5').update(`${conexaoId}|${remoteMsisdn}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

// Idempotency key simples e estável por ação
function makeIdempotencyKey(sessionId: string, flowId: string | null, kind: string, payload: Dict, dueAtIso: string): string {
  const raw = JSON.stringify({ sessionId, flowId, kind, payload, dueAtIso });
  const h = createHash('sha256').update(raw).digest('hex');
  return `${sessionId}:${flowId ?? 'noflow'}:${kind}:${h.slice(0,24)}`;
}

/* =========================
   Tipos (grafo / ações)
========================= */
type DbNode = {
  id: string;
  fluxo_id: string;
  tipo:
    | 'mensagem_texto'
    | 'mensagem_audio'
    | 'mensagem_imagem'
    | 'mensagem_espera'
    | 'mensagem_notificada'
    | 'aguarde_resposta'
    | 'next_flow'
    | 'agendar_mensagem'
    | string;
  conteudo: unknown; // jsonb
  ordem: number;
};

type DbEdge = {
  id: string;
  fluxo_id: string;
  source: string; // node.id (db)
  target: string; // node.id (db)
  data: unknown;  // jsonb com "outcome" etc (opcional)
};

type SendAction =
  | { kind: 'text'; text: string; delayMs: number }
  | { kind: 'image'; urlOrBase64: string; caption?: string; delayMs: number }
  | { kind: 'audio'; urlOrBase64: string; delayMs: number }
  | { kind: 'presence'; state: 'composing' | 'recording'; durationMs?: number; delayMs: number }
  | { kind: 'notify'; number: string; text: string; delayMs: number }
  | { kind: 'next_flow'; targetFluxoId: string; delayMs: number }; // vira job start_flow

const isSendNode = (n: DbNode) =>
  n.tipo === 'mensagem_texto' ||
  n.tipo === 'mensagem_imagem' ||
  n.tipo === 'mensagem_audio' ||
  n.tipo === 'mensagem_notificada';

const isWaitNode = (n: DbNode) => n.tipo === 'mensagem_espera';
const isAguardeNode = (n: DbNode) => n.tipo === 'aguarde_resposta';
const isNextFlowNode = (n: DbNode) => n.tipo === 'next_flow';
const isAgendarNode = (n: DbNode) => n.tipo === 'agendar_mensagem';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* =========================
   Parsers
========================= */
function parseWaitSeconds(node: DbNode): number {
  const c = (node.conteudo ?? {}) as { waitSeconds?: unknown };
  const raw = c.waitSeconds;
  const s = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(s) && s > 0 ? Math.floor(s) : 0;
}

function parseText(node: DbNode): string | null {
  const c = (node.conteudo ?? {}) as { text?: unknown };
  const t = typeof c.text === 'string' ? c.text : null;
  return t && t.trim() ? t : null;
}

function parseImage(node: DbNode): { urlOrBase64: string; caption?: string } | null {
  const c = (node.conteudo ?? {}) as {
    url?: unknown;
    base64?: unknown;
    data?: unknown;       // dataURL base64
    caption?: unknown;    // legenda opcional
    text?: unknown;       // legenda opcional (preferida)
  };

  const url = typeof c.url === 'string' && c.url.trim() ? c.url.trim() : undefined;
  const b64 = typeof c.base64 === 'string' && c.base64.trim() ? c.base64.trim() : undefined;
  const data = typeof c.data === 'string' && c.data.trim() ? c.data.trim() : undefined;

  const media = b64 ?? data ?? url ?? null;
  if (!media) return null;

  const capRaw =
    (typeof c.caption === 'string' ? c.caption : undefined) ??
    (typeof c.text === 'string' ? c.text : undefined);

  const caption = capRaw && (capRaw as string).trim() ? (capRaw as string).trim() : undefined;

  return { urlOrBase64: media, caption };
}

function parseAudio(node: DbNode): { urlOrBase64: string } | null {
  const c = (node.conteudo ?? {}) as { url?: unknown; base64?: unknown };
  const url = typeof c.url === 'string' ? c.url : undefined;
  const b64 = typeof c.base64 === 'string' ? c.base64 : undefined;
  const media = b64 ?? url ?? null;
  return media ? { urlOrBase64: media } : null;
}

function parseNotify(node: DbNode): { number: string; text: string } | null {
  const c = (node.conteudo ?? {}) as { numero?: unknown; mensagem?: unknown };
  const numero =
    typeof c.numero === 'string'
      ? c.numero.replace(/[^\d]/g, '').trim()
      : typeof c.numero === 'number'
      ? String(c.numero)
      : '';
  const mensagem = typeof c.mensagem === 'string' ? c.mensagem.trim() : '';
  if (!numero || !mensagem) return null;
  return { number: numero, text: mensagem };
}

function parseAgendar(node: DbNode): { text: string; time: string } | null {
  const c = (node.conteudo ?? {}) as { text?: unknown; time?: unknown };

  const text =
    typeof c.text === 'string' && c.text.trim()
      ? c.text.trim()
      : '';

  const time =
    typeof c.time === 'string' && c.time.trim()
      ? c.time.trim()
      : '';

  // time esperado como "HH:MM"
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!text || !m) return null;

  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (
    !Number.isFinite(hh) ||
    !Number.isFinite(mm) ||
    hh < 0 || hh > 23 ||
    mm < 0 || mm > 59
  ) {
    return null;
  }

  return { text, time: `${m[1]}:${m[2]}` };
}

// Calcula delay em ms para o horário informado (HH:MM) em Horário de Brasília (GMT-3).
// Regra:
// - Considera agora em UTC.
// - Converte para hora local (GMT-3 fixo).
// - Se o horário alvo já passou hoje, agenda para o próximo dia.
function computeDelayMsForBrasilia(time: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return 0;

  const targetH = Number(m[1]);
  const targetM = Number(m[2]);

  const now = new Date();

  // minutos atuais em UTC
  const nowUtcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  // Brasília GMT-3 fixo: local = UTC - 3h
  const offsetMinutes = 3 * 60;
  let nowLocalMinutes = nowUtcMinutes - offsetMinutes;

  // normaliza para [0, 1440)
  const DAY_MINUTES = 24 * 60;
  nowLocalMinutes = ((nowLocalMinutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;

  const targetMinutes = targetH * 60 + targetM;

  let diffMinutes = targetMinutes - nowLocalMinutes;
  if (diffMinutes < 0) {
    diffMinutes += DAY_MINUTES; // agenda para o próximo dia
  }

  return diffMinutes * 60 * 1000;
}

function parseAguarde(node: DbNode): { timeoutSeconds: number; followupText: string } {
  const c = (node.conteudo ?? {}) as { timeoutSeconds?: unknown; followupText?: unknown };
  const rawT = typeof c.timeoutSeconds === 'number' ? c.timeoutSeconds : Number(c.timeoutSeconds);
  const timeoutSeconds = Number.isFinite(rawT) && rawT > 0 ? Math.min(86400, Math.floor(rawT)) : 60;
  const followupText =
    typeof c.followupText === 'string' && c.followupText.trim() ? c.followupText.trim() : '';
  return { timeoutSeconds, followupText };
}

function parseNextFlowTarget(node: DbNode): string | null {
  const c = (node.conteudo ?? {}) as { targetFluxoId?: unknown };
  const raw = typeof c.targetFluxoId === 'string' ? c.targetFluxoId.trim() : '';
  return UUID_RE.test(raw) ? raw : null;
}

/* =========================
   Graph helpers
========================= */
function getNextNodeId(edges: DbEdge[], currentNodeId: string): string | null { const edge = edges.find((e) => e.source === currentNodeId); return edge ? edge.target : null; }

function getOutcomeTargets(edges: DbEdge[], nodeId: string): {
  answered?: string | null;
  no_reply?: string | null;
} {
  let answered: string | null | undefined = undefined;
  let no_reply: string | null | undefined = undefined;

  for (const e of edges) {
    if (e.source !== nodeId) continue;
    const d = (e.data ?? {}) as { outcome?: unknown };
    const outcome = typeof d.outcome === 'string' ? d.outcome : '';
    if (outcome === 'answered') answered = e.target;
    if (outcome === 'no_reply') no_reply = e.target;
  }
  return { answered: answered ?? null, no_reply: no_reply ?? null };
}

/* =========================
   Planning
========================= */
type PlanResult = {
  actions: SendAction[];
  aguarde?: {
    nodeId: string;
    timeoutSeconds: number;
    followupText: string;
    answeredTargetId: string | null;
    noReplyTargetId: string | null;
  };
};

// Injeta "presence" por 3s em waits e respeita delays acumulados.
// Para em "aguarde_resposta" e retorna metadados para criação da espera.
// Para em "next_flow" e delega o disparo do outro fluxo para a execução (como job).
function planSends(nodes: DbNode[], edges: DbEdge[], startNodeId: string): PlanResult {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const MAX_STEPS = 20;

  const actions: SendAction[] = [];
  let curr: DbNode | undefined = byId.get(startNodeId);
  let elapsedMs = 0;
  let steps = 0;
  const visited = new Set<string>();
  let aguardeInfo: PlanResult['aguarde'] | undefined;

  while (curr && steps < MAX_STEPS) {
    if (visited.has(curr.id)) break;
    visited.add(curr.id);
    steps++;

    // WAIT tradicional (só delay/presença)
    if (isWaitNode(curr)) {
      const waitMs = Math.max(0, parseWaitSeconds(curr) * 1000);
      if (waitMs > 0) {
        const presMs = Math.min(waitMs, 60000);
        actions.push({
          kind: 'presence',
          state: 'composing',
          durationMs: presMs,
          delayMs: elapsedMs,
        });
      }
      elapsedMs += waitMs;
      const nextId = getNextNodeId(edges, curr.id);
      curr = nextId ? byId.get(nextId) : undefined;
      continue;
    }

    // AGUARDE RESPOSTA (abre uma "espera" e encerra o planejamento)
    if (isAguardeNode(curr)) {
      const params = parseAguarde(curr);
      const { answered, no_reply } = getOutcomeTargets(edges, curr.id);

      // Envia o followupText imediatamente (respeitando o delay acumulado)
      if (params.followupText && params.followupText.trim()) {
        actions.push({ kind: 'text', text: params.followupText.trim(), delayMs: elapsedMs });
      }

      aguardeInfo = {
        nodeId: curr.id,
        timeoutSeconds: params.timeoutSeconds,
        followupText: params.followupText,
        answeredTargetId: answered ?? null,
        noReplyTargetId: no_reply ?? null,
      };
      break; // não percorre além do nó de aguarde
    }

    // NEXT_FLOW: vira ação 'next_flow' e paramos
    if (isNextFlowNode(curr)) {
      const target = parseNextFlowTarget(curr);
      if (target) {
        actions.push({ kind: 'next_flow', targetFluxoId: target, delayMs: elapsedMs });
      }
      break; // não percorre além do nó de next_flow
    }

    // AGENDAR MENSAGEM (mensagem agendada para horário específico em Brasília)
    if (isAgendarNode(curr)) {
      const params = parseAgendar(curr);
      if (params) {
        const delayMs = computeDelayMsForBrasilia(params.time);
        // Mesmo se delayMs sair 0 (horário igual ao "agora" local), deixamos como 0 = envio imediato
        actions.push({
          kind: 'text',
          text: params.text,
          delayMs,
        });
      }

      const nextId = getNextNodeId(edges, curr.id);
      curr = nextId ? byId.get(nextId) : undefined;
      continue;
    }

    // Nós de envio
    if (curr.tipo === 'mensagem_texto') {
      const text = parseText(curr);
      if (text) actions.push({ kind: 'text', text, delayMs: elapsedMs });
    } else if (curr.tipo === 'mensagem_imagem') {
      const img = parseImage(curr);
      if (img) actions.push({ kind: 'image', urlOrBase64: img.urlOrBase64, caption: img.caption, delayMs: elapsedMs });
    } else if (curr.tipo === 'mensagem_audio') {
      const aud = parseAudio(curr);
      if (aud) actions.push({ kind: 'audio', urlOrBase64: aud.urlOrBase64, delayMs: elapsedMs });
    } else if (curr.tipo === 'mensagem_notificada') {
      const notif = parseNotify(curr);
      if (notif) {
        actions.push({ kind: 'notify', number: notif.number, text: notif.text, delayMs: elapsedMs });
      }
    }

    const nextId = getNextNodeId(edges, curr.id);
    curr = nextId ? byId.get(nextId) : undefined;
  }

  return { actions, aguarde: aguardeInfo };
}

/* =========================
   ENFILEIRAMENTO (jobs)
========================= */
type EnqueueParams = {
  conexaoId: string;
  fluxoId: string | null;
  userId: string | null;
  remoteJid: string;
  sessionId: string;
  instanceId?: string | null;
  instanceName?: string | null;
  action: SendAction;
};

async function enqueueJob(p: EnqueueParams) {
  const dueAt = new Date(Date.now() + p.action.delayMs);
  const action_kind: 'text' | 'image' | 'audio' | 'presence' | 'notify' | 'start_flow' =
    p.action.kind === 'next_flow' ? 'start_flow' : p.action.kind;

  let payload: Dict = {};
  switch (p.action.kind) {
    case 'text':
      payload = { text: p.action.text };
      break;
    case 'image':
      payload = { media: p.action.urlOrBase64, caption: p.action.caption ?? null };
      break;
    case 'audio':
      payload = { media: p.action.urlOrBase64 };
      break;
    case 'presence':
      payload = { state: p.action.state, durationMs: p.action.durationMs ?? 3000 };
      break;
    case 'notify':
      payload = { number: p.action.number, text: p.action.text };
      break;
    case 'next_flow':
      payload = { targetFluxoId: p.action.targetFluxoId };
      break;
  }

  // idempotência por sessão/fluxo/ação/payload/dueAt
  const idempotency_key = makeIdempotencyKey(
    p.sessionId,
    p.action.kind === 'next_flow' ? p.action.targetFluxoId : p.fluxoId,
    action_kind,
    payload,
    dueAt.toISOString()
  );

  await supabaseAdmin.from('fluxo_agendamentos').insert({
    user_id: p.userId,
    whatsapp_conexao_id: p.conexaoId,
    // Associar ao fluxo de DESTINO quando for start_flow; caso contrário, ao atual
    fluxo_id: p.action.kind === 'next_flow' ? p.action.targetFluxoId : p.fluxoId,
    remote_jid: p.remoteJid,
    instance_id: p.instanceId ?? null,
    instance_name: p.instanceName ?? null,
    action_kind,
    payload,
    due_at: dueAt.toISOString(),
    status: 'pending',
    session_id: p.sessionId,
    idempotency_key,
  });
}

/* =========================
   EXECUÇÃO DO PLANO
========================= */
async function executePlan(params: {
  actions: SendAction[];
  remoteJid: string;        // "5599...@s.whatsapp.net" (ou msisdn)
  conexaoId: string;        // whatsapp_conexoes.id
  fluxoId?: string | null;  // para registrar em mensagens e jobs
  connNumber?: string | null;
  userId?: string | null;
  instanceId?: string | null;
  instanceName?: string | null;
  sessionId: string;
}) {
  const {
    actions, remoteJid, conexaoId, fluxoId,
    connNumber, userId, instanceId, instanceName, sessionId
  } = params;

  // descobre o maior delay para montar barreira antes do next_flow
  const maxDelayInActions = actions.length ? Math.max(...actions.map(a => a.delayMs)) : 0;

  for (const a of actions) {
    // Sempre enfileirar presence e qualquer action com delay > 0
    if (a.kind === 'presence' || a.delayMs > 0) {
      await enqueueJob({
        conexaoId,
        fluxoId: a.kind === 'next_flow' ? a.targetFluxoId : (fluxoId ?? null),
        userId: userId ?? null,
        remoteJid,
        instanceId: instanceId ?? null,
        instanceName: instanceName ?? null,
        sessionId,
        action: a,
      });
      continue;
    }

    // delayMs === 0:
    // - Para text/image/audio/notify preservamos envio imediato (compat de latência)
    // - Para next_flow SEMPRE vira job com barreira (não enviar imediato)
    if (a.kind === 'text') {
      await evoSendTextWithFallback({
        instanceId: instanceId ?? undefined,
        instanceName: instanceName ?? undefined,
        number: remoteJid,
        text: a.text,
      });

      await supabaseAdmin.from('mensagens').insert({
        whatsapp_conexao_id: conexaoId,
        fluxo_id: fluxoId ?? null,
        user_id: userId ?? null,
        de: connNumber ?? null,
        para: normalizeMsisdn(remoteJid),
        direcao: DIRECAO.OUT,
        conteudo: { text: a.text },
        timestamp: new Date().toISOString(),
        session_id: sessionId,
      });
      continue;
    }

    if (a.kind === 'image') {
      await evoSendImageWithFallback({
        instanceId: instanceId ?? undefined,
        instanceName: instanceName ?? undefined,
        number: remoteJid,
        media: a.urlOrBase64,
        caption: a.caption,
      });

      await supabaseAdmin.from('mensagens').insert({
        whatsapp_conexao_id: conexaoId,
        fluxo_id: fluxoId ?? null,
        user_id: userId ?? null,
        de: connNumber ?? null,
        para: normalizeMsisdn(remoteJid),
        direcao: DIRECAO.OUT,
        conteudo: { image: true, urlOrBase64: a.urlOrBase64, caption: a.caption ?? null },
        timestamp: new Date().toISOString(),
        session_id: sessionId,
      });
      continue;
    }

    if (a.kind === 'audio') {
      await evoSendAudioWithFallback({
        instanceId: instanceId ?? undefined,
        instanceName: instanceName ?? undefined,
        number: remoteJid,
        media: a.urlOrBase64,
      });

      await supabaseAdmin.from('mensagens').insert({
        whatsapp_conexao_id: conexaoId,
        fluxo_id: fluxoId ?? null,
        user_id: userId ?? null,
        de: connNumber ?? null,
        para: normalizeMsisdn(remoteJid),
        direcao: DIRECAO.OUT,
        conteudo: { audio: true, urlOrBase64: a.urlOrBase64 },
        timestamp: new Date().toISOString(),
        session_id: sessionId,
      });
      continue;
    }

    if (a.kind === 'notify') {
      await evoSendTextWithFallback({
        instanceId: instanceId ?? undefined,
        instanceName: instanceName ?? undefined,
        number: a.number,
        text: a.text,
      });

      await supabaseAdmin.from('mensagens').insert({
        whatsapp_conexao_id: conexaoId,
        fluxo_id: fluxoId ?? null,
        user_id: userId ?? null,
        de: connNumber ?? null,
        para: normalizeMsisdn(a.number),
        direcao: DIRECAO.OUT,
        conteudo: { notify: true, text: a.text },
        timestamp: new Date().toISOString(),
        session_id: sessionId,
      });
      continue;
    }

    if (a.kind === 'next_flow') {
      // Nunca chama direto: cria job com barreira após os demais envios
      const barrierDelay = Math.max(maxDelayInActions, 0) + 1; // +1ms simbólico
      await enqueueJob({
        conexaoId,
        fluxoId: a.targetFluxoId,
        userId: userId ?? null,
        remoteJid,
        instanceId: instanceId ?? null,
        instanceName: instanceName ?? null,
        sessionId,
        action: { ...a, delayMs: barrierDelay },
      });
      // Não continua enviando nada do fluxo atual após o handoff
      break;
    }
  }
}

/* =========================
   API p/ WEBHOOK
========================= */
export async function sendFirstNodeAndLog(args: {
  conexaoId: string;
  fluxoId: string;
  remoteJid: string;              // quem vai receber (JID ou número)
  instanceId?: string | null;
  instanceName?: string | null;
}): Promise<{ ok: boolean; sent: boolean; actions?: number }> {
  const { conexaoId, fluxoId, remoteJid, instanceId, instanceName } = args;

  // Verifica se o fluxo existe e está ativo antes de continuar
  const { data: fluxo, error: fluxoError } = await supabaseAdmin
    .from('fluxos')
    .select('id, ativo, user_id')
    .eq('id', fluxoId)
    .maybeSingle();

  if (fluxoError) {
    // Falha ao ler o fluxo — não prossegue
    // eslint-disable-next-line no-console
    console.error('Erro ao carregar fluxo', fluxoError);
    return { ok: false, sent: false };
  }

  if (!fluxo || fluxo.ativo === false) {
    // Fluxo inexistente ou desativado — não envia nada
    return { ok: true, sent: false, actions: 0 };
  }

  // carrega nós + edges do fluxo
  const [{ data: nodes }, { data: edges }, { data: conn }] = await Promise.all([
    supabaseAdmin
      .from('fluxo_nos')
      .select('id, fluxo_id, tipo, conteudo, ordem')
      .eq('fluxo_id', fluxoId)
      .order('ordem', { ascending: true }),
    supabaseAdmin
      .from('fluxo_edge')
      .select('id, fluxo_id, source, target, data')
      .eq('fluxo_id', fluxoId),
    supabaseAdmin
      .from('whatsapp_conexoes')
      .select('numero, user_id')
      .eq('id', conexaoId)
      .maybeSingle(),
  ]);

  // Checagem opcional de segurança: evitar rodar fluxo de outro usuário na conexão errada
  if (fluxo?.user_id && conn?.user_id && fluxo.user_id !== conn.user_id) {
    return { ok: false, sent: false };
  }

  if (!nodes?.length) return { ok: false, sent: false };

  // escolhe o primeiro nó enviável (ou o que tiver menor ordem)
  const start = (nodes as DbNode[]).find(isSendNode) ?? (nodes as DbNode[])[0];

  const plan = planSends(nodes as DbNode[], edges as DbEdge[], start.id);
  const actions = plan.actions;

  // Calcula session_id SEM fluxo (compat com webhook e waits)
  const msisdn = normalizeMsisdn(remoteJid);
  const sessionId = makeSessionKey(conexaoId, msisdn);

  // Se o plano encontrou um AGUARDE, registra a espera e NÃO segue além dele
  if (plan.aguarde) {
    const now = new Date();
    const expires = new Date(now.getTime() + plan.aguarde.timeoutSeconds * 1000);

    await supabaseAdmin.from('fluxo_esperas').insert({
      status: 'pending',
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
      fluxo_id: fluxoId,
      node_id: plan.aguarde.nodeId,
      remote_jid: msisdn, // armazenar normalizado
      whatsapp_conexao_id: conexaoId,
      user_id: conn?.user_id ?? null,
      answered_target_id: plan.aguarde.answeredTargetId,
      no_reply_target_id: plan.aguarde.noReplyTargetId,
      followup_text: plan.aguarde.followupText ? { text: plan.aguarde.followupText } : null,
      session_id: sessionId, // <- chave de sessão
    });
    // Obs.: o worker segue no_reply quando expirar; o followupText já foi enviado no próprio plano.
  }

  // Se não há ações e não há aguarde, não enviou nada
  if (!actions.length && !plan.aguarde) {
    return { ok: true, sent: false, actions: 0 };
  }

  // Executa/enfileira as ações. next_flow vira job com barreira.
  await executePlan({
    actions,
    remoteJid: msisdn,   // usamos msisdn normalizado para jobs e mensagens
    conexaoId,
    fluxoId,
    connNumber: conn?.numero ?? null,
    userId: conn?.user_id ?? null,
    instanceId: instanceId ?? null,
    instanceName: instanceName ?? null,
    sessionId,
  });

  return { ok: true, sent: actions.length > 0, actions: actions.length };
}
