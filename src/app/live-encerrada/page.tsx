import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';

// Força renderização dinâmica para usar searchParams
export const dynamic = 'force-dynamic';

export default async function LiveEncerrada({ searchParams }: { searchParams: Promise<{ live_id?: string }> }) {
  // Aguarda a resolução de searchParams
  const { live_id: liveId } = await searchParams;

  let linkOferta: string | null = null;

  if (liveId) {
    // Cria cliente Supabase no servidor
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => [], // Não precisa de cookies aqui, pois é server-side
          setAll: () => {},
        },
      }
    );

    // Query para pegar link_oferta da tabela lives
    const { data, error } = await supabase
      .from('lives')
      .select('link_oferta')
      .eq('id', liveId)
      .single();

    if (error) {
      console.error('Erro ao buscar link_oferta:', error);
    } else if (data) {
      linkOferta = data.link_oferta;
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 p-4">
      <h1 className="text-4xl font-bold text-[#181818] mb-4">Live Encerrada</h1>
      <p className="text-lg text-[#333333] mb-6">Esta live terminou. Obrigado por participar!</p>
      <Link
        href={linkOferta || '/'}
        className="text-base text-[#0070f3] border border-[#0070f3] rounded-md px-4 py-2 hover:bg-[#0070f3] hover:text-white transition-colors"
      >
        {linkOferta ? 'Obter Oferta da Live' : 'Voltar para a página inicial'}
      </Link>
    </div>
  );
}