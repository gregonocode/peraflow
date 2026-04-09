'use client';

import { FC, useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Script from 'next/script';
import { useRouter, usePathname } from 'next/navigation';

interface Live {
  id: string;
  title: string;
  video_url: string | null;
  expires_at: string | null;
  minuto_oferta: number;
  link_oferta: string;
}

interface Interacao {
  id: string;
  user_live: string;
  comentario: string;
  tempo: number;
  user_temp_id: string | null;
}

interface Link {
  id: string;
  live_id: string;
  url: string;
  expires_at: string | null;
  is_active: boolean;
}

type PixelTipo = 'GA4' | 'GTM' | 'ADS';

interface Pixel {
  id: string;
  live_id: string;
  nome: string;
  pixel_id?: string;
  ativo: boolean;
  tipo?: PixelTipo;
  codigo?: string;
  script_custom?: string;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUNNY_LIBRARY_ID = '409926';

const Avatar = ({ name }: { name: string }) => {
  const initial = name.charAt(0).toUpperCase();
  const colors = [
    'bg-yellow-200',
    'bg-blue-200',
    'bg-green-200',
    'bg-pink-200',
    'bg-purple-200',
    'bg-red-200',
    'bg-orange-200',
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgColor} text-white font-bold text-sm`}>
      {initial}
    </div>
  );
};

const convertVideoUrl = (url: string, muted: boolean = true) => {
  if (url.includes('iframe.mediadelivery.net')) {
    return muted ? url : url.replace('muted=true', 'muted=false');
  }
  const guidMatch = url.match(/vz-([a-f0-9-]+)/);
  if (guidMatch && guidMatch[1]) {
    const guid = guidMatch[1];
    return `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${guid}?autoplay=true&loop=false&muted=${muted}&preload=true&responsive=true&controls=true`;
  }
  return url;
};

const LivePage: FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const id = pathname.split('/')[2];

  const [live, setLive] = useState<Live | null>(null);
  const [link, setLink] = useState<Link | null>(null);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [visibleInteracoes, setVisibleInteracoes] = useState<Interacao[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [userTempId, setUserTempId] = useState<string | null>(null);
  const [showOferta, setShowOferta] = useState(false);

  // Aviso “Verifique o áudio” (não clicável, 5s)
  const [showAudioNudge, setShowAudioNudge] = useState<boolean>(false);

  const [facebookPixels, setFacebookPixels] = useState<Pixel[]>([]);
  const [tiktokPixels, setTiktokPixels] = useState<Pixel[]>([]);
  const [googlePixel, setGooglePixel] = useState<Pixel | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Exibe o aviso por 5s sempre que a página abre
  useEffect(() => {
    setShowAudioNudge(true);
    const t: ReturnType<typeof setTimeout> = setTimeout(() => {
      setShowAudioNudge(false);
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let tempId = localStorage.getItem('user_temp_id');
    if (!tempId) {
      tempId = crypto.randomUUID();
      localStorage.setItem('user_temp_id', tempId);
    }
    setUserTempId(tempId);
  }, []);

  useEffect(() => {
    if (!id || !userTempId) return;

    async function checkAccess() {
      try {
        const { data, error: accessError } = await supabase
          .from('acessos_lives')
          .select('redirecionado')
          .eq('user_temp_id', userTempId)
          .eq('live_id', id)
          .single();

        if (accessError && accessError.code !== 'PGRST116') {
          setError('Erro ao verificar acesso: ' + accessError.message);
          setLoading(false);
          return;
        }

        if (data && data.redirecionado) {
          router.push('/live-encerrada');
          return;
        }

        const response = await fetch('/api/registrar-acesso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ live_id: id }),
        });

        if (!response.ok) {
          const result: { error: string } = await response.json();
          throw new Error(result.error);
        }
      } catch {
        setError('Erro ao verificar acesso');
        setLoading(false);
      }
    }

    checkAccess();
  }, [id, userTempId, router]);

  useEffect(() => {
    async function fetchLiveAndLink() {
      const { data: linkData, error: linkError } = await supabase
        .from('links')
        .select('id, live_id, url, expires_at, is_active')
        .eq('live_id', id)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);

      if (linkError || !linkData || linkData.length === 0) {
        setError('Link inválido ou expirado: ' + (linkError?.message || 'Link não encontrado'));
        setLoading(false);
        return;
      }
      setLink(linkData[0]);

      const { data: liveData, error: liveError } = await supabase
        .from('lives')
        .select(`
          id,
          title,
          video_url,
          expires_at,
          minuto_oferta,
          link_oferta
        `)
        .eq('id', id)
        .single();

      if (liveError || !liveData) {
        setError('Erro ao carregar a live: ' + (liveError?.message || 'Live não encontrada'));
        setLoading(false);
        return;
      }

      const expiresAt = liveData.expires_at ? new Date(liveData.expires_at) : null;
      if (expiresAt && expiresAt < new Date()) {
        setError('Esta live expirou');
        setLoading(false);
        return;
      }

      setLive(liveData);

      const { data: facebookPixelData } = await supabase
        .from('pixel_facebook')
        .select('id, live_id, nome, pixel_id, ativo')
        .eq('live_id', id)
        .eq('ativo', true);
      setFacebookPixels(facebookPixelData || []);

      const { data: tiktokPixelData } = await supabase
        .from('pixel_tiktok')
        .select('id, live_id, nome, pixel_id, ativo')
        .eq('live_id', id)
        .eq('ativo', true);
      setTiktokPixels(tiktokPixelData || []);

      const { data: googlePixelData } = await supabase
        .from('pixel_google')
        .select('id, live_id, nome, pixel_id, ativo, tipo, codigo, script_custom')
        .eq('live_id', id)
        .eq('ativo', true)
        .single();
      setGooglePixel(googlePixelData || null);

      setLoading(false);
    }

    fetchLiveAndLink();
  }, [id]);

  useEffect(() => {
    async function fetchInteracoes() {
      const { data, error: interError } = await supabase
        .from('interacoes')
        .select('id, user_live, comentario, tempo, user_temp_id')
        .eq('live_id', id)
        .order('tempo', { ascending: true });

      if (!interError) {
        const filteredData =
          data?.filter(
            (interacao) => !interacao.user_temp_id || interacao.user_temp_id === userTempId
          ) || [];
        setInteracoes(filteredData);
      }
    }

    if (userTempId) {
      fetchInteracoes();

      const subscription = supabase
        .channel(`interacoes:live_id=${id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'interacoes',
            filter: `live_id=eq.${id}`,
          },
          (payload) => {
            const newInteracao = payload.new as Interacao;
            if (!newInteracao.user_temp_id || newInteracao.user_temp_id === userTempId) {
              setInteracoes((prev) => [...prev, newInteracao]);
              if (newInteracao.tempo <= currentTime) {
                setVisibleInteracoes((prev) => [...prev, newInteracao]);
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [id, currentTime, userTempId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const newlyVisible = interacoes.filter(
      (interacao) =>
        interacao.tempo <= currentTime && !visibleInteracoes.some((v) => v.id === interacao.id)
    );
    if (newlyVisible.length > 0) {
      setVisibleInteracoes((prev) => [...prev, ...newlyVisible]);
    }
  }, [currentTime, interacoes, visibleInteracoes]);

  useEffect(() => {
    if (live && !showOferta && currentTime >= live.minuto_oferta) {
      setShowOferta(true);
    }
  }, [currentTime, live, showOferta]);

  useEffect(() => {
    if (showOferta && live?.link_oferta && userTempId) {
      const markRedirected = async () => {
        try {
          const response = await fetch('/api/marcar-redirecionado', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_temp_id: userTempId, live_id: id }),
            credentials: 'include',
          });

          if (!response.ok) {
            const result: { error: string } = await response.json();
            throw new Error(result.error);
          }
        } catch {
          /* noop */
        }
      };

      markRedirected().then(() => {
        window.location.href = live.link_oferta;
      });
    }
  }, [showOferta, live, id, userTempId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [visibleInteracoes]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userTempId) return;

    const userLive = 'Anônimo';
    const deleteAt = new Date(Date.now() + 60 * 60 * 1000);

    const { error: insertError } = await supabase.from('interacoes').insert({
      live_id: id,
      user_live: userLive,
      comentario: newMessage,
      tempo: 0,
      user_temp_id: userTempId,
      delete_at: deleteAt.toISOString(),
    });

    if (insertError) {
      alert('Erro ao enviar mensagem.');
    } else {
      setNewMessage('');
    }
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading)
    return <div className="h-screen flex items-center justify-center">Carregando...</div>;
  if (error || !live)
    return (
      <div className="h-screen flex items-center justify-center">
        {error || 'Live não encontrada'}
      </div>
    );

  const videoSource = live.video_url || link?.url;
  // força muted=true; o usuário pode desmutar pelo player
  const convertedVideoUrl = videoSource ? convertVideoUrl(videoSource, true) : '';

  return (
    <>
      {facebookPixels.map(
        (pixel) =>
          pixel.ativo &&
          pixel.pixel_id && (
            <Script key={pixel.id} id={`facebook-pixel-${pixel.id}`} strategy="afterInteractive">
              {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${pixel.pixel_id}');
              fbq('track', 'PageView');
            `}
            </Script>
          )
      )}

      {tiktokPixels.map(
        (pixel) =>
          pixel.ativo &&
          pixel.pixel_id && (
            <Script key={pixel.id} id={`tiktok-pixel-${pixel.id}`} strategy="afterInteractive">
              {`
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=e||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${pixel.pixel_id}');ttq.page();
              }(window, document, 'ttq');
            `}
            </Script>
          )
      )}

      {googlePixel?.ativo && (
        <>
          {googlePixel.script_custom ? (
            <Script
              key={googlePixel.id}
              id={`google-pixel-custom-${googlePixel.id}`}
              strategy="afterInteractive"
            >
              {googlePixel.script_custom}
            </Script>
          ) : (
            <>
              {googlePixel.tipo === 'GA4' && googlePixel.codigo && (
                <Script
                  key={googlePixel.id}
                  id={`google-pixel-ga4-${googlePixel.id}`}
                  strategy="afterInteractive"
                >
                  {`
                    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtag/js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${googlePixel.codigo}');
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${googlePixel.codigo}', { 'page_title': '${live.title}', 'page_path': '/live/${id}' });
                  `}
                </Script>
              )}
              {googlePixel.tipo === 'GTM' && googlePixel.codigo && (
                <Script
                  key={googlePixel.id}
                  id={`google-pixel-gtm-${googlePixel.id}`}
                  strategy="afterInteractive"
                >
                  {`
                    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${googlePixel.codigo}');
                  `}
                </Script>
              )}
              {googlePixel.tipo === 'ADS' && googlePixel.codigo && (
                <Script
                  key={googlePixel.id}
                  id={`google-pixel-ads-${googlePixel.id}`}
                  strategy="afterInteractive"
                >
                  {`
                    (function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${googlePixel.codigo}"};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");
                  `}
                </Script>
              )}
            </>
          )}
        </>
      )}

      <div className="flex flex-col h-screen bg-gray-100 font-lato md:flex-row">
        <div className="w-full md:w-4/5 bg-black order-1">
          {convertedVideoUrl ? (
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={convertedVideoUrl}
                title={live.title}
                className="absolute top-0 left-0 w-full h-full rounded-lg md:rounded-none"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
              {/* Aviso não clicável “Verifique o áudio” por 5s ao abrir a página (no lugar do botão removido) */}
              {showAudioNudge && (
                <div className="pointer-events-none absolute bottom-5 right-5" aria-live="polite" role="status">
                  <div className="bg-black/70 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
                    ☝️ Verifique o áudio
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[56.25vw] md:h-full text-white text-center">
              <div>
                <p className="text-xl">{live.title}</p>
                <p>ID da Live: {id}</p>
                <p>Vídeo ainda não configurado</p>
              </div>
            </div>
          )}
        </div>

        <div className="w-full md:w-1/5 flex-1 order-2">
          {!showOferta && (
            <div className="h-full bg-white border-r border-gray-200 flex flex-col p-4">
              <h2 className="text-lg font-semibold mb-4 text-[#1e1e1e]">Bate-papo</h2>
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto flex flex-col justify-end space-y-3 p-2"
              >
                {visibleInteracoes.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhum comentário no chat.</p>
                ) : (
                  [...visibleInteracoes].reverse().map((interacao) => {
                    const isCurrentUser = interacao.user_temp_id === userTempId;
                    return (
                      <div
                        key={interacao.id}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          isCurrentUser ? 'bg-blue-50' : 'bg-gray-50'
                        }`}
                      >
                        {!isCurrentUser && <Avatar name={interacao.user_live} />}
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              {isCurrentUser ? 'Você:' : interacao.user_live}
                            </p>
                            <p className="text-xs text-gray-500">{getCurrentTime()}</p>
                          </div>
                          <p className="text-sm text-gray-700">{interacao.comentario}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="sticky bottom-0 bg-white pt-4">
                <div className="flex items-center">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    aria-label="Digite sua mensagem no chat"
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#181818]"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="ml-2 p-2 bg-[#181818] text-white rounded-lg hover:bg-[#2a2a2a]"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LivePage;
