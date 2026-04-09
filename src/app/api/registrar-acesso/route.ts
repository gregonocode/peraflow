import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!, // Use SUPABASE_URL (não público)
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Chave de serviço para ignorar RLS
);

export async function POST(req: NextRequest) {
  try {
    const { live_id } = await req.json();

    if (!live_id) {
      console.error('Erro: live_id ausente na requisição');
      return NextResponse.json({ error: 'ID da live ausente' }, { status: 400 });
    }

    // Validar se o live_id existe na tabela lives
    const { data: liveExists, error: liveError } = await supabase
      .from('lives')
      .select('id')
      .eq('id', live_id)
      .single();

    if (liveError || !liveExists) {
      console.error('Erro: live_id não encontrado:', liveError?.message || 'Live não existe');
      return NextResponse.json({ error: 'Live ID inválido' }, { status: 400 });
    }

    // Inserir o acesso
    const { error: insertError } = await supabase.from('live_accesses').insert({
      live_id,
      accessed_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Erro ao registrar acesso:', insertError.message, insertError.details);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log('Acesso registrado com sucesso:', { live_id });
    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('Exceção ao registrar acesso:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}