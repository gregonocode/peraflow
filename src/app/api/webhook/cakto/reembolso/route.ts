import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log('📥 Payload recebido:', JSON.stringify(payload, null, 2));

    // Validar o webhook secret
    const webhookSecret = process.env.CAKTO_REEMBOLSO_SECRET;
    if (!webhookSecret || payload.secret !== webhookSecret) {
      console.error('❌ Webhook secret inválido:', payload.secret);
      return NextResponse.json(
        { error: 'Assinatura de webhook inválida', field: 'secret' },
        { status: 401 }
      );
    }

    const event = payload.event;
    if (!event) {
      return NextResponse.json(
        { error: 'Evento não fornecido', field: 'event' },
        { status: 400 }
      );
    }

    // Extração dos campos
    const email = payload.data?.customer?.email?.trim()?.toLowerCase() || '';

    console.log('📋 Validações:', {
      event,
      email,
      isValidEmail: isValidEmail(email),
    });

    // Validações
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'E-mail inválido ou não fornecido', field: 'email', value: email },
        { status: 400 }
      );
    }

    switch (event) {
      case 'refund':
      case 'chargeback':
        // Verificar se o usuário existe
        const { data: existingUser, error: userError } = await supabaseAdmin
          .from('usuarios')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (userError) {
          console.error('❌ Erro ao verificar usuário na tabela usuarios:', userError);
          return NextResponse.json(
            { error: 'Falha ao verificar usuário', details: userError.message },
            { status: 500 }
          );
        }

        if (!existingUser) {
          console.warn('⚠️ Usuário não encontrado:', email);
          return NextResponse.json(
            { error: 'Usuário não encontrado', field: 'email', value: email },
            { status: 404 }
          );
        }

        const userId = existingUser.id;

        // Excluir registros da tabela subscriptions usando user_id
        const { error: subscriptionDeleteError } = await supabaseAdmin
          .from('subscriptions')
          .delete()
          .eq('user_id', userId);

        if (subscriptionDeleteError) {
          console.error('❌ Erro ao excluir registros da tabela subscriptions:', subscriptionDeleteError);
          return NextResponse.json(
            { error: 'Falha ao excluir registros de subscriptions', details: subscriptionDeleteError.message },
            { status: 500 }
          );
        }

        // Excluir usuário da tabela usuarios
        const { error: userDeleteError } = await supabaseAdmin
          .from('usuarios')
          .delete()
          .eq('id', userId);

        if (userDeleteError) {
          console.error('❌ Erro ao excluir usuário da tabela usuarios:', userDeleteError);
          return NextResponse.json(
            { error: 'Falha ao excluir usuário da tabela usuarios', details: userDeleteError.message },
            { status: 500 }
          );
        }

        // Excluir usuário do auth.users
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authDeleteError) {
          console.error('❌ Erro ao excluir usuário do auth.users:', authDeleteError);
          return NextResponse.json(
            { error: 'Falha ao excluir usuário do auth', details: authDeleteError.message },
            { status: 500 }
          );
        }

        console.log(`✅ Usuário excluído com sucesso para ${event}:`, email);
        return NextResponse.json(
          {
            success: true,
            message: `Usuário excluído com sucesso devido a ${event}.`,
            email,
          },
          { status: 200 }
        );

      default:
        console.warn('⚠️ Evento não tratado:', event);
        return NextResponse.json(
          { success: false, message: `Evento não suportado: ${event}` },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('❌ Erro inesperado:', err.message, err.stack);
      return NextResponse.json(
        { error: 'Erro interno do servidor', details: err.message },
        { status: 500 }
      );
    } else {
      console.error('❌ Erro inesperado:', err);
      
      return NextResponse.json(
        { error: 'Erro interno do servidor', details: String(err) },
        { status: 500 }
      );
    }
  }
}