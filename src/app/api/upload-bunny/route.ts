import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const BUNNY_API_KEY = process.env.BUNNY_API_KEY as string;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID as string;

interface BunnyApiResponse {
  success: boolean;
  message: string;
  guid?: string;
  tusEndpoint?: string;
  signature?: string;
  expire?: number;
  libraryId?: string;
  videoUrl?: string;
  details?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<BunnyApiResponse>> {
  try {
    const body = await req.json();
    const title = body.titulo;

    if (!title) {
      return NextResponse.json(
        { success: false, message: 'Título é obrigatório' },
        { status: 400 }
      );
    }

    // Criar vídeo no Bunny
    const createRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: 'POST',
        headers: {
          AccessKey: BUNNY_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!createRes.ok) {
      const details = await createRes.text();
      return NextResponse.json(
        { success: false, message: 'Falha ao criar vídeo', details },
        { status: createRes.status }
      );
    }

    const { guid } = await createRes.json();

    // Assinatura para upload via TUS
    const expire = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    const toSign = `${BUNNY_LIBRARY_ID}${BUNNY_API_KEY}${expire}${guid}`;
    const signature = crypto.createHash('sha256').update(toSign).digest('hex');

    const videoUrl = `https://vz-${guid}.b-cdn.net`;

    return NextResponse.json({
      success: true,
      message: 'Pronto para upload via TUS',
      tusEndpoint: 'https://video.bunnycdn.com/tusupload',
      signature,
      expire,
      libraryId: BUNNY_LIBRARY_ID,
      guid,
      videoUrl,
    });
  } catch (error) {
    console.error('Erro inesperado no handler POST:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erro interno',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse<BunnyApiResponse>> {
  try {
    const body = await req.json();
    const guid = body.guid;

    if (!guid) {
      return NextResponse.json(
        { success: false, message: 'GUID é obrigatório' },
        { status: 400 }
      );
    }

    // Excluir vídeo no Bunny
    const deleteRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${guid}`,
      {
        method: 'DELETE',
        headers: {
          AccessKey: BUNNY_API_KEY,
          Accept: 'application/json',
        },
      }
    );

    if (!deleteRes.ok) {
      const details = await deleteRes.text();
      return NextResponse.json(
        { success: false, message: 'Falha ao excluir vídeo', details },
        { status: deleteRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vídeo excluído com sucesso',
    });
  } catch (error) {
    console.error('Erro inesperado no handler DELETE:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erro interno',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}