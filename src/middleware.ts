import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const protectedRoutes = ['/dashboard', '/dashboard/:path*'];
const liveRoutes = ['/live/:id', '/live/:path*'];

// Função para verificar JWT com jose
async function verifyLiveJwt(token: string, secret: string) {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'], // Compatível com jsonwebtoken
    });
    return payload;
  } catch (error) {
    console.error('Erro ao verificar JWT com jose:', error);
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  console.log('Middleware executado para:', url.pathname);

// Lógica para rotas de live
if (liveRoutes.some((path) => {
  const regexPath = path.replace(':path*', '.*').replace(':id', '[^/]+');
  return url.pathname.match(new RegExp(`^${regexPath}$`));
})) {
  console.log('Rota de live detectada:', url.pathname);
  const token = req.cookies.get('live_jwt')?.value;
  console.log('Cookie live_jwt:', token ? 'presente' : 'ausente');

  if (token) {
    try {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET não está definido nas variáveis de ambiente');
      }
      const decoded = await verifyLiveJwt(token, process.env.JWT_SECRET);
      console.log('JWT decodificado:', decoded);

      if (decoded?.redirecionado === true) {
        console.log('✅ Redirecionando para /live-encerrada');
        // Extrai live_id da URL atual (corrigido para capturar corretamente)
        const liveIdFromUrl = url.pathname.replace('/live/', '').trim() || '';
        console.log('Live ID extraído da URL:', liveIdFromUrl); // Log para depurar
        const redirectUrl = new URL('/live-encerrada', req.url);
        redirectUrl.searchParams.set('live_id', liveIdFromUrl);
        return NextResponse.redirect(redirectUrl);
      }
    } catch (err) {
      console.error('Erro ao verificar JWT:', err);
    }
  }

  console.log('Continuando sem redirecionamento');
  return NextResponse.next();
}
  // Lógica para rotas protegidas (/dashboard)
  if (!protectedRoutes.some((path) => url.pathname === path || url.pathname.startsWith(path))) {
    console.log('Rota não protegida, prosseguindo:', url.pathname);
    return NextResponse.next();
  }

  console.log('Rota protegida detectada:', url.pathname);
  const supabaseResponse = NextResponse.next({ request: req });

  // Cria o cliente Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.log('Usuário não autenticado, redirecionando para /login');
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const subscriptionStatus = user.user_metadata?.subscription_status;
    console.log('Status da assinatura:', subscriptionStatus);

    if (!subscriptionStatus || subscriptionStatus !== 'active') {
      console.log('Assinatura inativa, redirecionando para /reativar');
      url.pathname = '/reativar';
      return NextResponse.redirect(url);
    }

    supabaseResponse.headers.set('Cache-Control', 'no-store');
    return supabaseResponse;
  } catch {
    console.log('Erro ao verificar usuário, redirecionando para /login');
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/live/:path*'],
};