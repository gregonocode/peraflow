// src/app/api/webhook/evolution/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { sendFirstNodeAndLog } from '@/lib/flow-runner';
import { DIRECAO } from '@/lib/constants';
import { createHash } from 'node:crypto';





/* =========================
   Utils (logs, tipos)
   ========================= */
type Dict = Record<string, unknown>;

const logDebug = (c: string, m: string, d?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] [${c}] ${m}`, d ? JSON.stringify(d, null, 2) : '');
  }
};

const pickStr = (obj: unknown, key: string): string | undefined => {
  if (obj && typeof obj === 'object') {
    const v = (obj as Dict)[key];
    if (typeof v === 'string') return v;
  }
  return undefined;
};

/* =========================
   Sessão e normalização
   ========================= */
// Normaliza msisdn a partir de JID/phone (só dígitos)
function normalizeMsisdn(jidOrNumber?: string | null): string {
  if (!jidOrNumber) return '';
  const base = jidOrNumber.split('@')[0].split(':')[0];
  return base.replace(/[^\d]/g, '').trim();
}


// UUID determinístico estilo v3 a partir de md5(conexao|remote|fluxo?)
function makeSessionKey(conexaoId: string, remoteMsisdn: string): string {
  const h = createHash('md5').update(`${conexaoId}|${remoteMsisdn}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}


/* =========================
   Evol. payload helpers
   ========================= */
const getEventFromBody = (body: unknown): string => {
  const b = (body ?? {}) as Dict;
  const ev =
    typeof b.event === 'string' ? b.event :
    typeof b.type === 'string' ? b.type : '';
  return ev;
};

// "messages.upsert" | "messages-upsert" -> "MESSAGES_UPSERT"
const normalizeEvent = (evRaw: string | undefined) =>
  (evRaw ?? '').toUpperCase().replace(/[.\-]/g, '_');

function extractQrCode(body: unknown): string | null {
  const b = (body ?? {}) as Dict;
  const data = (b.data ?? b) as Dict;

  const dq = data.qrcode as unknown;
  if (dq && typeof dq === 'object' && dq !== null) {
    const base64 = (dq as Dict).base64;
    if (typeof base64 === 'string' && base64) return base64;
  }
  const bq = b.qrcode as unknown;
  if (bq && typeof bq === 'object' && bq !== null) {
    const base64 = (bq as Dict).base64;
    if (typeof base64 === 'string' && base64) return base64;
  }
  return null;
}

/** status da Evolution -> status da sua UI */
const mapEvoStatusToUi = (s?: string): string => {
  const v = (s ?? '').toLowerCase();
  if (v === 'open' || v === 'connected') return 'connected';
  if (v === 'connecting' || v === 'qr' || v === 'pairing') return 'pending';
  if (v === 'close' || v === 'closed' || v === 'logout' || v === 'logged_out') return 'disconnected';
  return 'connected';
};

/** Extrai possíveis "sender" e "state/status" (compat c/ versões antigas) */
function extractSenderAndState(body: unknown): { senderJid?: string; state?: string } {
  const b = (body ?? {}) as Dict;
  const data = (b.data ?? {}) as Dict;

  const senderJid =
    pickStr(b, 'sender') ??
    pickStr(data, 'sender') ??
    pickStr((data.me as Dict | undefined), 'id') ??
    pickStr(data, 'id');

  const state =
    pickStr(data, 'state') ??
    pickStr(data, 'status') ??
    undefined;

  return { senderJid, state };
}

/* ====== Tipos mínimos do MESSAGES_UPSERT ====== */
interface EvoKey { remoteJid?: string; fromMe?: boolean; id?: string }
interface EvoInnerMessage {
  key?: EvoKey;
  conversation?: string;
  extendedTextMessage?: { text?: string };
  ephemeralMessage?: { message?: { extendedTextMessage?: { text?: string } } };
  message?: {
    key?: EvoKey;
    conversation?: string;
    extendedTextMessage?: { text?: string };
    ephemeralMessage?: { message?: { extendedTextMessage?: { text?: string } } };
  };
}
interface EvoUpsertItem {
  message?: EvoInnerMessage;
  data?: { message?: EvoInnerMessage };
  key?: EvoKey;
  remoteJid?: string;
  remoteJID?: string;
  jid?: string;
}
function normalizeUpsertItem(raw: unknown): EvoUpsertItem {
  const r = (raw ?? {}) as Dict;
  const item: EvoUpsertItem = {};

  if (typeof r.message === 'object' && r.message) item.message = r.message as EvoInnerMessage;
  if (typeof r.key === 'object' && r.key) item.key = r.key as EvoKey;
  if (typeof (r as Dict).remoteJid === 'string') item.remoteJid = (r as Dict).remoteJid as string;
  if (typeof (r as Dict).remoteJID === 'string') item.remoteJID = (r as Dict).remoteJID as string;
  if (typeof (r as Dict).jid === 'string') item.jid = (r as Dict).jid as string;

  const d = r.data as unknown;
  if (d && typeof d === 'object') {
    const dd = d as Dict;
    if (typeof dd.message === 'object' && dd.message) {
      item.data = { message: dd.message as EvoInnerMessage };
    }
  }
  return item;
}

function extractText(msgUnknown?: unknown): string {
  const m = (msgUnknown ?? {}) as Dict;
  const core = (m.message && typeof m.message === 'object') ? (m.message as Dict) : m;

  if (typeof core.conversation === 'string' && core.conversation) return core.conversation;

  const ext = core.extendedTextMessage as Dict | undefined;
  if (ext && typeof ext.text === 'string' && ext.text) return ext.text;

  const eph = core.ephemeralMessage as Dict | undefined;
  const ephMsg = (eph?.message ?? {}) as Dict;
  const ephExt = ephMsg.extendedTextMessage as Dict | undefined;
  if (ephExt && typeof ephExt.text === 'string' && ephExt.text) return ephExt.text;

  return '';
}

function extractUpsert(body: unknown): { instanceId?: string; instanceName?: string; messages: EvoUpsertItem[] } {
  const b = (body ?? {}) as Dict;
  const data = (b.data ?? b) as Dict;

  const instanceId =
    pickStr(data, 'instanceId') ??
    pickStr(b, 'instance') ??
    pickStr(b, 'instanceId') ??
    pickStr(data, 'instance');

  const instanceName =
    pickStr(b, 'instanceName') ??
    pickStr(b, 'instance') ??
    pickStr(data, 'instanceName');

  const maybe = (data as Dict).messages;
  const messages: EvoUpsertItem[] = Array.isArray(maybe)
    ? (maybe as unknown[]).map(normalizeUpsertItem)
    : (typeof (data as Dict).message === 'object' && (data as Dict).message !== null)
      ? [normalizeUpsertItem({ message: (data as Dict).message as EvoInnerMessage })]
      : [];

  return { instanceId, instanceName, messages };
}

/** JID – procura em muitos formatos (inclui messageContextInfo.participant) */
function extractRemoteJid(itemUnknown?: unknown, bodyUnknown?: unknown): string | undefined {
  const it = (itemUnknown ?? {}) as Dict;

  const msg = (it.message && typeof it.message === 'object') ? (it.message as Dict) : undefined;
  const inner = (msg?.message && typeof msg.message === 'object') ? (msg.message as Dict) : undefined;

  const ctx1 = (msg?.messageContextInfo ?? {}) as Dict;
  const ctx2 = (inner?.messageContextInfo ?? {}) as Dict;

  const d = ((bodyUnknown ?? {}) as Dict)?.data as Dict | undefined;
  const key = d && typeof d.key === 'object' ? (d.key as Dict) : undefined;

  const candidates = [
    ctx1.participant, ctx2.participant,
    (inner?.key as Dict | undefined)?.remoteJid,
    (inner?.key as Dict | undefined)?.remoteJID,
    (inner?.key as Dict | undefined)?.jid,
    (inner?.key as Dict | undefined)?.chatId,
    (msg?.key as Dict | undefined)?.remoteJid,
    (msg?.key as Dict | undefined)?.remoteJID,
    (msg?.key as Dict | undefined)?.jid,
    (msg?.key as Dict | undefined)?.chatId,
    (msg?.remoteJid as unknown),
    (msg?.remoteJID as unknown),
    (msg?.jid as unknown),
    (msg?.chatId as unknown),
    ((it.key as Dict | undefined)?.remoteJid),
    ((it.key as Dict | undefined)?.remoteJID),
    ((it.key as Dict | undefined)?.jid),
    ((it.key as Dict | undefined)?.chatId),
    (it.remoteJid as unknown),
    (it.remoteJID as unknown),
    (it.jid as unknown),
    (it.chatId as unknown),
    key?.remoteJid, key?.remoteJID, key?.jid, key?.chatId, key?.participant,
    d?.chatId, d?.remoteJid, d?.remoteJID, d?.from, d?.jid, d?.peerJid, d?.participant,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c) return c;
  }
  return undefined;
}

function extractProviderMsgId(itemUnknown?: unknown, bodyUnknown?: unknown): string | undefined {
  const it = (itemUnknown ?? {}) as Dict;
  const msg = (it.message && typeof it.message === 'object') ? (it.message as Dict) : undefined;
  const inner = (msg?.message && typeof msg.message === 'object') ? (msg.message as Dict) : undefined;

  const d = ((bodyUnknown ?? {}) as Dict)?.data as Dict | undefined;
  const keyBody = d && typeof d.key === 'object' ? (d.key as Dict) : undefined;

  const candidates = [
    (inner?.key as Dict | undefined)?.id,
    (msg?.key as Dict | undefined)?.id,
    (it.key as Dict | undefined)?.id,
    keyBody?.id,
    pickStr(it, 'id'),
    pickStr(d ?? {}, 'id'),
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return undefined;
}

function extractBodyData(body: unknown): Dict {
  const b = (body ?? {}) as Dict;
  return (b.data ?? b) as Dict;
}

/* =========================
   Webhook
   ========================= */
export async function POST(req: Request) {
  try {
    const bodyUnknown = (await req.json().catch(() => ({}))) as unknown;

    const rawEvent = getEventFromBody(bodyUnknown);
    const event = normalizeEvent(rawEvent);

    const apikey = req.headers.get('apikey') || req.headers.get('x-api-key');
    if (!apikey) {
      logDebug('AUTH', 'Header apikey ausente');
      return NextResponse.json({ error: 'Header apikey é obrigatório' }, { status: 401 });
    }

    // 1) Resolve conexão pela hash (apikey)
    let { data: conn } = await supabaseAdmin
      .from('whatsapp_conexoes')
      .select('id, nome, hash, token_sessao, numero, status, fluxo_inicial_id, user_id')
      .eq('hash', apikey)
      .maybeSingle();

    // Fallback compat por nome
    if (!conn?.id) {
      const instanceName =
        pickStr(bodyUnknown, 'instance') ??
        pickStr(bodyUnknown, 'instanceName');
      if (instanceName) {
        const { data: byName } = await supabaseAdmin
          .from('whatsapp_conexoes')
          .select('id, nome, hash, token_sessao, numero, status, fluxo_inicial_id, user_id')
          .eq('nome', instanceName)
          .maybeSingle();
        if (byName && byName.hash === apikey) conn = byName;
      }
    }

    if (!conn?.id) {
      logDebug('SUPABASE', 'Conexão não encontrada', { apikey: apikey.slice(0, 8) + '...' });
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });
    }

    logDebug('WEBHOOK', 'Evento recebido', { rawEvent, event, connId: conn.id });

    /* ===== Eventos administrativos ===== */
    if (event === 'LOGOUT_INSTANCE') {
      await supabaseAdmin
        .from('whatsapp_conexoes')
        .update({ status: 'disconnected', data_conexao: new Date().toISOString() })
        .eq('id', conn.id);
      return NextResponse.json({ ok: true, status: 'disconnected' });
    }

    if (event === 'INSTANCE_DELETE' || event === 'REMOVE_INSTANCE') {
      await supabaseAdmin
        .from('whatsapp_conexoes')
        .update({ status: 'disconnected', data_conexao: new Date().toISOString() })
        .eq('id', conn.id);
      return NextResponse.json({ ok: true, instanceRemoved: true });
    }

    // QRCODE_UPDATED
    if (event.includes('QRCODE_UPDATED')) {
      const base64 = extractQrCode(bodyUnknown);
      if (base64) {
        await supabaseAdmin
          .from('whatsapp_conexoes')
          .update({ qrcode: base64 })
          .eq('id', conn.id);
        logDebug('QRCODE', 'QR atualizado', { connId: conn.id });
      }
    }

    // Atualiza número/status via sender (evita sobrepor status em MESSAGES_UPSERT)
    const { senderJid, state } = extractSenderAndState(bodyUnknown);
    if (senderJid) {
      const msisdn = normalizeMsisdn(senderJid);
      const updates: Dict = {
        numero: msisdn,
        data_conexao: new Date().toISOString(),
      };
      if (!event.includes('MESSAGES_UPSERT')) {
        updates['status'] = mapEvoStatusToUi(state);
      }

      await supabaseAdmin
        .from('whatsapp_conexoes')
        .update(updates)
        .eq('id', conn.id);

      if (!event.includes('MESSAGES_UPSERT')) {
        return NextResponse.json({ message: 'Número/status atualizados' });
      }
    }

    // CONNECTION_UPDATE / STATUS_INSTANCE / APPLICATION_STARTUP
    if (event.includes('CONNECTION_UPDATE') || event === 'STATUS_INSTANCE' || event === 'APPLICATION_STARTUP') {
      const newState = extractSenderAndState(bodyUnknown).state ?? 'connected';
      const uiStatus = mapEvoStatusToUi(newState);
      await supabaseAdmin
        .from('whatsapp_conexoes')
        .update({ status: uiStatus, data_conexao: new Date().toISOString() })
        .eq('id', conn.id);
    }

    /* ===== MESSAGES_UPSERT ===== */
    if (event.includes('MESSAGES_UPSERT')) {
      const { instanceId, instanceName, messages } = extractUpsert(bodyUnknown);
      const d = extractBodyData(bodyUnknown);

      logDebug('UPSERT_DEBUG', 'Resumo do upsert', {
        len: messages.length,
        firstRaw: messages[0] ? Object.keys(messages[0]) : [],
      });

      for (const item of messages) {
        // fromMe?
        const msgObj = (item.message && typeof item.message === 'object') ? (item.message as Dict) : undefined;
        const innerMsg = (msgObj?.message && typeof msgObj.message === 'object') ? (msgObj.message as Dict) : undefined;
        const fromMe = !!(
          (innerMsg?.key as Dict | undefined)?.fromMe ??
          (msgObj?.key as Dict | undefined)?.fromMe ??
          (((item as Dict).key instanceof Object) ? ((item as Dict).key as Dict).fromMe : undefined) ??
          ((typeof d.key === 'object' && d.key) ? (d.key as Dict).fromMe : undefined)
        );

        // remoteJid + texto + providerMsgId
        const remoteJid = extractRemoteJid(item, bodyUnknown);
        if (!remoteJid) continue;
        if (remoteJid.endsWith('@g.us')) continue; // ignora grupo
        if (fromMe) continue; // só IN

        const msisdn = normalizeMsisdn(remoteJid);
        const text = extractText(item.message);
        const providerMsgId = extractProviderMsgId(item, bodyUnknown) || undefined;
        const providerTs = new Date(((d as Dict)?.timestamp as string | number | undefined) ?? Date.now());
        const sessionId = makeSessionKey(conn.id, msisdn);


        // 1) Dedup inbound (inbound_messages) — idempotente por (conexao, provider_message_id)
        if (providerMsgId) {
          const { error: inErr } = await supabaseAdmin.from('inbound_messages').insert({
            whatsapp_conexao_id: conn.id,
            remote_jid: msisdn,
            session_id: sessionId,
            provider_message_id: providerMsgId,
            provider_timestamp: providerTs.toISOString(),
            raw: (item as unknown) as Dict, // guarda o item do upsert
            payload: text ? { text } : {},
          });
          if (inErr && inErr.code === '23505') {
            // já processado — segue para o próximo item
            continue;
          }
          if (inErr) {
            console.error('[WEBHOOK][INBOUND_INSERT_ERROR]', inErr);
            // se falhou por outro motivo, ainda assim não quebra o webhook
          }
        }

        // 2) Registrar IN também na tabela mensagens (compat com seu painel)
        const { error: insertError } = await supabaseAdmin.from('mensagens').insert({
          whatsapp_conexao_id: conn.id,
          fluxo_id: null,
          user_id: conn.user_id ?? null,
          de: msisdn,
          para: conn.numero ?? null,
          direcao: DIRECAO.IN,
          conteudo: text ? { text } : {},
          timestamp: new Date().toISOString(),
          external_id: providerMsgId ?? null, // útil para dedupe/trace
          session_id: sessionId,
        });
        if (insertError && insertError.code !== '23505') {
          console.error('[WEBHOOK][INSERT_IN_ERROR]', insertError);
        }

        // 3) Tentar claim atômico da ESPERA por session_id
        //    - Só uma requisição consegue trocar status para 'answered'.
        const nowIso = new Date().toISOString();
        const { data: answeredWait, error: updErr } = await supabaseAdmin
          .from('fluxo_esperas')
          .update({ status: 'answered' })
          .eq('session_id', sessionId)
          .eq('status', 'pending')
          .gt('expires_at', nowIso)
          .select('id, fluxo_id, answered_target_id, user_id, whatsapp_conexao_id, remote_jid')
          .maybeSingle();

        if (updErr) {
          console.error('[WEBHOOK][fluxo_esperas.update answered] error', updErr);
        }

        if (answeredWait?.id && answeredWait.answered_target_id) {
          // ===== Carrega grafo e planeja a partir do answered_target_id =====
          const [{ data: nodes }, { data: edges }] = await Promise.all([
            supabaseAdmin
              .from('fluxo_nos')
              .select('id, fluxo_id, tipo, conteudo, ordem')
              .eq('fluxo_id', answeredWait.fluxo_id),
            supabaseAdmin
              .from('fluxo_edge')
              .select('id, fluxo_id, source, target, data')
              .eq('fluxo_id', answeredWait.fluxo_id),
          ]);

          if (nodes?.length) {
            type WebDbNode = {
              id: string;
              fluxo_id: string;
              tipo:
                | 'mensagem_texto'
                | 'mensagem_imagem'
                | 'mensagem_audio'
                | 'mensagem_espera'
                | 'mensagem_notificada'
                | 'aguarde_resposta'
                | 'next_flow'
                | string;
              conteudo: unknown;
              ordem: number;
            };
            type WebDbEdge = {
              id: string;
              fluxo_id: string;
              source: string;
              target: string;
              data: unknown;
            };
            type WebPlannedAction =
              | { kind: 'text'; text: string; delayMs: number }
              | { kind: 'image'; urlOrBase64: string; caption?: string; delayMs: number }
              | { kind: 'audio'; urlOrBase64: string; delayMs: number }
              | { kind: 'presence'; state: 'composing' | 'recording'; durationMs?: number; delayMs: number }
              | { kind: 'notify'; number: string; text: string; delayMs: number }
              | { kind: 'next_flow'; targetFluxoId: string; delayMs: number };

            const nodesTyped = (nodes ?? []) as WebDbNode[];
            const edgesTyped = (edges ?? []) as WebDbEdge[];
            const byId = new Map<string, WebDbNode>(nodesTyped.map((n) => [n.id, n]));

            const getNext = (es: WebDbEdge[], id: string): string | null => {
              const e = es.find((x) => x.source === id);
              return e ? e.target : null;
            };
            const isNextFlowNode = (n: WebDbNode) => n.tipo === 'next_flow';

            const parseNextFlowTarget = (n: WebDbNode): string | null => {
              const c = (n.conteudo ?? {}) as { targetFluxoId?: unknown };
              const raw = typeof c.targetFluxoId === 'string' ? c.targetFluxoId.trim() : '';
              return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw) ? raw : null;
            };
            const parseWait = (n: WebDbNode): number => {
              const c = (n.conteudo ?? {}) as { waitSeconds?: unknown };
              const raw = c.waitSeconds;
              const s = typeof raw === 'number' ? raw : Number(raw);
              return Number.isFinite(s) && s > 0 ? Math.floor(s) : 0;
            };
            const parseTextNode = (n: WebDbNode): string | null => {
              const c = (n.conteudo ?? {}) as { text?: unknown };
              const t = typeof c.text === 'string' ? c.text : null;
              return t && t.trim() ? t : null;
            };
            const parseImageNode = (n: WebDbNode): { urlOrBase64: string; caption?: string } | null => {
              const c = (n.conteudo ?? {}) as { url?: unknown; base64?: unknown; data?: unknown; caption?: unknown; text?: unknown; };
              const url = typeof c.url === 'string' && c.url.trim() ? c.url.trim() : undefined;
              const b64 = typeof c.base64 === 'string' && c.base64.trim() ? c.base64.trim() : undefined;
              const dataUrl = typeof c.data === 'string' && c.data.trim() ? c.data.trim() : undefined;
              const media = b64 ?? dataUrl ?? url ?? null;
              if (!media) return null;
              const capRaw = (typeof c.caption === 'string' ? c.caption : undefined) ?? (typeof c.text === 'string' ? c.text : undefined);
              const caption = capRaw && (capRaw as string).trim() ? (capRaw as string).trim() : undefined;
              return { urlOrBase64: media, caption };
            };
            const parseAudioNode = (n: WebDbNode): { urlOrBase64: string } | null => {
              const c = (n.conteudo ?? {}) as { url?: unknown; base64?: unknown };
              const url = typeof c.url === 'string' ? c.url : undefined;
              const b64 = typeof c.base64 === 'string' ? c.base64 : undefined;
              const media = b64 ?? url ?? null;
              return media ? { urlOrBase64: media } : null;
            };
            const parseNotifyNode = (n: WebDbNode): { number: string; text: string } | null => {
              const c = (n.conteudo ?? {}) as { numero?: unknown; mensagem?: unknown };
              const numero =
                typeof c.numero === 'string'
                  ? c.numero.replace(/[^\d]/g, '').trim()
                  : typeof c.numero === 'number'
                  ? String(c.numero)
                  : '';
              const mensagem = typeof c.mensagem === 'string' ? c.mensagem.trim() : '';
              if (!numero || !mensagem) return null;
              return { number: numero, text: mensagem };
            };

            const actions: WebPlannedAction[] = [];
            const MAX_STEPS = 20;
            let curr: WebDbNode | undefined = byId.get(answeredWait.answered_target_id as string);
            let elapsedMs = 0;
            let steps = 0;
            const visited = new Set<string>();

            while (curr && steps < MAX_STEPS) {
              if (visited.has(curr.id)) break;
              visited.add(curr.id);
              steps++;

              if (curr.tipo === 'mensagem_espera') {
                const waitMs = Math.max(0, parseWait(curr) * 1000);
                if (waitMs > 0) {
                  const presMs = Math.min(waitMs, 60000);
                  actions.push({ kind: 'presence', state: 'composing', durationMs: presMs, delayMs: elapsedMs });
                }
                elapsedMs += waitMs;
                const nextId = getNext(edgesTyped, curr.id);
                curr = nextId ? byId.get(nextId) : undefined;
                continue;
              }

              if (isNextFlowNode(curr)) {
                const target = parseNextFlowTarget(curr);
                if (target) actions.push({ kind: 'next_flow', targetFluxoId: target, delayMs: elapsedMs });
                break; // handoff
              }

              if (curr.tipo === 'mensagem_texto') {
                const t = parseTextNode(curr);
                if (t) actions.push({ kind: 'text', text: t, delayMs: elapsedMs });
              } else if (curr.tipo === 'mensagem_imagem') {
                const img = parseImageNode(curr);
                if (img) actions.push({ kind: 'image', urlOrBase64: img.urlOrBase64, caption: img.caption, delayMs: elapsedMs });
              } else if (curr.tipo === 'mensagem_audio') {
                const aud = parseAudioNode(curr);
                if (aud) actions.push({ kind: 'audio', urlOrBase64: aud.urlOrBase64, delayMs: elapsedMs });
              } else if (curr.tipo === 'mensagem_notificada') {
                const notif = parseNotifyNode(curr);
                if (notif) actions.push({ kind: 'notify', number: notif.number, text: notif.text, delayMs: elapsedMs });
              }

              const nextId = getNext(edgesTyped, curr.id);
              curr = nextId ? byId.get(nextId) : undefined;
            }

            // Enfileirar ações com session_id + idempotency_key
            const resolvedInstanceId = instanceId || conn.token_sessao || null;
            const resolvedInstanceName = instanceName || conn.nome || null;

            const enqueue = async (
              kind: 'text' | 'image' | 'audio' | 'presence' | 'notify' | 'start_flow',
              payload: Record<string, unknown>,
              delayMs: number,
              flowIdForJob: string,
              keySuffix: string
            ) => {
              const dueAt = new Date(Date.now() + Math.max(0, delayMs)).toISOString();
              const idempotency_key = `${sessionId}:${flowIdForJob}:${kind}:${keySuffix}:${dueAt}`;
              await supabaseAdmin.from('fluxo_agendamentos').insert({
                user_id: (answeredWait.user_id as string | null) ?? conn.user_id ?? null,
                whatsapp_conexao_id: answeredWait.whatsapp_conexao_id as string,
                fluxo_id: flowIdForJob,
                remote_jid: answeredWait.remote_jid as string,
                instance_id: resolvedInstanceId,
                instance_name: resolvedInstanceName,
                action_kind: kind,
                payload,
                due_at: dueAt,
                status: 'pending',
                session_id: sessionId,
                idempotency_key,
              });
            };

            let idx = 0;
            for (const a of actions) {
              idx++;
              const keySuffix = providerMsgId ? `${providerMsgId}:${idx}` : `ans:${Date.now()}:${idx}`;
              if (a.kind === 'presence') {
                await enqueue('presence', { state: a.state, durationMs: a.durationMs ?? 3000 }, a.delayMs, answeredWait.fluxo_id as string, keySuffix);
              } else if (a.kind === 'text') {
                await enqueue('text', { text: a.text }, a.delayMs, answeredWait.fluxo_id as string, keySuffix);
              } else if (a.kind === 'image') {
                await enqueue('image', { media: a.urlOrBase64, caption: a.caption ?? null }, a.delayMs, answeredWait.fluxo_id as string, keySuffix);
              } else if (a.kind === 'audio') {
                await enqueue('audio', { media: a.urlOrBase64 }, a.delayMs, answeredWait.fluxo_id as string, keySuffix);
              } else if (a.kind === 'notify') {
                await enqueue('notify', { number: a.number, text: a.text }, a.delayMs, answeredWait.fluxo_id as string, keySuffix);
              } else if (a.kind === 'next_flow') {
                await enqueue('start_flow', { targetFluxoId: a.targetFluxoId }, a.delayMs, a.targetFluxoId, keySuffix);
              }
            }
          }

          // Como houve answered, não dispare fluxo inicial para este item
          continue;
        }

        // 4) Primeiro contato → dispara fluxo inicial (compat)
        if (conn.fluxo_inicial_id) {
          // Heurística de "primeiro contato": contar inbound deste contato na conexão
          const { count: prevIn } = await supabaseAdmin
            .from('mensagens')
            .select('id', { count: 'exact', head: true })
            .eq('whatsapp_conexao_id', conn.id)
            .eq('de', msisdn)
            .eq('direcao', DIRECAO.IN);

          if (!prevIn || prevIn === 1) {
            // mantém seu comportamento atual
            const res = await sendFirstNodeAndLog({
              conexaoId: conn.id,
              fluxoId: conn.fluxo_inicial_id,
              remoteJid,
              instanceId: instanceId || conn.token_sessao || null,
              instanceName: instanceName || conn.nome || null,
            });
            logDebug('FLOW_DEBUG', 'Resultado do nó inicial', res);
          }
        }
      } // for

      return NextResponse.json({ ok: true, upsertProcessed: true });
    }

    // Outros eventos: OK
    return NextResponse.json({ ok: true, ignored: rawEvent });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logDebug('ERROR', 'Erro inesperado no webhook', { msg, stack });
    return NextResponse.json({ error: 'Erro inesperado', details: msg }, { status: 500 });
  }
}
