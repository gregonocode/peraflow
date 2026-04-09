import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Função auxiliar para formatar logs
const logDebug = (category: string, message: string, data?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] [${category}] ${message}`,
      data ? JSON.stringify(data, null, 2) : ''
    );
  }
};

export async function POST(req: Request) {
  try {
    const { instanceName } = await req.json();

    logDebug('API_REQUEST', 'Body recebido', { instanceName });

    if (!instanceName) {
      logDebug('VALIDATION_ERROR', 'instanceName não fornecido');
      return NextResponse.json(
        { error: 'instanceName é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar o QR code no Supabase
    const { data: connectionData, error: dbError } = await supabase
      .from('whatsapp_conexoes')
      .select('qrcode')
      .eq('token_sessao', instanceName)
      .single();

    if (dbError || !connectionData?.qrcode) {
      logDebug('SUPABASE_ERROR', 'QR code não encontrado', { error: dbError, instanceName });
      return NextResponse.json(
        { error: 'QR code não encontrado' },
        { status: 404 }
      );
    }

    logDebug('SUPABASE', 'QR code encontrado', { qrcode: connectionData.qrcode.slice(0, 30) + '...', instanceName });

    return NextResponse.json({
      qrCode: connectionData.qrcode,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logDebug('ERROR', 'Erro inesperado no servidor', { error: errorMessage });
    return NextResponse.json(
      { error: 'Erro inesperado', details: errorMessage },
      { status: 500 }
    );
  }
}