'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import dynamic from "next/dynamic";

/* ✨ fundo holográfico */
import '../../../styles/css/holografico.css';

/* Ícones */
import { UserRoundSearch, Cable, Trash2, ChevronUp } from 'lucide-react';

const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
  { ssr: false }
);

const ENABLE_DEBUG = process.env.NODE_ENV === 'development';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Connection {
  id: string;
  user_id: string;
  numero: string;
  status: string;
  nome: string;
  token_sessao: string;
  hash: string;
  fluxo_inicial_id?: string | null; // 👈 novo campo
}

interface Fluxo {
  id: string;
  nome: string;
  ativo?: boolean | null;
}

// Helpers de status/badge
const statusInfo = (s?: string) => {
  const v = (s ?? '').toLowerCase();
  if (v === 'connected') return { label: 'Conectado', dot: 'bg-emerald-500', chip: 'text-emerald-700' };
  if (v === 'pending')   return { label: 'Aguardando', dot: 'bg-amber-500',   chip: 'text-amber-700' };
  if (v === 'disconnected') return { label: 'Desconectado', dot: 'bg-gray-400', chip: 'text-gray-700' };
  return { label: 'Desconhecido', dot: 'bg-gray-300', chip: 'text-gray-700' };
};

export default function ConexoesPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [connectionName, setConnectionName] = useState('');
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [planType, setPlanType] = useState<string | null>(null);
  const [maxInstances, setMaxInstances] = useState<number>(0);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);

  // 👇 estados para fluxos e dropdown
  const [fluxos, setFluxos] = useState<Fluxo[]>([]);
  const [openDropdownFor, setOpenDropdownFor] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLLIElement | null>(null);

  const router = useRouter();

  const logDebug = (category: string, message: string, data?: unknown) => {
    if (ENABLE_DEBUG) {
      const timestamp = new Date().toISOString();
      console.log(
        `[${timestamp}] [${category}] ${message}`,
        data ? JSON.stringify(data, null, 2) : ''
      );
    }
  };

  // Clique fora fecha o dropdown
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownFor(null);
      }
    }
    if (openDropdownFor) {
      document.addEventListener('mousedown', onClickOutside);
    } else {
      document.removeEventListener('mousedown', onClickOutside);
    }
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [openDropdownFor]);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          logDebug('AUTH', 'Sessão não encontrada, redirecionando para login');
          router.push('/login');
          return;
        }
        logDebug('AUTH', 'Usuário autenticado', { user_id: session.user.id });
        setIsAuthenticated(true);

        // Buscar plano do usuário
        let resolvedPlan: string = 'basic';
        try {
          const { data: usuario, error: usuarioErr } = await supabase
            .from('usuarios')
            .select('plan_type')
            .eq('user_id', session.user.id)
            .single();
          if (!usuarioErr && usuario) {
            resolvedPlan = usuario.plan_type || 'basic';
          }
        } catch {
          resolvedPlan = 'basic';
        }
        setPlanType(resolvedPlan);
        setMaxInstances(resolvedPlan === 'premium' ? 1 : 0);

        // 🔹 Carrega conexões incluindo fluxo_inicial_id
        const { data: conexoes, error: conexoesErr } = await supabase
          .from('whatsapp_conexoes')
          .select('id, user_id, numero, status, nome, token_sessao, hash, fluxo_inicial_id')
          .eq('user_id', session.user.id);

        if (conexoesErr) {
          logDebug('SUPABASE_ERROR', 'Erro ao carregar conexões', { error: conexoesErr });
        } else {
          setConnections(conexoes || []);
          logDebug('SUPABASE', 'Conexões carregadas', { connections: conexoes });
        }
       
        // 🔹 Carrega fluxos do usuário (apenas ativos se preferir)
        const { data: fluxosData, error: fluxosErr } = await supabase
          .from('fluxos')
          .select('id, nome, ativo')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (fluxosErr) {
          logDebug('SUPABASE_ERROR', 'Erro ao carregar fluxos', { error: fluxosErr });
        } else {
          // Se quiser filtrar só os ativos: .filter(f => f.ativo !== false)
          setFluxos(fluxosData || []);
          logDebug('SUPABASE', 'Fluxos carregados', { fluxos: fluxosData });
        }

        setIsLoadingPlan(false);
      } catch (err) {
        logDebug(
          'AUTH_ERROR',
          'Erro ao verificar autenticação',
          { error: typeof err === 'object' && err !== null && 'message' in err ? (err as { message?: string }).message : String(err) }
        );
        router.push('/login');
      }
    };
    checkAuthAndLoad();
  }, [router]);

  // Contadores/flags de criação de instância
  const instancesCount = connections.length;
  const canCreateInstance = !isLoadingPlan && !!planType && maxInstances > 0 && instancesCount < maxInstances;

  useEffect(() => {
    if (!isAuthenticated || !hash) return;

    const channel = supabase
      .channel(`whatsapp_conexoes_${hash}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_conexoes',
          filter: `hash=eq.${hash}`,
        },
        (payload: unknown) => {
        type Row = Connection & { id: string };
        const rowNew = (payload as { new: Row }).new;

       logDebug('SUPABASE_REALTIME', 'Mudança detectada', {
       newStatus: rowNew.status,
       nome: rowNew.nome,
       token_sessao: rowNew.token_sessao,
       hash: rowNew.hash,
      instanceName,
        });

       if (rowNew.status === 'connected') {
       logDebug('STATE_UPDATE', 'Conexão estabelecida', { instanceName, payload: rowNew });
       setIsConnected(true);
       setConnections((prev) =>
      prev.map((conn) => (conn.id === rowNew.id ? { ...conn, ...rowNew } : conn))
       );
      }
     }

      )
      .subscribe((status) => {
        logDebug('SUBSCRIPTION', 'Status da subscrição', { status, instanceName });
      });

    return () => {
      supabase.removeChannel(channel);
      logDebug('SUBSCRIPTION', 'Desinscrevendo canal', { instanceName });
    };
    }, [isAuthenticated, hash, instanceName]);


  useEffect(() => {
    if (!isAuthenticated || !instanceName || isConnected) return;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('whatsapp_conexoes')
          .select('status, nome, token_sessao, hash')
          .eq('hash', hash)
          .single();

        if (error) {
          logDebug('SUPABASE_CHECK', 'Erro ao verificar status', { error });
          return;
        }

        logDebug('SUPABASE_CHECK', 'Status verificado', {
          status: data?.status,
          nome: data?.nome,
          token_sessao: data?.token_sessao,
          hash: data?.hash,
          instanceName,
        });
        if (data?.status === 'connected') {
          logDebug('STATE_UPDATE', 'Conexão estabelecida via verificação manual', { instanceName });
          setIsConnected(true);
        }
      } catch (err) {
        logDebug('SUPABASE_CHECK', 'Erro inesperado na verificação manual', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, hash, isConnected, instanceName]);

  const handleNext = async () => {
    if (step === 1) {
      // Checagem de limite no client
      const instancesCount = connections.length;
      const reachedLimit = !planType || maxInstances === 0 || instancesCount >= maxInstances;
      if (reachedLimit) {
        const msg = planType === 'basic'
          ? 'Seu plano atual não permite criar instâncias de WhatsApp. Faça upgrade para o Premium.'
          : 'Você atingiu o limite de instâncias permitidas no seu plano.';
        setError(msg);
        logDebug('PLAN_LIMIT', 'Criação bloqueada por limite do plano', { planType, instancesCount, maxInstances });
        return;
      }

      if (!connectionName) {
        setError('Digite um nome para a conexão');
        logDebug('VALIDATION_ERROR', 'Nome da conexão não fornecido');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          logDebug('AUTH', 'Token obtido', { token: session.access_token.slice(0, 10) + '...' });
        }

        logDebug('API_REQUEST', 'Enviando para /api/evolution/start', {
          step,
          nome: connectionName,
          integration: 'WHATSAPP-BAILEYS',
        });

        const response = await fetch('/api/evolution/start', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            nome: connectionName,
            integration: 'WHATSAPP-BAILEYS',
          }),
        });

        const data = await response.json();
        logDebug('API_RESPONSE', 'Resposta de /api/evolution/start', {
          status: response.status,
          data,
        });

        if (!response.ok) {
          const errorMsg = data.error || 'Erro ao criar instância';
          setError(errorMsg);
          logDebug('API_ERROR', 'Erro na criação da instância', { error: errorMsg });
          setIsLoading(false);
          return;
        }

        const tokenSessao = data.instance?.token_sessao;
        const qrCode = data.instance?.qrcode;
        if (!tokenSessao || !qrCode) {
          setError('Token de sessão ou QR code não retornado pela API');
          logDebug('API_ERROR', 'Token de sessão ou QR code não retornado', { data });
          setIsLoading(false);
          return;
        }

        setInstanceName(tokenSessao);
        setQrCode(qrCode);
        setStep(2);
        logDebug('STATE_UPDATE', 'Avançando para passo 2', { instanceName: tokenSessao, qrcode: qrCode.slice(0, 30) + '...' });

        const { data: newConnection } = await supabase
          .from('whatsapp_conexoes')
          .select('id, user_id, numero, status, nome, token_sessao, hash, fluxo_inicial_id')
          .eq('token_sessao', tokenSessao)
          .single();

        if (newConnection) {
          setConnections((prev) => [...prev, newConnection]);
          setHash(newConnection.hash);
          logDebug('SUPABASE', 'Nova conexão adicionada', { newConnection });
        }
      } catch (err) {
        const errorMsg = 'Erro inesperado ao criar conexão';
        setError(errorMsg);
        logDebug(
          'ERROR',
          'Erro inesperado',
          { error: typeof err === 'object' && err !== null && 'message' in err ? (err as { message?: string }).message : String(err) }
        );
        setIsLoading(false);
      } finally {
        setIsLoading(false);
        logDebug('STATE_UPDATE', 'Finalizando carregamento', { isLoading: false });
      }
    }
  };

  const handleConclude = () => {
    logDebug('STATE_UPDATE', 'Concluindo processo e resetando estados', {
      step,
      connectionName,
      instanceName,
      qrCode,
    });
    setIsOpen(false);
    setStep(1);
    setConnectionName('');
    setInstanceName(null);
    setQrCode(null);
    setError(null);
    setIsConnected(false);
  };

  useEffect(() => {
  let channel: ReturnType<typeof supabase.channel> | null = null;

  const sub = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    channel = supabase
      .channel(`whatsapp_conexoes_user_${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_conexoes',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload: unknown) => {
          type RowId = { id: string };
          const updated = (payload as { new: Partial<Connection> & RowId }).new;

          setConnections((prev) =>
            prev.map((c) => (c.id === updated.id ? ({ ...c, ...updated } as Connection) : c))
          );

          const st = (updated as Partial<Connection>).status;
          logDebug('SUPABASE_REALTIME_ALL', 'UPDATE detectado (user scope)', {
            id: updated.id,
            status: st,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'whatsapp_conexoes',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload: unknown) => {
          type RowId = { id: string };
          const oldRow = (payload as { old?: RowId }).old;
          const removedId = oldRow?.id;

          if (removedId) {
            setConnections((prev) => prev.filter((c) => c.id !== removedId));
            logDebug('SUPABASE_REALTIME_ALL', 'DELETE detectado (user scope)', { id: removedId });
          }
        }
      )
      .subscribe((st) => logDebug('SUBSCRIPTION_ALL', 'Status', { st }));
  };

  if (isAuthenticated) sub();
  return () => {
    if (channel) supabase.removeChannel(channel);
  };
}, [isAuthenticated]);



  // Helpers
  // Desconectar (logout) na Evolution e refletir rapidamente no front
const desconectarConexao = async (conn: Connection) => {
  try {
    const res = await fetch(
      `/api/evolution/instances/${encodeURIComponent(conn.nome)}/logout`,
      { method: 'DELETE' }
    );

    // otimismo na UI; o webhook confirmará
    setConnections((prev) =>
      prev.map((c) => (c.id === conn.id ? { ...c, status: 'disconnected' } : c))
    );

    if (!res.ok) {
      let j: unknown = null;
      try {
        j = await res.json();
      } catch {
        // ignore parse error
      }
      console.warn('[logout failed]', j);
    }

    // opcional: força refresh do registro (o webhook já atualiza)
    await supabase.from('whatsapp_conexoes').update({ status: 'disconnected' }).eq('id', conn.id);
  } catch (e) {
    console.error('[desconectarConexao]', e);
  }
};


// Excluir (delete) na Evolution **e** remover do Supabase
const excluirConexao = async (conn: Connection) => {
  try {
    const res = await fetch(`/api/evolution/instances/${encodeURIComponent(conn.nome)}`, { method: 'DELETE' });
    const ok = res.ok;

    // remove do seu banco mesmo se o endpoint devolver 404 (já removida)
    await supabase.from('whatsapp_conexoes').delete().eq('id', conn.id);
    setConnections((prev) => prev.filter((c) => c.id !== conn.id));

   if (!ok) {
  let j: unknown = null;
  try {
    j = await res.json();
  } catch {
    j = null;
  }
  console.warn('[delete instance returned non-ok]', j);
}
  } catch (e) {
    console.error('[excluirConexao]', e);
  }
};


  // 🔗 Handler para selecionar um fluxo e salvar na conexão
  const selecionarFluxoInicial = async (conexaoId: string, fluxoId: string) => {
    try {
      const { error: upErr } = await supabase
        .from('whatsapp_conexoes')
        .update({ fluxo_inicial_id: fluxoId })
        .eq('id', conexaoId);

      if (upErr) {
        logDebug('SUPABASE_ERROR', 'Erro ao atualizar fluxo_inicial_id', { upErr, conexaoId, fluxoId });
        return;
      }

      setConnections((prev) =>
        prev.map((c) => (c.id === conexaoId ? { ...c, fluxo_inicial_id: fluxoId } : c))
      );
      setOpenDropdownFor(null);
      logDebug('SUPABASE', 'fluxo_inicial_id atualizado com sucesso', { conexaoId, fluxoId });
    } catch (e) {
      logDebug('ERROR', 'Falha inesperada ao salvar fluxo_inicial_id', { e });
    }
  };

  const nomeDoFluxo = (fluxoId?: string | null) => {
    if (!fluxoId) return 'Nenhum';
    return fluxos.find((f) => f.id === fluxoId)?.nome ?? fluxoId;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex-1 p-6">
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-800">Conecte seu número do WhatsApp</h1>
            {isLoadingPlan ? (
              <button
                className="px-4 py-2 bg-gray-200 text-gray-500 font-semibold rounded-full cursor-not-allowed border border-gray-300"
                disabled
              >
                Carregando...
              </button>
            ) : !canCreateInstance ? (
              <button
                className="px-4 py-2 bg-gray-200 text-gray-500 font-semibold rounded-full cursor-not-allowed border border-gray-300 relative"
                disabled
              >
                {planType === 'basic' ? 'Recurso disponível no Premium' : 'Limite de instâncias atingido'}
                {planType === 'basic' && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-200 via-purple-200 via-blue-200 to-green-200 text-[#3C2F00] shadow-sm border border-white/30 backdrop-blur-sm text-[9px] px-2 py-0.5 rounded-full font-bold">PREMIUM</span>
                )}
              </button>
            ) : (
              <button
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors cursor-pointer"
                onClick={() => {
                  if (!isAuthenticated) {
                    logDebug('UI_EVENT', 'Usuário não autenticado, redirecionando para login');
                    router.push('/login');
                    return;
                  }
                  setIsOpen(true);
                  logDebug('UI_EVENT', 'Abrindo modal de conexão');
                }}
              >
                Adicionar Número
              </button>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-xs text-gray-500 mb-2">
            Plano: {planType || 'Carregando...'} · Instâncias usadas: {instancesCount}/{maxInstances || 0}
          </p>
          {planType === 'basic' && (
            <p className="text-xs text-amber-600">
              Você está no plano Basic. Para conectar seu WhatsApp e usar automações, faça upgrade para o plano Premium.
            </p>
          )}
          {connections.length === 0 ? (
            <p className="text-gray-600">Você não tem nenhum número conectado.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="w-72 rounded-2xl bg-white ring-1 ring-black/5 shadow-sm overflow-hidden"
                >
                  {/* Topo holográfico: Nome + badge Conectado */}
                  <div className="h-28 holographic-bg relative flex items-center justify-center">
                    {(() => {
                     const info = statusInfo(conn.status);
                     return (
                  <div className={`absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-2.5 py-1 ${info.chip} text-xs ring-1 ring-white/60`}>
                  <span className={`h-2 w-2 rounded-full ${info.dot} animate-pulse`} />
                     {info.label}
                  </div>
                     );
                   })()}
                    <h3 className="text-base font-semibold text-gray-800 text-center px-6 truncate">
                      {conn.nome}
                    </h3>
                  </div>

                  {/* divisória */}
                  <div className="border-t border-gray-100" />

                  {/* Base: número central + ações */}
                  <div className="p-4">
                    <p className="text-center text-lg font-medium text-gray-900">
                      {conn.numero || 'Número não disponível'}
                    </p>

                    {/* Info do fluxo atual */}
                    <p className="mt-2 text-center text-sm text-gray-600">
                      <span className="font-medium">Fluxo inicial:</span> {nomeDoFluxo(conn.fluxo_inicial_id)}
                    </p>

                    <ul className="mt-4 space-y-1.5">
                      <li>
                        <button
                          type="button"
                          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 text-gray-700"
                          onClick={() => console.log('Contatos da conexão', conn.id)}
                        >
                          <UserRoundSearch className="h-5 w-5" />
                          <span>Contatos</span>
                        </button>
                      </li>

                      {/* 🔽 Dropdown para escolher o fluxo (abre para cima) */}
                      <li className="relative" ref={openDropdownFor === conn.id ? dropdownRef : null}>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 text-gray-700"
                          onClick={() =>
                            setOpenDropdownFor((prev) => (prev === conn.id ? null : conn.id))
                          }
                        >
                          <span className="flex items-center gap-3">
                            <Cable className="h-5 w-5" />
                            <span>Conectar Fluxo</span>
                          </span>
                          <ChevronUp
                            className={`h-4 w-4 transition-transform ${
                              openDropdownFor === conn.id ? 'rotate-0' : 'rotate-180'
                            }`}
                          />
                        </button>

                        {openDropdownFor === conn.id && (
                          <div
                            className="absolute bottom-full mb-2 left-0 right-0 z-10 rounded-lg border border-gray-200 bg-white shadow-lg"
                          >
                            <div className="max-h-60 overflow-y-auto py-1">
                              {fluxos.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                  Nenhum fluxo encontrado.
                                </div>
                              ) : (
                                fluxos.map((f) => (
                                  <button
                                    key={f.id}
                                    type="button"
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                      conn.fluxo_inicial_id === f.id ? 'bg-green-50' : ''
                                    }`}
                                    onClick={() => selecionarFluxoInicial(conn.id, f.id)}
                                  >
                                    {f.nome}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </li>

                      <li>
                    {conn.status === 'connected' ? (
                     <button
                    type="button"
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 text-gray-700"
                  onClick={() => desconectarConexao(conn)}
                   title="Desconecta a sessão (logout) na Evolution">
                 <Trash2 className="h-5 w-5 rotate-90 opacity-80" />
                <span>Desconectar</span>
                   </button>
                      ) : (
                  <button
              type="button"
             className="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 text-red-600"
             onClick={() => excluirConexao(conn)}
            title="Exclui a instância na Evolution e remove a conexão">
             <Trash2 className="h-5 w-5" />
            <span>Excluir</span>
                    </button>
                 )}
              </li>
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={isOpen}
        onClose={() => {
          if (step === 1) {
            setIsOpen(false);
            logDebug('UI_EVENT', 'Fechando modal de conexão (step 1)');
          }
        }}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-3xl h-[30rem] rounded-lg bg-white flex">
            <div className="w-1/2 bg-gray-100 flex items-center justify-center">
              {step === 1 ? (
                <img src="/etapa01.png" alt="Etapa 1" className="w-full h-full object-contain" />
              ) : (
                <img src="/etapa02.png" alt="Etapa 2" className="w-full h-full object-contain" />
              )}
            </div>

            <div className="w-1/2 p-8 flex flex-col justify-center">
              {step === 1 ? (
                <>
                  <Dialog.Title className="text-2xl font-semibold text-gray-800">Nome da Conexão</Dialog.Title>
                  <Dialog.Description className="mt-2 text-gray-600">
                    Insira um nome para identificar sua conexão do WhatsApp.
                  </Dialog.Description>
                  <input
                    type="text"
                    value={connectionName}
                    onChange={(e) => {
                      setConnectionName(e.target.value);
                      logDebug('STATE_UPDATE', 'Atualizando nome da conexão', { connectionName: e.target.value });
                    }}
                    placeholder="Nome da conexão"
                    className="mt-4 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                  {error && <p className="mt-2 text-red-600">{error}</p>}
                  <button
                    onClick={handleNext}
                    className="mt-6 px-4 py-2 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors disabled:bg-gray-400"
                    disabled={!connectionName || isLoading}
                  >
                    {isLoading ? 'Carregando...' : 'Próximo'}
                  </button>
                </>
              ) : (
                <>
                  <Dialog.Title className="text-2xl font-semibold text-gray-800 text-center">
                    {isConnected ? 'Conexão Estabelecida' : 'Conectar WhatsApp'}
                  </Dialog.Title>
                  <div className="mt-4 w-full h-60 flex items-center justify-center">
                    {isConnected ? (
                      <Player
                        autoplay
                        loop
                        src="/success.json"
                        style={{ height: "200px", width: "200px" }}
                      />
                    ) : qrCode ? (
                      <img
                        src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                        alt="QR Code"
                        className="max-h-full max-w-full"
                      />
                    ) : (
                      <p className="text-gray-500">Carregando QR Code...</p>
                    )}
                  </div>
                  {error && <p className="mt-2 text-red-600 text-center">{error}</p>}
                  <button
                    onClick={handleConclude}
                    className="mt-6 px-4 py-2 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors disabled:bg-gray-400"
                    disabled={!isConnected}
                  >
                    Concluir
                  </button>
                </>
              )}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
