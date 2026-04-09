import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidCPF = (cpf: string): boolean => {
  const cleanedCPF = cpf.replace(/\D/g, '');
  return cleanedCPF.length === 11;
};

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log('📥 Payload recebido:', JSON.stringify(payload, null, 2));

    // Validar o webhook secret
    const webhookSecret = process.env.CAKTO_WEBHOOK_SECRET;
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
    const nome = payload.data?.customer?.name?.trim() || '';
    const cpf = payload.data?.customer?.docNumber?.trim() || '';
    const phone = payload.data?.customer?.phone?.trim() || null;
    const plan_type = payload.data?.offer?.name?.trim() || 'basic';
    const price_id = payload.data?.offer?.id?.trim() || '';
    const senha = 'SerejaTemp123@'; // Senha padrão fixa
    const paidAt = payload.data?.paidAt
      ? new Date(payload.data.paidAt)
      : new Date();

    console.log('📋 Validações:', {
      event,
      email,
      isValidEmail: isValidEmail(email),
      cpf,
      isValidCPF: isValidCPF(cpf),
      nome,
      price_id,
      plan_type,
      phone,
      paidAt: paidAt.toISOString(),
    });

    // Validações
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'E-mail inválido ou não fornecido', field: 'email', value: email },
        { status: 400 }
      );
    }

    switch (event) {
      case 'subscription_created':
        // Validações específicas para subscription_created
        if (!cpf || !isValidCPF(cpf)) {
          return NextResponse.json(
            { error: 'CPF inválido ou não fornecido', field: 'docNumber', value: cpf },
            { status: 400 }
          );
        }
        if (!nome) {
          return NextResponse.json(
            { error: 'Nome não fornecido', field: 'name', value: nome },
            { status: 400 }
          );
        }
        if (!price_id) {
          return NextResponse.json(
            { error: 'Price ID não fornecido', field: 'offer.id', value: price_id },
            { status: 400 }
          );
        }
        if (isNaN(paidAt.getTime())) {
          return NextResponse.json(
            { error: 'Data de pagamento inválida', field: 'paidAt', value: payload.data?.paidAt },
            { status: 400 }
          );
        }

        // Verificar se o usuário já existe
        let userId: string;
        let isNewUser = false;
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

        if (existingUser) {
          userId = existingUser.id;
          console.log('ℹ️ Usuário já existe:', userId);
        } else {
          // Criar usuário no auth.users
          const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: senha,
            email_confirm: true,
          });

          if (authError) {
            console.error('❌ Erro ao criar usuário no auth.users:', authError);
            return NextResponse.json(
              { error: 'Falha ao criar usuário', details: authError.message },
              { status: 500 }
            );
          }

          userId = userData.user.id;
          isNewUser = true;
          console.log('✅ Usuário criado no auth.users:', userId);

          // Atualizar campos adicionais em public.usuarios
          const { error: updateError } = await supabaseAdmin
            .from('usuarios')
            .update({
              nome,
              cpf,
              phone,
              plan_type,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (updateError) {
            console.error('❌ Erro ao atualizar usuário em public.usuarios:', updateError);
            return NextResponse.json(
              { error: 'Falha ao atualizar usuário', details: updateError.message },
              { status: 500 }
            );
          }

          console.log('✅ Usuário atualizado em public.usuarios:', userId);
        }

        // Criar assinatura
        const { error: subscriptionError } = await supabaseAdmin.rpc('create_subscription', {
          p_email: email,
          p_plan_type: plan_type,
          p_paid_at: paidAt.toISOString(),
        });

        if (subscriptionError) {
          console.error('❌ Erro ao criar assinatura:', subscriptionError);
          return NextResponse.json(
            { error: 'Falha ao criar assinatura', details: subscriptionError.message },
            { status: 500 }
          );
        }

        console.log('✅ Assinatura criada para:', email);

        // 🔹 Atualiza o metadata do usuário no JWT
        await supabaseAdmin.auth.admin.updateUserById(userId, {
         user_metadata: { subscription_status: 'active' }
         });
        console.log(`🔄 JWT atualizado com status 'active' para usuário ${userId}`);

        // Enviar e-mail de boas-vindas apenas para novos usuários
        if (isNewUser) {
          await enviarEmailBoasVindas(email);
        }

        return NextResponse.json(
          {
            success: true,
            message: `Assinatura criada com sucesso${isNewUser ? ' e usuário registrado' : ''}.`,
            userId,
            email,
          },
          { status: 200 }
        );

      case 'subscription_canceled':
        // Cancelar assinatura
        const { error: cancelError } = await supabaseAdmin.rpc('cancel_subscription', {
          p_email: email,
        });

        if (cancelError) {
          console.error('❌ Erro ao cancelar assinatura:', cancelError);
          return NextResponse.json(
            { error: 'Falha ao cancelar assinatura', details: cancelError.message },
            { status: 500 }
          );
        }

        console.log('✅ Assinatura cancelada para:', email);

        // 🔹 Atualiza o metadata do usuário no JWT
       const { data: canceledUser } = await supabaseAdmin
  .from('usuarios')
  .select('id')
  .eq('email', email)
  .maybeSingle();

if (canceledUser) {
       await supabaseAdmin.auth.admin.updateUserById(canceledUser.id, {
       user_metadata: { subscription_status: 'inactive' }
       });
      console.log(`🔄 JWT atualizado com status 'inactive' para usuário ${canceledUser.id}`);

      // Desativar todos os links ativos do usuário após o cancelamento
      const { error: linksError } = await supabaseAdmin
        .from('links')
        .update({ is_active: false })
        .eq('user_id', canceledUser.id)
        .eq('is_active', true);

      if (linksError) {
        console.error(
          `⚠️ Falha ao desativar links do usuário ${canceledUser.id} após cancelamento:`,
          linksError
        );
      } else {
        console.log(`✅ Links desativados para usuário ${canceledUser.id} após cancelamento`);
      }

      // Desativar todos os fluxos ativos do usuário após o cancelamento
      const { error: fluxosError } = await supabaseAdmin
        .from('fluxos')
        .update({ ativo: false })
        .eq('user_id', canceledUser.id)
        .eq('ativo', true);

      if (fluxosError) {
        console.error(
          `⚠️ Falha ao desativar fluxos do usuário ${canceledUser.id} após cancelamento:`,
          fluxosError
        );
      } else {
        console.log(`✅ Fluxos desativados para usuário ${canceledUser.id} após cancelamento`);
      }
          }


        // Enviar e-mail de cancelamento
        await enviarEmailCancelamento(email);

        return NextResponse.json(
          {
            success: true,
            message: 'Assinatura cancelada com sucesso.',
            email,
          },
          { status: 200 }
        );

      case 'subscription_renewed':
        // Validações específicas para subscription_renewed
        if (isNaN(paidAt.getTime())) {
          return NextResponse.json(
            { error: 'Data de pagamento inválida', field: 'paidAt', value: payload.data?.paidAt },
            { status: 400 }
          );
        }

        // Validação adicional para plan_type
        if (!['basic', 'premium','Special Offer'].includes(plan_type)) {
          console.warn(`⚠️ plan_type inválido: ${plan_type}, usando 'basic' como padrão`);
        }

        // Renovar assinatura
        const { error: renewError } = await supabaseAdmin.rpc('renew_subscription', {
          p_email: email,
          p_paid_at: paidAt.toISOString(),
          p_plan_type: plan_type,
        });

        if (renewError) {
          console.error('❌ Erro ao renovar assinatura:', renewError);
          return NextResponse.json(
            { error: 'Falha ao renovar assinatura', details: renewError.message },
            { status: 500 }
          );
        }

        console.log('✅ Assinatura renovada para:', email, 'com plano:', plan_type);

        // 🔹 Atualiza o metadata do usuário no JWT
       const { data: renewedUser } = await supabaseAdmin
  .from('usuarios')
  .select('id')
  .eq('email', email)
  .maybeSingle();

if (renewedUser) {
  await supabaseAdmin.auth.admin.updateUserById(renewedUser.id, {
    user_metadata: { subscription_status: 'active' }
  });
  console.log(`🔄 JWT atualizado com status 'active' para usuário ${renewedUser.id}`);
          }

        // Enviar e-mail de renovação
        await enviarEmailRenovacao(email, paidAt);

        return NextResponse.json(
          {
            success: true,
            message: 'Assinatura renovada com sucesso.',
            email,
            plan_type,
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

async function enviarEmailBoasVindas(email: string) {
  try {
    const data = await resend.emails.send({
      from: 'reply@workshoplive.com.br',
      to: email,
      subject: 'Bem-vindo à Workshop Live!',
      html: `
        <div style="font-family: sans-serif; line-height: 1.5">
          <h2>🎉 Sua inscrição foi confirmada!</h2>
          <p>Olá! Parabéns! Sua assinatura foi ativada com sucesso. Seus dados de acesso:</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Senha temporária:</strong> SerejaTemp123@</p>
          <p>Use esse acesso para entrar na plataforma, recomendamos alterar sua senha após o login.</p>
          <br/>
          <a href="https://www.workshoplive.com.br/login" style="background-color: #0AD991; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px;">
            Acessar Plataforma
          </a>
        </div>
      `,
    });

    console.log('📨 Email de boas-vindas enviado:', data);
  } catch (error) {
    console.error('❌ Erro ao enviar email de boas-vindas:', error);
  }
}

async function enviarEmailCancelamento(email: string) {
  try {
    const data = await resend.emails.send({
      from: 'reply@workshoplive.com.br',
      to: email,
      subject: 'Sua assinatura foi cancelada',
      html: `
        <div style="font-family: sans-serif; line-height: 1.5">
          <h2>Assinatura Cancelada</h2>
          <p>Olá! Sua assinatura na Workshop Live foi cancelada. Caso queira reativá-la, clique no botão abaixo.</p>
          <br/>
          <a href="https://www.workshoplive.com.br/reativar" style="background-color: #0AD991; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px;">
            Reativar Assinatura
          </a>
        </div>
      `,
    });

    console.log('📨 Email de cancelamento enviado:', data);
  } catch (error) {
    console.error('❌ Erro ao enviar email de cancelamento:', error);
  }
}

async function enviarEmailRenovacao(email: string, paidAt: Date) {
  try {
    const data = await resend.emails.send({
      from: 'reply@workshoplive.com.br',
      to: email,
      subject: 'Sua assinatura foi renovada',
      html: `
        <div style="font-family: sans-serif; line-height: 1.5">
          <h2>Assinatura Renovada</h2>
          <p>Olá! Sua assinatura na Workshop Live foi renovada com sucesso.</p>
          <p><strong>Data do pagamento:</strong> ${paidAt.toLocaleDateString('pt-BR')}</p>
          <br/>
          <a href="https://www.workshoplive.com.br/dashboard" style="background-color: #0AD991; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px;">
            Acessar Painel
          </a>
        </div>
      `,
    });

    console.log('📨 Email de renovação enviado:', data);
  } catch (error) {
    console.error('❌ Erro ao enviar email de renovação:', error);
  }
}                                                                                                                                         
