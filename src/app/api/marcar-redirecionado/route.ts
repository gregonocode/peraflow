import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // Ler o corpo da requisição como texto para depuração
    const rawBody = await req.text();
    console.log('Corpo da requisição recebido:', rawBody);

    // Tentar parsear o corpo como JSON
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError);
      return NextResponse.json({ error: "Corpo da requisição inválido ou vazio" }, { status: 400 });
    }

    const { user_temp_id, live_id } = body;

    if (!user_temp_id || !live_id) {
      console.error('Faltando user_temp_id ou live_id:', { user_temp_id, live_id });
      return NextResponse.json({ error: "user_temp_id e live_id são obrigatórios" }, { status: 400 });
    }

    // Tenta atualizar o registro existente
    const { data: existingData, error: selectError } = await supabase
      .from("acessos_lives")
      .select("id")
      .eq("user_temp_id", user_temp_id)
      .eq("live_id", live_id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error("Erro ao verificar registro:", selectError);
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    if (existingData) {
      // Atualiza o registro existente
      const { error: updateError } = await supabase
        .from("acessos_lives")
        .update({ redirecionado: true })
        .eq("user_temp_id", user_temp_id)
        .eq("live_id", live_id);

      if (updateError) {
        console.error("Erro ao atualizar redirecionado:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      console.log('Registro atualizado com redirecionado: true', { user_temp_id, live_id });
    } else {
      // Cria um novo registro
      const { error: insertError } = await supabase
        .from("acessos_lives")
        .insert({
          user_temp_id,
          live_id,
          redirecionado: true,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Erro ao criar registro:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      console.log('Novo registro criado com redirecionado: true', { user_temp_id, live_id });
    }

    // Verificar se JWT_SECRET está definido
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET não está definido nas variáveis de ambiente.");
      return NextResponse.json(
        { error: "Configuração do servidor inválida: JWT_SECRET ausente" },
        { status: 500 }
      );
    }

    // Gerar JWT com as claims
    const token = jwt.sign(
      { user_temp_id, live_id, redirecionado: true },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // Expira em 1 hora
    );
    console.log('JWT gerado:', { token, user_temp_id, live_id });

    // Retornar sucesso com o token
    const response = NextResponse.json({ success: true, token });
    response.cookies.set("live_jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hora
    });
    console.log('Cookie live_jwt definido com sucesso', { user_temp_id, live_id });

    return response;
  } catch (err) {
    console.error("Erro no endpoint:", err);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}