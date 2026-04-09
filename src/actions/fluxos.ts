// src/actions/fluxos.ts
"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { randomUUID } from "crypto";

type Position = { x: number; y: number };

export type FluxNodeInput = {
  id: string; // id do React Flow (ex.: "text-...", "start")
  type: "text" | "audio" | "image" | "next_flow" | "wait" | "mensagem_notificada"| "aguarde_resposta" | "agendar_mensagem";
  conteudo: Record<string, unknown>;
  ordem: number;
  position: Position; // 👈 agora obrigatório
};

export type FluxEdgeInput = {
  id: string;      // id do React Flow
  source: string;  // id (front) do nó origem
  target: string;  // id (front) do nó destino
  data?: EdgeData; // guarda, por ex., edge.data.dbId e frontId
};

type EdgeData = Record<string, unknown> & {
  dbId?: string;
  db_id?: string;
  frontId?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TipoDb =
  | "mensagem_texto"
  | "mensagem_audio"
  | "mensagem_imagem"
  | "next_flow"
  | "mensagem_espera"
  | "mensagem_notificada" // 👈 novo
  | "aguarde_resposta" | "agendar_mensagem";

const MAP_TIPO_DB: Record<FluxNodeInput["type"], TipoDb> = {
  text: "mensagem_texto",
  audio: "mensagem_audio",
  image: "mensagem_imagem",
  next_flow: "next_flow",
  wait: "mensagem_espera",
  mensagem_notificada: "mensagem_notificada",
  aguarde_resposta: "aguarde_resposta",
  agendar_mensagem: "agendar_mensagem",
}as const satisfies Record<FluxNodeInput["type"], TipoDb>;

// --------- Helpers extra p/ storage cleanup ---------

/** Extrai {bucket, path} do Storage a partir de uma URL pública da rota /object/public/<bucket>/<path> */
function inferStorageFromPublicUrl(
  url?: unknown
): { bucket: "audios" | "imagens"; path: string } | null {
  if (typeof url !== "string") return null;
  // aceita *.supabase.co e domínios custom
  const re = /\/object\/public\/(audios|imagens)\/(.+)$/i;
  const m = re.exec(url);
  if (!m) return null;
  const bucket = m[1].toLowerCase() as "audios" | "imagens";
  let path = m[2];
  try {
    path = decodeURIComponent(path);
  } catch {
    // mantém como veio
  }
  return { bucket, path };
}

/** Lê do conteudo o melhor storage info ({bucket, path}) possível */
function getStorageInfoFromConteudo(
  conteudo?: Record<string, unknown>
): { bucket: "audios" | "imagens"; path: string } | null {
  if (!conteudo) return null;

  // Se vier explicitamente:
  const sp = conteudo["storage_path"];
  const sb = conteudo["storage_bucket"];
  if (typeof sp === "string" && sp.trim()) {
    if (sb === "audios" || sb === "imagens") {
      return { bucket: sb, path: sp.trim() };
    }
  }

  // Caso contrário, tenta inferir pela URL pública
  const url = conteudo["url"];
  const inferred = inferStorageFromPublicUrl(url);
  if (inferred) return inferred;

  // Sem info
  return null;
}

/** Versão compatível com código legado que só pegava o path (usada em várias partes) */
function getStoragePathFromConteudo(conteudo?: Record<string, unknown>): string | null {
  const info = getStorageInfoFromConteudo(conteudo);
  return info?.path ?? null;
}

// Garantir que position sempre tem números válidos
function sanitizePosition(pos: unknown): Position {
  if (typeof pos === "object" && pos !== null) {
    const maybePos = pos as Partial<Position>;
    const x = Number(maybePos.x);
    const y = Number(maybePos.y);
    return {
      x: Number.isFinite(x) ? x : 250,
      y: Number.isFinite(y) ? y : 200,
    };
  }
  return { x: 250, y: 200 };
}

/** Detecta e quebra data URL em { mime, dataBase64 } */
function parseDataUrl(dataUrl?: unknown): { mime: string; dataBase64: string } | null {
  if (typeof dataUrl !== "string") return null;
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  return { mime: match[1], dataBase64: match[2] };
}

/** Tenta extrair payload de áudio do conteudo de diferentes formatos */
function extractAudioPayload(
  rawConteudo: Record<string, unknown>
): { base64?: string; mime?: string; name?: string; size?: number; url?: string } {
  const c = rawConteudo ?? {};
  const audioObj = (c.audio ?? {}) as Record<string, unknown>;

  const url =
    (typeof c.url === "string" && c.url) ||
    (typeof audioObj.url === "string" && audioObj.url) ||
    undefined;

  const embeddedDataUrl =
    (typeof (c.base64 as unknown) === "string" && (c.base64 as string)) ||
    (typeof (audioObj.audio as unknown) === "string" && (audioObj.audio as string)) ||
    undefined;

  const mime =
    (typeof c.mime === "string" && c.mime) ||
    (typeof audioObj.mime === "string" && audioObj.mime) ||
    undefined;

  const name =
    (typeof c.name === "string" && c.name) ||
    (typeof audioObj.name === "string" && audioObj.name) ||
    undefined;

  const size =
    (typeof c.size === "number" && c.size) ||
    (typeof audioObj.size === "number" && audioObj.size) ||
    undefined;

  return { base64: embeddedDataUrl, mime, name, size, url };
}

/** Gera um caminho padronizado para o arquivo de áudio no bucket */
function buildAudioPath(params: {
  userId: string;
  fluxoId: string;
  originalName?: string;
  mime?: string;
}): string {
  const { userId, fluxoId, originalName, mime } = params;
  const safeName =
    (originalName?.replace(/[^\w.\-]+/g, "_") || "audio") + "";
  const extByMime: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
  };
  const extFromMime = mime && extByMime[mime.toLowerCase()] ? extByMime[mime.toLowerCase()] : undefined;
  const extFromName = safeName.includes(".") ? safeName.split(".").pop() : undefined;
  const ext = (extFromName || extFromMime || "ogg").toLowerCase();

  return `${userId}/${fluxoId}/${randomUUID()}.${ext}`;
}

/** Sobe o áudio (se vier como base64/dataURL) e retorna conteudo normalizado com URL pública + storage_path */
async function normalizeAudioConteudo(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  userId: string,
  fluxoId: string,
  rawConteudo: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const payload = extractAudioPayload(rawConteudo);

  // Se já tiver URL, apenas mantém; se possível, preenchendo storage_path/bucket
  if (payload.url) {
    const inferred = getStorageInfoFromConteudo(rawConteudo as Record<string, unknown>);
    return {
      ...rawConteudo,
      url: payload.url,
      storage_path: inferred?.path ?? (rawConteudo["storage_path"] as string | undefined),
      storage_bucket: inferred?.bucket ?? (rawConteudo["storage_bucket"] as string | undefined) ?? "audios",
      mime: payload.mime ?? rawConteudo["mime"],
      name: payload.name ?? rawConteudo["name"],
      size: payload.size ?? rawConteudo["size"],
      base64: undefined,
      audio: undefined,
    };
  }

  // Se veio base64/data URL → faz upload
  if (payload.base64) {
    const parsed = parseDataUrl(payload.base64);
    if (!parsed) {
      throw new Error("Formato de áudio inválido (esperado data URL base64).");
    }

    // limite de ~16MB
    const buffer = Buffer.from(parsed.dataBase64, "base64");
    const maxBytes = 16 * 1024 * 1024;
    if (buffer.byteLength > maxBytes) {
      throw new Error("Arquivo de áudio excede o limite de 16MB.");
    }

    const path = buildAudioPath({
      userId,
      fluxoId,
      originalName: payload.name,
      mime: payload.mime || parsed.mime,
    });

    const { error: upErr } = await supabase.storage
      .from("audios")
      .upload(path, buffer, { contentType: parsed.mime, upsert: true });

    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from("audios").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    return {
      ...rawConteudo,
      url: publicUrl,
      storage_path: path,
      storage_bucket: "audios",
      mime: payload.mime || parsed.mime,
      name: payload.name || undefined,
      size: payload.size || buffer.byteLength,
      base64: undefined,
      audio: undefined,
    };
  }

  // Se não tem nem url nem base64, retorna como veio
  return rawConteudo;
}

/** Tenta extrair payload de imagem do conteudo (URL ou dataURL base64) */
/** Tenta extrair payload de imagem do conteudo (URL ou dataURL base64) */
/** Tenta extrair payload de imagem do conteudo (URL ou dataURL base64) */
function extractImagePayload(
  rawConteudo: Record<string, unknown>
): { base64?: string; mime?: string; name?: string; size?: number; url?: string } {
  const c = rawConteudo ?? {};
  const imageObj =
    typeof c.image === "object" && c.image !== null
      ? (c.image as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  // helpers sem usar `any`
  const pickString = (obj: Record<string, unknown>, key: string): string | undefined => {
    const v = obj[key];
    return typeof v === "string" ? v : undefined;
  };
  const pickNumber = (obj: Record<string, unknown>, key: string): number | undefined => {
    const v = obj[key];
    return typeof v === "number" ? v : undefined;
  };

  const url = pickString(c, "url") ?? pickString(imageObj, "url");

  // aceita: c.base64, image.base64, c.data, image.data, image.image
  const embeddedDataUrl =
    pickString(c, "base64") ??
    pickString(imageObj, "base64") ??
    pickString(c, "data") ??
    pickString(imageObj, "data") ??
    pickString(imageObj, "image");

  const mime = pickString(c, "mime") ?? pickString(imageObj, "mime");
  const name = pickString(c, "name") ?? pickString(imageObj, "name");
  const size = pickNumber(c, "size") ?? pickNumber(imageObj, "size");

  return { base64: embeddedDataUrl, mime, name, size, url };
}


/** Gera um caminho padronizado para o arquivo de imagem no bucket */
function buildImagePath(params: {
  userId: string;
  fluxoId: string;
  originalName?: string;
  mime?: string;
}): string {
  const { userId, fluxoId, originalName, mime } = params;
  const safeName = (originalName?.replace(/[^\w.\-]+/g, "_") || "imagem") + "";
  const extByMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
  };
  const extFromMime = mime && extByMime[mime.toLowerCase()] ? extByMime[mime.toLowerCase()] : undefined;
  const extFromName = safeName.includes(".") ? safeName.split(".").pop() : undefined;
  const ext = (extFromName || extFromMime || "jpg").toLowerCase();

  return `${userId}/${fluxoId}/${randomUUID()}.${ext}`;
}

/** Sobe a imagem (se vier como base64/dataURL) e retorna conteudo normalizado com URL pública + storage_path */
async function normalizeImageConteudo(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  userId: string,
  fluxoId: string,
  rawConteudo: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const payload = extractImagePayload(rawConteudo);

  // Se já tiver URL, apenas mantém; se possível, preenchendo storage_path/bucket
  if (payload.url) {
    const inferred = getStorageInfoFromConteudo(rawConteudo as Record<string, unknown>);
    return {
      ...rawConteudo,
      url: payload.url,
      storage_path: inferred?.path ?? (rawConteudo["storage_path"] as string | undefined),
      storage_bucket: inferred?.bucket ?? (rawConteudo["storage_bucket"] as string | undefined) ?? "imagens",
      mime: payload.mime ?? rawConteudo["mime"],
      name: payload.name ?? rawConteudo["name"],
      size: payload.size ?? rawConteudo["size"],
      base64: undefined,
      image: undefined,
    };
  }

  // Se veio base64/data URL → faz upload
  if (payload.base64) {
    const parsed = parseDataUrl(payload.base64);
    if (!parsed) throw new Error("Formato de imagem inválido (esperado data URL base64).");

    // valida mime
    const accept = new Set(["image/jpeg", "image/png"]);
    if (!accept.has(parsed.mime.toLowerCase())) {
      throw new Error("Apenas imagens JPEG ou PNG são suportadas.");
    }

    // limite ~16MB
    const buffer = Buffer.from(parsed.dataBase64, "base64");
    const maxBytes = 16 * 1024 * 1024;
    if (buffer.byteLength > maxBytes) {
      throw new Error("Arquivo de imagem excede o limite de 16MB.");
    }

    const path = buildImagePath({
      userId,
      fluxoId,
      originalName: payload.name,
      mime: payload.mime || parsed.mime,
    });

    const { error: upErr } = await supabase.storage
      .from("imagens")
      .upload(path, buffer, { contentType: parsed.mime, upsert: true });

    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from("imagens").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    return {
      ...rawConteudo,
      url: publicUrl,
      storage_path: path,
      storage_bucket: "imagens",
      mime: payload.mime || parsed.mime,
      name: payload.name || undefined,
      size: payload.size || buffer.byteLength,
      base64: undefined,
      image: undefined,
    };
  }

  // Se não tem nem url nem base64, retorna como veio
  return rawConteudo;
}

export async function save_fluxo_completo({
  fluxoId,
  nodes,
  edges,
}: {
  fluxoId: string;
  nodes: FluxNodeInput[];
  edges: FluxEdgeInput[];
}) {
  const supabase = await supabaseServer();

  const fluxoIdTrim = fluxoId?.trim();
  if (!UUID_RE.test(fluxoIdTrim)) throw new Error("ID do fluxo inválido");

  // auth
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Usuário não autenticado");
  if (fluxoIdTrim === user.id) {
    throw new Error("Você passou o user_id no lugar do fluxo.id na URL");
  }

  // dono do fluxo
  const { data: fluxo, error: fluxoError } = await supabase
    .from("fluxos")
    .select("id, user_id")
    .eq("id", fluxoIdTrim)
    .maybeSingle();
  if (fluxoError) throw fluxoError;
  if (!fluxo) throw new Error("Fluxo não encontrado");
  if (fluxo.user_id !== user.id) throw new Error("Sem permissão");

  // ---- Snapshot anterior de nós de áudio/imagem (para detectar substituições/remoções) ----
  const { data: prevNodesAll } = await supabase
    .from("fluxo_nos")
    .select("id, tipo, conteudo")
    .eq("fluxo_id", fluxoIdTrim);

  const prevAudioPathById = new Map<string, string>();  // id -> path
  const prevImagePathById = new Map<string, string>();  // id -> path
  if (prevNodesAll?.length) {
    for (const r of prevNodesAll) {
      const path = getStoragePathFromConteudo(r.conteudo as Record<string, unknown>);
      if (!path) continue;
      if (r?.tipo === "mensagem_audio") prevAudioPathById.set(r.id, path);
      if (r?.tipo === "mensagem_imagem") prevImagePathById.set(r.id, path);
    }
  }

  // --------- NÓS: preparar upsert ---------
function isPersistedType(
  t: FluxNodeInput["type"]
): t is "text" | "audio" | "image" | "next_flow" | "wait" | "mensagem_notificada"| "aguarde_resposta" | "agendar_mensagem" {
  return (
    t === "text" ||
    t === "audio" ||
    t === "image" ||
    t === "next_flow" ||
    t === "wait" ||
    t === "mensagem_notificada" ||
    t === "aguarde_resposta" ||
    t === "agendar_mensagem"
  );
}


  const frontNodes = nodes.filter((n) => n.id !== "start" && isPersistedType(n.type));

  const nodeDbIdByFrontId: Record<string, string> = {};
  const upsertNodeRows = await Promise.all(
    frontNodes.map(async (n, idx) => {
      const dbIdFromFront =
        (n.conteudo as Record<string, unknown>)?.dbId ??
        (n as unknown as { data?: EdgeData })?.data?.dbId ??
        undefined;

      const dbId =
        typeof dbIdFromFront === "string" && UUID_RE.test(dbIdFromFront)
          ? dbIdFromFront
          : randomUUID();

      nodeDbIdByFrontId[n.id] = dbId;

      let conteudo = { ...(n.conteudo ?? ({} as Record<string, unknown>)) };
      if (n.type === "audio") {
        conteudo = await normalizeAudioConteudo(supabase, user.id, fluxoIdTrim, conteudo);
      } else if (n.type === "image") {
        conteudo = await normalizeImageConteudo(supabase, user.id, fluxoIdTrim, conteudo);
      }

      return {
        id: dbId,
        fluxo_id: fluxoIdTrim,
        tipo: MAP_TIPO_DB[n.type],
        conteudo: {
          ...conteudo,
          frontId: n.id,
        },
        ordem: typeof n.ordem === "number" ? n.ordem : idx,
        position: sanitizePosition(n.position),
      };
    })
  );

  // ---- Upsert nós ----
  if (upsertNodeRows.length) {
    const upsertNodes = await supabase
      .from("fluxo_nos")
      .upsert(upsertNodeRows, { onConflict: "id" })
      .select("id");
    if (upsertNodes.error) throw upsertNodes.error;
  } else {
    // Fluxo ficou vazio → limpar edges, nós e arquivos de áudio/imagem do fluxo
    // 1) coletar paths antes de apagar
    const audioPathsToRemove: string[] = [];
    const imagePathsToRemove: string[] = [];
    if (prevNodesAll?.length) {
      for (const r of prevNodesAll) {
        const p = getStoragePathFromConteudo(r.conteudo as Record<string, unknown>);
        if (!p) continue;
        if (r?.tipo === "mensagem_audio") audioPathsToRemove.push(p);
        if (r?.tipo === "mensagem_imagem") imagePathsToRemove.push(p);
      }
    }

    await supabase.from("fluxo_edge").delete().eq("fluxo_id", fluxoIdTrim);
    await supabase.from("fluxo_nos").delete().eq("fluxo_id", fluxoIdTrim);

    if (audioPathsToRemove.length) {
      const uniq = Array.from(new Set(audioPathsToRemove));
      await supabase.storage.from("audios").remove(uniq);
    }
    if (imagePathsToRemove.length) {
      const uniqI = Array.from(new Set(imagePathsToRemove));
      await supabase.storage.from("imagens").remove(uniqI);
    }

    return {
      success: true,
      fluxoId: fluxoIdTrim,
      nodesMapping: [],
      edgesMapping: [],
    };
  }

  // ---- Nós existentes (após upsert) para saber quem sobrou/remover ----
  const { data: existingNodes } = await supabase
    .from("fluxo_nos")
    .select("id, tipo, conteudo")
    .eq("fluxo_id", fluxoIdTrim);

  const keepNodeIds = new Set(Object.values(nodeDbIdByFrontId));
  const toDeleteNodeIds =
    existingNodes
      ?.map((r) => r.id)
      .filter((id) => !keepNodeIds.has(id)) ?? [];

  // ⬇️ ADICIONE ISTO AQUI (mantido como no seu snippet)
  if (toDeleteNodeIds.length) {
    // 1) apaga edges que referenciam nós removidos
    await supabase
      .from("fluxo_edge")
      .delete()
      .eq("fluxo_id", fluxoIdTrim)
      .in("source", toDeleteNodeIds);

    await supabase
      .from("fluxo_edge")
      .delete()
      .eq("fluxo_id", fluxoIdTrim)
      .in("target", toDeleteNodeIds);

    // 2) apaga os nós
    await supabase
      .from("fluxo_nos")
      .delete()
      .eq("fluxo_id", fluxoIdTrim)
      .in("id", toDeleteNodeIds);
  }

  // --------- EDGES: preparar upsert ---------
  const frontEdges = edges.filter(
    (e) =>
      e?.source &&
      e?.target &&
      e.source !== e.target &&
      e.source !== "start" &&
      e.target !== "start"
  );

  const upsertEdgeRows = frontEdges
    .map((e) => {
      const sourceDbId = nodeDbIdByFrontId[e.source];
      const targetDbId = nodeDbIdByFrontId[e.target];
      if (!sourceDbId || !targetDbId) return null;

      const dbIdFromFront = e.data?.dbId ?? e.data?.db_id ?? undefined;

      const edgeDbId =
        typeof dbIdFromFront === "string" && UUID_RE.test(dbIdFromFront)
          ? dbIdFromFront
          : randomUUID();

      return {
        id: edgeDbId,
        fluxo_id: fluxoIdTrim,
        source: sourceDbId,
        target: targetDbId,
        data: {
          ...(e.data ?? {}),
          frontId: e.id,
        },
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      fluxo_id: string;
      source: string;
      target: string;
      data: EdgeData;
    }>;

  if (upsertEdgeRows.length) {
    const upsertEdges = await supabase
      .from("fluxo_edge")
      .upsert(upsertEdgeRows, { onConflict: "id" })
      .select("id");
    if (upsertEdges.error) throw upsertEdges.error;
  } else {
    await supabase.from("fluxo_edge").delete().eq("fluxo_id", fluxoIdTrim);
  }

  const { data: existingEdges } = await supabase
    .from("fluxo_edge")
    .select("id")
    .eq("fluxo_id", fluxoIdTrim);

  const keepEdgeIds = new Set(upsertEdgeRows.map((r) => r.id));
  const toDeleteEdgeIds =
    existingEdges?.map((r) => r.id).filter((id) => !keepEdgeIds.has(id)) ?? [];

  if (toDeleteEdgeIds.length) {
    await supabase.from("fluxo_edge").delete().eq("fluxo_id", fluxoIdTrim).in("id", toDeleteEdgeIds);
  }

  // --------- LIMPEZA DE STORAGE ----------
  // A) Nós removidos: deletar áudios/imagens correspondentes
  const audioPathsFromDeletedNodes: string[] = [];
  const imagePathsFromDeletedNodes: string[] = [];
  if (toDeleteNodeIds.length && existingNodes?.length) {
    for (const r of existingNodes) {
      if (!toDeleteNodeIds.includes(r.id)) continue;
      const p = getStoragePathFromConteudo(r.conteudo as Record<string, unknown>);
      if (!p) continue;
      if (r.tipo === "mensagem_audio") audioPathsFromDeletedNodes.push(p);
      if (r.tipo === "mensagem_imagem") imagePathsFromDeletedNodes.push(p);
    }
  }

  // B) Nós mantidos, mas com arquivo trocado: deletar arquivos antigos
  //    1) coleciona os paths "atuais" dos nós de áudio/imagem upsertados
  const currentAudioPaths = new Set<string>();
  const currentImagePaths = new Set<string>();
  const currentAudioPathsById = new Map<string, string>(); // node.id -> path
  const currentImagePathsById = new Map<string, string>(); // node.id -> path
  for (const row of upsertNodeRows) {
    if (row.tipo === "mensagem_audio") {
      const p = getStoragePathFromConteudo(row.conteudo as Record<string, unknown>);
      if (p) {
        currentAudioPaths.add(p);
        currentAudioPathsById.set(row.id, p);
      }
    }
    if (row.tipo === "mensagem_imagem") {
      const p = getStoragePathFromConteudo(row.conteudo as Record<string, unknown>);
      if (p) {
        currentImagePaths.add(p);
        currentImagePathsById.set(row.id, p);
      }
    }
  }

  //    2) compara com snapshot anterior para detectar substituições
  const audioPathsReplaced: string[] = [];
  for (const [nodeId, oldPath] of prevAudioPathById.entries()) {
    const newPath = currentAudioPathsById.get(nodeId) || null;
    if (oldPath && newPath && oldPath !== newPath) {
      if (!currentAudioPaths.has(oldPath)) audioPathsReplaced.push(oldPath);
    }
    if (oldPath && !newPath) {
      if (!currentAudioPaths.has(oldPath)) audioPathsReplaced.push(oldPath);
    }
  }

  const imagePathsReplaced: string[] = [];
  for (const [nodeId, oldPath] of prevImagePathById.entries()) {
    const newPath = currentImagePathsById.get(nodeId) || null;
    if (oldPath && newPath && oldPath !== newPath) {
      if (!currentImagePaths.has(oldPath)) imagePathsReplaced.push(oldPath);
    }
    if (oldPath && !newPath) {
      if (!currentImagePaths.has(oldPath)) imagePathsReplaced.push(oldPath);
    }
  }

  // Unifica os paths a remover e garante unicidade, por bucket
  const audioPathsToRemove = Array.from(
    new Set([...audioPathsFromDeletedNodes, ...audioPathsReplaced])
  ).filter(Boolean);

  const imagePathsToRemove = Array.from(
    new Set([...imagePathsFromDeletedNodes, ...imagePathsReplaced])
  ).filter(Boolean);

  if (audioPathsToRemove.length) {
    await supabase.storage.from("audios").remove(audioPathsToRemove);
  }
  if (imagePathsToRemove.length) {
    await supabase.storage.from("imagens").remove(imagePathsToRemove);
  }

  // --------- Mapeamentos p/ o front ----------
  const nodesMapping = Object.entries(nodeDbIdByFrontId).map(
    ([clientId, dbId]) => ({ clientId, dbId })
  );

  const edgesMapping = upsertEdgeRows.map((r) => ({
    clientId: r.data?.frontId ?? "",
    dbId: r.id,
  }));

  return {
    success: true,
    fluxoId: fluxoIdTrim,
    nodesMapping,
    edgesMapping,
  };
}
