'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { toast, Toaster } from 'react-hot-toast';

// Interface para tipar os dados dos links
interface Link {
  live_id: string;
  url: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  nome: string;
  user_id?: string; // Adicionado como opcional para refletir a nova coluna
}

// Configuração do Supabase
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Links() {
  const router = useRouter();
  const [links, setLinks] = useState<Link[]>([]);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Buscar links do Supabase
  const fetchLinks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('links')
      .select(`
        live_id,
        url,
        expires_at,
        is_active,
        created_at,
        nome,
        user_id
      `)
      .eq('user_id', user.id) // Filtro para buscar apenas links do usuário autenticado
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar links: ' + error.message, {
        position: 'top-center',
      });
      console.error('Erro completo:', error);
      return;
    }

    // Mapear os dados
    const formattedLinks: Link[] = (data || []).map((item: Link) => ({
      live_id: item.live_id,
      url: item.url,
      expires_at: item.expires_at,
      is_active: item.is_active,
      created_at: item.created_at,
      nome: item.nome || 'Sem nome', // Fallback para links sem nome
      user_id: item.user_id, // Incluído no mapeamento
    }));

    if (formattedLinks.length === 0) {
      console.warn('Nenhum link encontrado.');
    }

    setLinks(formattedLinks);
  };

  // Verificar autenticação e buscar links
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        fetchLinks();
      }
    }
    checkUser();
  }, [router]);

  // Função para copiar o link
  const handleCopy = (linkId: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkId(linkId);
    toast.success('Link copiado!', {
      position: 'top-center',
      duration: 2000,
    });
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  // Função para determinar o status
  const getStatus = (isActive: boolean, expiresAt: string) => {
    const currentDate = new Date();
    const expiryDate = new Date(expiresAt);
    return isActive && currentDate < expiryDate ? 'Ativo' : 'expirado';
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-lato p-6">
      <Toaster />
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-[#1e1e1e] mb-4">Gerenciar Links</h2>
        {links.length === 0 ? (
          <p className="text-gray-600">Nenhum link encontrado. Crie uma live para gerar links.</p>
        ) : (
          <div className="mt-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome da Live
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Link da Live
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {links.map((link) => (
                  <tr key={link.live_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {link.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={link.url}
                          readOnly
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#059669]"
                        />
                        <button
                          onClick={() => handleCopy(link.live_id, link.url)}
                          className="bg-[#059669] text-white px-3 py-1 rounded-md hover:bg-[#34D399] transition"
                        >
                          {copiedLinkId === link.live_id ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                        Call Live
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-sm ${
                          getStatus(link.is_active, link.expires_at) === 'Ativo'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {getStatus(link.is_active, link.expires_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}