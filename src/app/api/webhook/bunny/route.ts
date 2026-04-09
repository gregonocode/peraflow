// src/app/api/webhook/bunny/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

/** Mapa oficial de status do Bunny Stream */
const STATUS = {
  0: "QUEUED",
  1: "PROCESSING",
  2: "ENCODING",
  3: "FINISHED",
  4: "RESOLUTION_FINISHED",
  5: "FAILED",
  6: "PRESIGNED_UPLOAD_STARTED",
  7: "PRESIGNED_UPLOAD_FINISHED",
  8: "PRESIGNED_UPLOAD_FAILED",
  9: "CAPTIONS_GENERATED",
  10: "TITLE_OR_DESCRIPTION_GENERATED",
} as const;

type BunnyStatusCode = keyof typeof STATUS;

/** Payload esperado do Bunny Webhook */
interface BunnyWebhookBody {
  VideoLibraryId?: number;
  VideoGuid?: string;
  Status?: number;
}

/** Subconjunto da tabela `public.lives` usado aqui */
interface LiveRow {
  id: string;
  video_url: string | null;
  bunny_guid: string | null;
  bunny_status?: number | null;
  video_ready?: boolean;
  ready_at?: string | null;
  last_error?: string | null;
}

/** Campos atualizáveis por este webhook */
type LivePatch = Partial<
  Pick<LiveRow, "bunny_status" | "bunny_guid" | "video_ready" | "last_error" | "ready_at">
>;

const extractGuidFromUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const m = url.match(/vz-([a-f0-9-]+)/i);
  return m?.[1] ?? null;
};

export async function POST(req: Request) {
  try {
    // valida segredo via query string
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    if (!secret || secret !== process.env.BUNNY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as BunnyWebhookBody;
    const { VideoLibraryId, VideoGuid, Status } = body;

    if (!VideoLibraryId || !VideoGuid || typeof Status !== "number") {
      return NextResponse.json({ error: "bad payload" }, { status: 400 });
    }

    // tipagem segura para o nome do status
    const statusName: string =
      (Object.prototype.hasOwnProperty.call(STATUS, Status) &&
        STATUS[Status as BunnyStatusCode]) ||
      "UNKNOWN";

    // 1) procura live por bunny_guid
    const liveByGuidResp = await supabaseAdmin
      .from("lives")
      .select("id, video_url, bunny_guid")
      .eq("bunny_guid", VideoGuid)
      .limit(1)
      .maybeSingle();

    let live: LiveRow | null = (liveByGuidResp.data as LiveRow | null) ?? null;

    // 2) se não achar, tenta pelo GUID dentro de video_url
    if (!live) {
      const livesByUrlResp = await supabaseAdmin
        .from("lives")
        .select("id, video_url, bunny_guid")
        .ilike("video_url", `%${VideoGuid}%`)
        .limit(1);

      const livesArr = (livesByUrlResp.data as LiveRow[] | null) ?? [];
      live = livesArr[0] ?? null;
    }

    // 3) fallback extra: tentar extrair GUID da URL e comparar
    if (!live) {
      const altSearchResp = await supabaseAdmin
        .from("lives")
        .select("id, video_url, bunny_guid")
        .not("video_url", "is", null)
        .limit(20); // pequeno scan
      const arr = (altSearchResp.data as LiveRow[] | null) ?? [];
      live =
        arr.find((r) => extractGuidFromUrl(r.video_url) === VideoGuid || r.bunny_guid === VideoGuid) ??
        null;
    }

    if (!live) {
      console.warn("[bunny-webhook] Live não encontrada para GUID", {
        guid: VideoGuid,
        status: Status,
        statusName,
      });
      return NextResponse.json({ ok: true, note: "live not found for guid" });
    }

    // monta patch estritamente tipado
    const patch: LivePatch = {
      bunny_status: Status,
      bunny_guid: VideoGuid,
      last_error: null,
    };

    if (Status === 3 || Status === 4) {
      patch.video_ready = true;
      patch.ready_at = new Date().toISOString();
    } else if (Status === 5 || Status === 8) {
      patch.video_ready = false;
      patch.last_error = `Bunny status=${Status} (${statusName})`;
    }

    const upResp = await supabaseAdmin.from("lives").update(patch).eq("id", live.id);
    if (upResp.error) {
      console.error("[bunny-webhook] erro ao atualizar live:", upResp.error);
      return NextResponse.json({ error: "db update failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[bunny-webhook] error", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
