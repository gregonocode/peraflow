import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com a service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVOLUTION_API = process.env.EVOLUTION_API_URL || 'http://209.126.6.223:8080';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY!;

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
    const { nome, integration = 'WHATSAPP-BAILEYS' } = await req.json();

    logDebug('API_REQUEST', 'Body recebido', { nome, integration });

    // Validação do corpo da requisição
    if (!nome) {
      logDebug('VALIDATION_ERROR', 'Nome não fornecido');
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    if (integration !== 'WHATSAPP-BAILEYS') {
      logDebug('VALIDATION_ERROR', 'Integração inválida', { integration });
      return NextResponse.json(
        { error: 'Integração inválida. Use WHATSAPP-BAILEYS' },
        { status: 400 }
      );
    }

    // Obter o token JWT do header Authorization (opcional)
    let user_id = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      logDebug('AUTH', 'Token extraído', { token: token.slice(0, 10) + '...' });

      // Obter o user_id do Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user?.id) {
        logDebug('AUTH_ERROR', 'Falha ao obter usuário', { error: authError?.message });
      } else {
        user_id = user.id;
        logDebug('AUTH', 'Usuário autenticado', { user_id });
      }
    } else {
      logDebug('AUTH', 'Nenhum token de autenticação fornecido, usando user_id nulo');
    }

    // Criar sessão na Evolution API
    const evoRes = await fetch(`${EVOLUTION_API}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_KEY,
      },
      body: JSON.stringify({
        instanceName: nome,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true, // Ativa QR code na criação
        deviceName: 'wslAuto', // Define o nome do dispositivo
      }),
    });

    const evoData = await evoRes.json();
    logDebug('EVOLUTION_API_RESPONSE', 'Resposta da Evolution API', {
      status: evoRes.status,
      data: evoData,
    });

    // Verificar se a requisição foi bem-sucedida
    if (!evoRes.ok) {
      const errorMsg = evoData.message || evoData.error || 'Erro ao criar instância';
      logDebug('EVOLUTION_API_ERROR', 'Erro ao criar instância', { data: evoData });
      return NextResponse.json(
        { error: errorMsg, details: evoData },
        { status: evoRes.status || 500 }
      );
    }

    logDebug('EVOLUTION_API_SUCCESS', 'Instância criada com sucesso na Evolution API', { status: evoRes.status });

    // Extrair o token_sessao (instanceId)
    const token_sessao = evoData.instance?.instanceId;
    if (!token_sessao) {
      logDebug('EVOLUTION_API_ERROR', 'Token de sessão (instanceId) não retornado', { data: evoData });
      return NextResponse.json(
        { error: 'Token de sessão não retornado pela API' },
        { status: 500 }
      );
    }

    // Extrair o hash
    const hash = evoData.hash;
    if (!hash) {
      logDebug('EVOLUTION_API_ERROR', 'Hash da instância não retornado', { data: evoData });
      return NextResponse.json(
        { error: 'Hash da instância não retornado pela API' },
        { status: 500 }
      );
    }

    // Extrair o QR code
    const qrcode = evoData.qrcode?.base64;
    if (!qrcode) {
      logDebug('EVOLUTION_API_ERROR', 'QR code não retornado', { data: evoData });
      return NextResponse.json(
        { error: 'QR code não retornado pela API' },
        { status: 500 }
      );
    }

    logDebug('EVOLUTION_API', 'Token de sessão, hash e QR code extraídos', {
      token_sessao,
      hash: hash.slice(0, 10) + '...',
      qrcode: qrcode.slice(0, 30) + '...'
    });

    // Configurar o webhook automaticamente
    const webhookUrl = 'https://workshoplive.vercel.app/api/webhook/evolution';
    const webhookRes = await fetch(`${EVOLUTION_API}/webhook/set/${nome}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_KEY,
      },
      body: JSON.stringify({
        
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhook_by_events: true,
          headers: {
              apikey: hash // 🔑 envia o hash da instância para autenticação
            },
          events: [
            'QRCODE_UPDATED',        // atualizar qrcode no painel
            'CONNECTION_UPDATE',     // status e (às vezes) número
            'STATUS_INSTANCE',       // status da instância
            'APPLICATION_STARTUP',   // startup -> status inicial
            'MESSAGES_UPSERT',       // ⚠️ necessário pra disparar fluxo no 1º IN

          // 👇 “da instância” (úteis pra auditoria/limpeza)
            'INSTANCE_CREATE',
            'INSTANCE_DELETE',
            'LOGOUT_INSTANCE',
            'REMOVE_INSTANCE',
          ]
        }
      }),
    });

    const webhookData = await webhookRes.json();
    logDebug('WEBHOOK_CONFIG', 'Resposta da configuração do webhook', {
      status: webhookRes.status,
      data: webhookData,
    });

    // Verificar se o webhook foi configurado com sucesso
    if (!webhookRes.ok) {
      logDebug('WEBHOOK_ERROR', 'Erro ao configurar webhook', { data: webhookData });
      return NextResponse.json(
        { error: 'Erro ao configurar webhook', details: webhookData },
        { status: webhookRes.status || 500 }
      );
    }

    logDebug('WEBHOOK_SUCCESS', 'Webhook configurado com sucesso', { webhookUrl });

    // Salvar no Supabase
    const { error: dbError, data: dbData } = await supabase
      .from('whatsapp_conexoes')
      .insert([
        {
          nome,
          user_id,
          status: 'pending',
          data_conexao: new Date().toISOString(),
          token_sessao,
          hash,
          qrcode,
        },
      ])
      .select()
      .single();

    if (dbError) {
      logDebug('SUPABASE_ERROR', 'Erro ao salvar na tabela whatsapp_conexoes', { error: dbError });
      return NextResponse.json(
        { error: 'Erro ao salvar no Supabase', details: dbError },
        { status: 500 }
      );
    }

    logDebug('SUPABASE', 'Conexão salva com sucesso na tabela whatsapp_conexoes', {
      nome,
      user_id,
      token_sessao,
      hash: hash.slice(0, 10) + '...',
      qrcode: qrcode.slice(0, 30) + '...',
      status: 'pending',
      data_conexao: dbData.data_conexao,
    });

    // Retorno bem-sucedido
    return NextResponse.json({
      message: 'Instância criada com sucesso',
      instance: {
        token_sessao,
        nome,
        user_id,
        status: dbData.status,
        data_conexao: dbData.data_conexao,
        qrcode,
      },
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
