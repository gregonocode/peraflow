// src/lib/evolution.ts
const EVO_BASE = (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_API || '').replace(/\/+$/, '');
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

if (!EVO_BASE || !EVO_KEY) {
  // Evita 500 silencioso depois
  throw new Error('EVOLUTION_API_URL e/ou EVOLUTION_API_KEY não configurados.');
}

// --- Helpers ---------------------------------------------------------------

function normalizeNumber(input: string): string {
  // Evolution aceita número internacional. Se vier JID, remove sufixo.
  if (!input) return input;
  if (input.includes('@')) return input.split('@')[0].split(':')[0];
  return input;
}

async function evoPostJson<T = unknown>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: EVO_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${url} -> ${res.status}: ${text}`);
  }
  return (await res.json().catch(() => ({}))) as T;
}

function makePath(endpoint: string, instance: string) {
  return `${EVO_BASE}/${endpoint}/${instance}`;
}



// ---------------------------------------------------------------------------
// TEXT
// ---------------------------------------------------------------------------

export async function evoSendText(
  instance: string,
  number: string,
  text: string,
  delayMs?: number
) {
  const url = makePath('message/sendText', instance);
  const body = {
    number: normalizeNumber(number),
    text,
    ...(typeof delayMs === 'number' && delayMs > 0 ? { delay: delayMs } : {}),
  };
  return evoPostJson(url, body);
}

/** Fallback: tenta instanceId (token_sessao) e, se falhar, instanceName (nome). */
export async function evoSendTextWithFallback(opts: {
  instanceId?: string | null;
  instanceName?: string | null;
  number: string;
  text: string;
  delayMs?: number;
}) {
  const { instanceId, instanceName, number, text, delayMs } = opts;

  let lastErr: unknown;
  if (instanceId) {
    try {
      return await evoSendText(instanceId, number, text, delayMs);
    } catch (e) {
      lastErr = e;
    }
  }
  if (instanceName) {
    try {
      return await evoSendText(instanceName, number, text, delayMs);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('Sem identificador de instância (instanceId/instanceName).');
}

// ---------------------------------------------------------------------------
// IMAGE  (v2.3.x usa /message/sendMedia)
// ---------------------------------------------------------------------------

export async function evoSendImage(
  instance: string,
  number: string,
  media: string,            // URL http(s) ou data URI (base64)
  caption?: string,
  delayMs?: number
) {
  const url = `${EVO_BASE}/message/sendMedia/${instance}`;

  // Deduz mimetype e filename a partir do media (dataURL ou URL)
  const inferFromMedia = (s: string) => {
    // data:image/png;base64,....
    if (s.startsWith('data:')) {
      const m = /^data:([^;]+);base64,/i.exec(s);
      const mime = m?.[1] || 'image/jpeg';
      const ext = mime.endsWith('png') ? 'png'
        : mime.endsWith('webp') ? 'webp'
        : mime.endsWith('gif') ? 'gif'
        : 'jpg';
      return { mimetype: mime, fileName: `image.${ext}` };
    }
    // URL
    try {
      const u = new URL(s);
      const name = u.pathname.split('/').pop() || 'image';
      const lower = name.toLowerCase();
      const ext = lower.includes('.') ? lower.split('.').pop()! : 'jpg';
      const mime =
        ext === 'png' ? 'image/png' :
        ext === 'webp' ? 'image/webp' :
        ext === 'gif' ? 'image/gif' :
        'image/jpeg';
      return { mimetype: mime, fileName: name.includes('.') ? name : `image.${ext}` };
    } catch {
      return { mimetype: 'image/jpeg', fileName: 'image.jpg' };
    }
  };

  const { mimetype, fileName } = inferFromMedia(media);

  const body = {
    number: normalizeNumber(number),
    mediatype: 'image',          // <- obrigatório
    mimetype,                    // <- obrigatório
    fileName,                    // <- obrigatório
    media,                       // <- URL pública OU data URI
    ...(caption ? { caption } : {}),
    ...(typeof delayMs === 'number' && delayMs > 0 ? { delay: delayMs } : {}),
  };

  return evoPostJson(url, body);
}

export async function evoSendImageWithFallback(opts: {
  instanceId?: string | null;
  instanceName?: string | null;
  number: string;
  media: string;            // URL ou data URI
  caption?: string;
  delayMs?: number;
}) {
  const { instanceId, instanceName, number, media, caption, delayMs } = opts;

  let lastErr: unknown;
  if (instanceId) {
    try {
      return await evoSendImage(instanceId, number, media, caption, delayMs);
    } catch (e) {
      lastErr = e;
    }
  }
  if (instanceName) {
    try {
      return await evoSendImage(instanceName, number, media, caption, delayMs);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('Sem identificador de instância (instanceId/instanceName).');
}


// ---------------------------------------------------------------------------
// AUDIO (prioriza PTT via sendVoice -> sendAudio -> sendMedia fallback)
// ---------------------------------------------------------------------------

export async function evoSendAudio(
  instance: string,
  number: string,
  media: string,      // URL http(s) pública ou data URI base64
  delayMs?: number,
  mime?: string
) {
  const base = {
    number: normalizeNumber(number),
    ...(typeof delayMs === 'number' && delayMs > 0 ? { delay: delayMs } : {}),
  };
  const mimetype = mime || 'audio/ogg';

  const post = async (endpoint: string, body: Record<string, unknown>) =>
    evoPostJson(makePath(endpoint, instance), body);

  // 1) PTT (voice note): sendVoice com campo "audio"
  // 1) PTT nativo
// 1) PTT nativo: sendWhatsAppAudio (formato v2 correto)
//     body: { number, audio, delay? }
try {
  const delay = typeof delayMs === 'number' && delayMs > 0 ? delayMs : undefined;
  return await post('message/sendWhatsAppAudio', {
    number: normalizeNumber(number),
    audio: media,                  // URL pública ou data URI
    ...(delay ? { delay } : {}),   // "presença" antes de enviar
  });
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  if (!msg.includes(' 404 ') && !msg.includes(' 400 ')) throw e;
}


// 2) (se quiser manter) sendVoice variações...
// 3) sendAudio { audio, mimetype, ptt: true }
// 4) sendMedia fallback...

  // 2) Áudio comum (tenta com ptt: true para alguns servidores)
  try {
    return await post('message/sendAudio', { ...base, audio: media, mimetype, ptt: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes(' 404 ') && !msg.includes(' 400 ')) throw e;
  }


  // 2) Áudio comum: sendAudio com campo "audio"
  try {
    return await post('message/sendAudio', { ...base, audio: media, mimetype });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes(' 404 ') && !msg.includes(' 400 ')) throw e;
  }

  // 3) Fallback genérico: sendMedia como documento (vai tocar como arquivo)
  return post('message/sendMedia', {
    ...base,
    media: media,          // aceita url OU base64
    mimetype,
    mediatype: 'document', // força ir como arquivo
    fileName: 'audio.ogg',
    caption: '',
  });
}

export async function evoSendAudioWithFallback(opts: {
  instanceId?: string | null;
  instanceName?: string | null;
  number: string;
  media: string;
  delayMs?: number;
  mime?: string;
}) {
  const { instanceId, instanceName, number, media, delayMs, mime } = opts;

  let lastErr: unknown;
  if (instanceId) {
    try {
      return await evoSendAudio(instanceId, number, media, delayMs, mime);
    } catch (e) {
      lastErr = e;
    }
  }
  if (instanceName) {
    try {
      return await evoSendAudio(instanceName, number, media, delayMs, mime);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('Sem identificador de instância (instanceId/instanceName).');
}
