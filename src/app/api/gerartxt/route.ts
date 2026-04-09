import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Função para parsear o conteúdo do arquivo .txt
function parseTxtFile(content: string) {
  const linhas = content.split('\n').filter(l => l.trim() !== '');
  return linhas.map((linha) => {
    const [tempoBruto, resto] = linha.split(' - ');
    const [nome, ...msgParts] = resto.split(':');
    const mensagem = msgParts.join(':').trim();

    const [hh, mm, ss] = tempoBruto.split(':').map(Number);
    const tempoSegundos = hh * 3600 + mm * 60 + ss;

    return {
      tempo: tempoSegundos,
      user_live: nome.trim(),
      comentario: mensagem,
    };
  });
}

export async function POST(request: Request) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => (await cookieStore).getAll(),
        setAll: async (cookies) => {
          for (const { name, value, options } of cookies) {
            const resolvedCookies = await cookieStore;
            resolvedCookies.set({ name, value, ...options });
          }
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const live_id = formData.get('live_id') as string;

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  if (!live_id) {
    return NextResponse.json({ error: 'ID da live não fornecido.' }, { status: 400 });
  }

  const content = await file.text();
  const dados = parseTxtFile(content);

  // Preparar os dados para inserção no Supabase
  const dataToInsert = dados.map((interacao) => ({
    live_id,
    user_live: interacao.user_live,
    comentario: interacao.comentario,
    tempo: interacao.tempo,
    created_at: new Date().toISOString(),
  }));

  // Inserir os dados na tabela 'interacoes'
  const { data, error } = await supabase
    .from('interacoes')
    .insert(dataToInsert)
    .select();

  if (error) {
    return NextResponse.json(
      { error: `Erro ao salvar interações: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: 'Interações salvas com sucesso.',
    content: data,
  });
}