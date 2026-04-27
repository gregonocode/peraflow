// src/app/dashboard/trackeamento/page.tsx
'use client';

import { useState, useEffect, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import * as Select from '@radix-ui/react-select';
import { Switch } from '@radix-ui/react-switch';
import {
  ChevronDown,
  Plus,
  Save,
  Radio,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { FaStream, FaFacebook, FaTiktok, FaTrash } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import toast, { Toaster } from 'react-hot-toast';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Live {
  id: string;
  title: string;
}

interface SocialPixel {
  nome: string;
  pixel_id: string;
  ativo: boolean;
}

interface GooglePixel {
  nome: string;
  ativo: boolean;
  tipo: 'GA4' | 'GTM' | 'ADS';
  codigo: string;
  script_custom: string;
}

const emptySocialPixel: SocialPixel = {
  nome: '',
  pixel_id: '',
  ativo: false,
};

const emptyGooglePixel: GooglePixel = {
  nome: '',
  ativo: false,
  tipo: 'GA4',
  codigo: '',
  script_custom: '',
};

function StatusPill({
  active,
  activeLabel = 'Ativo',
  inactiveLabel = 'Inativo',
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? 'bg-emerald-500' : 'bg-gray-400'
        }`}
      />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
  right,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-100">
            {icon}
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#181818]">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
        </div>

        {right}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function PlatformPixelsSection({
  platform,
  icon,
  description,
  pixels,
  setPixels,
  placeholderId,
  addLabel,
}: {
  platform: string;
  icon: ReactNode;
  description: string;
  pixels: SocialPixel[];
  setPixels: Dispatch<SetStateAction<SocialPixel[]>>;
  placeholderId: string;
  addLabel: string;
}) {
  const activeCount = pixels.filter((pixel) => pixel.ativo).length;

  const addPixel = () => {
    setPixels((prev) => [...prev, { ...emptySocialPixel }]);
  };

  const removePixel = (index: number) => {
    setPixels((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ ...emptySocialPixel }];
    });
  };

  const updatePixel = (
    index: number,
    field: 'nome' | 'pixel_id' | 'ativo',
    value: string | boolean
  ) => {
    setPixels((prev) =>
      prev.map((pixel, i) =>
        i === index ? { ...pixel, [field]: value } : pixel
      )
    );
  };

  return (
    <SectionCard
      icon={icon}
      title={platform}
      description={description}
      right={<StatusPill active={activeCount > 0} activeLabel={`${activeCount} ativo(s)`} />}
    >
      <div className="space-y-3">
        {pixels.map((pixel, index) => (
          <div
            key={index}
            className={`rounded-xl border p-4 transition-colors ${
              pixel.ativo
                ? 'border-emerald-200 bg-emerald-50/40'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#181818]">
                  {pixel.nome || `Pixel ${index + 1}`}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {pixel.pixel_id || 'Nenhum ID informado'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={pixel.ativo}
                  onCheckedChange={(checked) => updatePixel(index, 'ativo', checked)}
                  className="relative h-6 w-11 rounded-full bg-gray-300 transition-colors data-[state=checked]:bg-[#059669]"
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      pixel.ativo ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </Switch>

                {pixels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePixel(index)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Remover pixel"
                  >
                    <FaTrash className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {pixel.ativo && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Nome interno
                  </label>
                  <input
                    type="text"
                    value={pixel.nome}
                    onChange={(e) => updatePixel(index, 'nome', e.target.value)}
                    placeholder="Ex: Pixel principal"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#181818] outline-none transition focus:border-[#059669] focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    ID do pixel
                  </label>
                  <input
                    type="text"
                    value={pixel.pixel_id}
                    onChange={(e) => updatePixel(index, 'pixel_id', e.target.value)}
                    placeholder={placeholderId}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#181818] outline-none transition focus:border-[#059669] focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addPixel}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-[#059669] transition hover:bg-emerald-100"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </button>
    </SectionCard>
  );
}

export default function TrackingPage() {
  const [lives, setLives] = useState<Live[]>([]);
  const [selectedLive, setSelectedLive] = useState<string>('');
  const [facebookPixels, setFacebookPixels] = useState<SocialPixel[]>([{ ...emptySocialPixel }]);
  const [tiktokPixels, setTiktokPixels] = useState<SocialPixel[]>([{ ...emptySocialPixel }]);
  const [googlePixel, setGooglePixel] = useState<GooglePixel>({ ...emptyGooglePixel });
  const [loading, setLoading] = useState(true);
  const [loadingPixels, setLoadingPixels] = useState(false);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const selectedLiveTitle =
    lives.find((live) => live.id === selectedLive)?.title || 'Nenhuma live selecionada';

  const facebookActiveCount = facebookPixels.filter((pixel) => pixel.ativo).length;
  const tiktokActiveCount = tiktokPixels.filter((pixel) => pixel.ativo).length;
  const totalActiveCount =
    facebookActiveCount + tiktokActiveCount + (googlePixel.ativo ? 1 : 0);

  useEffect(() => {
    async function fetchData() {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      const { data: liveData, error: liveError } = await supabase
        .from('lives')
        .select('id, title')
        .eq('user_id', user.id)
        .order('title', { ascending: true });

      if (liveError) {
        console.error('Erro ao buscar lives:', liveError);
        setLives([]);
      } else {
        setLives(liveData || []);
        if (liveData && liveData.length > 0) {
          setSelectedLive(liveData[0].id);
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [router]);

  useEffect(() => {
    if (!selectedLive) return;

    async function fetchPixels() {
      setLoadingPixels(true);

      const { data: facebookData, error: facebookError } = await supabase
        .from('pixel_facebook')
        .select('id, live_id, nome, pixel_id, ativo')
        .eq('live_id', selectedLive);

      if (facebookError) {
        console.error('Erro ao buscar pixel_facebook:', facebookError);
        setFacebookPixels([{ ...emptySocialPixel }]);
      } else {
        setFacebookPixels(
          facebookData && facebookData.length > 0
            ? facebookData
            : [{ ...emptySocialPixel }]
        );
      }

      const { data: tiktokData, error: tiktokError } = await supabase
        .from('pixel_tiktok')
        .select('id, live_id, nome, pixel_id, ativo')
        .eq('live_id', selectedLive);

      if (tiktokError) {
        console.error('Erro ao buscar pixel_tiktok:', tiktokError);
        setTiktokPixels([{ ...emptySocialPixel }]);
      } else {
        setTiktokPixels(
          tiktokData && tiktokData.length > 0
            ? tiktokData
            : [{ ...emptySocialPixel }]
        );
      }

      const { data: googleData, error: googleError } = await supabase
        .from('pixel_google')
        .select('id, live_id, nome, pixel_id, ativo, tipo, codigo, script_custom')
        .eq('live_id', selectedLive)
        .single();

      if (googleError && googleError.code !== 'PGRST116') {
        console.error('Erro ao buscar pixel_google:', googleError);
        setGooglePixel({ ...emptyGooglePixel });
      } else {
        setGooglePixel(
          googleData
            ? {
                nome: googleData.nome || '',
                ativo: Boolean(googleData.ativo),
                tipo: googleData.tipo || 'GA4',
                codigo: googleData.codigo || googleData.pixel_id || '',
                script_custom: googleData.script_custom || '',
              }
            : { ...emptyGooglePixel }
        );
      }

      setLoadingPixels(false);
    }

    fetchPixels();
  }, [selectedLive]);

  const updateGooglePixel = (
    field: 'nome' | 'ativo' | 'tipo' | 'codigo' | 'script_custom',
    value: string | boolean
  ) => {
    setGooglePixel((prev) => ({ ...prev, [field]: value }));
  };

  const savePixels = async (table: string, pixels: SocialPixel[]) => {
    await supabase.from(table).delete().eq('live_id', selectedLive);

    const validPixels = pixels.filter((pixel) => pixel.nome && pixel.pixel_id);

    if (validPixels.length > 0) {
      const { error } = await supabase.from(table).insert(
        validPixels.map((pixel) => ({
          live_id: selectedLive,
          nome: pixel.nome,
          pixel_id: pixel.pixel_id,
          ativo: pixel.ativo,
        }))
      );

      if (error) {
        console.error(`Erro ao salvar ${table}:`, error);
        return false;
      }
    }

    return true;
  };

  const saveGooglePixel = async () => {
    await supabase.from('pixel_google').delete().eq('live_id', selectedLive);

    if (googlePixel.nome && googlePixel.codigo && googlePixel.tipo) {
      const { error } = await supabase.from('pixel_google').insert({
        live_id: selectedLive,
        nome: googlePixel.nome,
        pixel_id: googlePixel.codigo,
        ativo: googlePixel.ativo,
        tipo: googlePixel.tipo,
        codigo: googlePixel.codigo,
        script_custom: googlePixel.script_custom || null,
      });

      if (error) {
        console.error('Erro ao salvar pixel_google:', error);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!selectedLive) {
      toast.error('Selecione uma live antes de salvar.');
      return;
    }

    setSaving(true);

    const success = await Promise.all([
      savePixels('pixel_facebook', facebookPixels),
      savePixels('pixel_tiktok', tiktokPixels),
      saveGooglePixel(),
    ]);

    if (success.every(Boolean)) {
      toast.success('Configurações salvas com sucesso!');
    } else {
      toast.error('Erro ao salvar configurações.');
    }

    setSaving(false);
  };

  return (
    <div className="font-lato min-h-screen bg-[#F3F4F8] px-4 py-8 sm:px-6 lg:px-8">
      <Toaster position="top-right" />

      <div className="mx-auto max-w-6xl">
        <div className="mb-8 overflow-hidden rounded-3xl bg-[#181818] p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-100 ring-1 ring-white/10">
                <Radio className="h-3.5 w-3.5" />
                Rastreamento das lives
              </div>

              <h1 className="text-2xl font-bold sm:text-3xl">
                Configuração de Rastreamento
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">
                Configure Facebook Pixel, TikTok Pixel e Google Tracking para medir acessos,
                campanhas e conversões das suas lives.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
              <p className="text-xs text-gray-300">Pixels ativos nesta live</p>
              <p className="mt-1 text-3xl font-bold">{totalActiveCount}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">
            Carregando configurações...
          </div>
        ) : lives.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h2 className="font-semibold">Nenhuma live encontrada</h2>
                <p className="mt-1 text-sm">
                  Crie uma live primeiro para conseguir configurar pixels e rastreamento.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <SectionCard
              icon={<FaStream className="h-5 w-5 text-[#059669]" />}
              title="Live selecionada"
              description="Escolha em qual live esses pixels serão aplicados."
              right={<StatusPill active={Boolean(selectedLive)} activeLabel="Selecionada" />}
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_280px] lg:items-center">
                <Select.Root value={selectedLive} onValueChange={setSelectedLive}>
                  <Select.Trigger className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-[#181818] outline-none transition hover:bg-white focus:border-[#059669] focus:ring-2 focus:ring-emerald-100">
                    <Select.Value placeholder="Selecione uma live" />
                    <ChevronDown className="h-5 w-5 text-[#059669]" />
                  </Select.Trigger>

                  <Select.Portal>
                    <Select.Content
                      className="z-50 min-w-[260px] rounded-xl border border-gray-200 bg-white p-2 shadow-xl"
                      sideOffset={6}
                    >
                      <Select.Viewport>
                        {lives.map((live) => (
                          <Select.Item
                            key={live.id}
                            value={live.id}
                            className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[#181818] outline-none hover:bg-emerald-50 focus:bg-emerald-50"
                          >
                            <Select.ItemText>{live.title}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>

                <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 ring-1 ring-gray-100">
                  <span className="block text-xs font-medium text-gray-400">Editando</span>
                  <span className="mt-0.5 block truncate font-semibold text-[#181818]">
                    {selectedLiveTitle}
                  </span>
                </div>
              </div>

              {loadingPixels && (
                <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700 ring-1 ring-blue-100">
                  Carregando pixels dessa live...
                </div>
              )}
            </SectionCard>

            <div className="grid gap-6 xl:grid-cols-2">
              <PlatformPixelsSection
                platform="Facebook Pixel"
                icon={<FaFacebook className="h-5 w-5 text-blue-600" />}
                description="Adicione um ou mais pixels para rastrear visitas e conversões do Facebook/Meta."
                pixels={facebookPixels}
                setPixels={setFacebookPixels}
                placeholderId="Ex: 123456789012345"
                addLabel="Adicionar outro Facebook Pixel"
              />

              <PlatformPixelsSection
                platform="TikTok Pixel"
                icon={<FaTiktok className="h-5 w-5 text-black" />}
                description="Configure pixels do TikTok para campanhas, eventos e remarketing."
                pixels={tiktokPixels}
                setPixels={setTiktokPixels}
                placeholderId="Ex: CXXXXXXXXXXXXXX"
                addLabel="Adicionar outro TikTok Pixel"
              />

              <div className="xl:col-span-2">
                <SectionCard
                  icon={<FcGoogle className="h-6 w-6" />}
                  title="Google Tracking"
                  description="Use GA4, Google Tag Manager ou Google Ads para rastreamento avançado."
                  right={<StatusPill active={googlePixel.ativo} />}
                >
                  <div
                    className={`rounded-xl border p-4 ${
                      googlePixel.ativo
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#181818]">
                          {googlePixel.nome || 'Google Tracking'}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {googlePixel.codigo || 'Nenhum código informado'}
                        </p>
                      </div>

                      <Switch
                        checked={googlePixel.ativo}
                        onCheckedChange={(checked) => updateGooglePixel('ativo', checked)}
                        className="relative h-6 w-11 rounded-full bg-gray-300 transition-colors data-[state=checked]:bg-[#059669]"
                      >
                        <span
                          className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                            googlePixel.ativo ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </Switch>
                    </div>

                    {googlePixel.ativo && (
                      <div className="mt-4 grid gap-3 lg:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Tipo
                          </label>

                          <Select.Root
                            value={googlePixel.tipo}
                            onValueChange={(value) =>
                              updateGooglePixel('tipo', value as GooglePixel['tipo'])
                            }
                          >
                            <Select.Trigger className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#181818] outline-none transition focus:border-[#059669] focus:ring-2 focus:ring-emerald-100">
                              <Select.Value placeholder="Selecione o tipo" />
                              <ChevronDown className="h-5 w-5 text-[#059669]" />
                            </Select.Trigger>

                            <Select.Portal>
                              <Select.Content
                                className="z-50 min-w-[220px] rounded-xl border border-gray-200 bg-white p-2 shadow-xl"
                                sideOffset={6}
                              >
                                <Select.Viewport>
                                  {['GA4', 'GTM', 'ADS'].map((tipo) => (
                                    <Select.Item
                                      key={tipo}
                                      value={tipo}
                                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[#181818] outline-none hover:bg-emerald-50 focus:bg-emerald-50"
                                    >
                                      <Select.ItemText>{tipo}</Select.ItemText>
                                    </Select.Item>
                                  ))}
                                </Select.Viewport>
                              </Select.Content>
                            </Select.Portal>
                          </Select.Root>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Nome interno
                          </label>
                          <input
                            type="text"
                            value={googlePixel.nome}
                            onChange={(e) => updateGooglePixel('nome', e.target.value)}
                            placeholder="Ex: Google principal"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#181818] outline-none transition focus:border-[#059669] focus:ring-2 focus:ring-emerald-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Código
                          </label>
                          <input
                            type="text"
                            value={googlePixel.codigo}
                            onChange={(e) => updateGooglePixel('codigo', e.target.value)}
                            placeholder="G-XXXX, GTM-XXXX ou AW-XXXX"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#181818] outline-none transition focus:border-[#059669] focus:ring-2 focus:ring-emerald-100"
                          />
                        </div>

                        <div className="lg:col-span-3">
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Script personalizado opcional
                          </label>
                          <textarea
                            value={googlePixel.script_custom ?? ''}
                            onChange={(e) => updateGooglePixel('script_custom', e.target.value)}
                            placeholder="Cole o script personalizado aqui, se precisar..."
                            className="min-h-[120px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#181818] outline-none transition focus:border-[#059669] focus:ring-2 focus:ring-emerald-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>
            </div>

            <div className="sticky bottom-4 z-10 rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-lg backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
                  <span>
                    As alterações serão aplicadas apenas na live selecionada:{' '}
                    <strong className="text-[#181818]">{selectedLiveTitle}</strong>.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !selectedLive}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#181818] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#059669] ${
                    saving || !selectedLive ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  {saving ? (
                    'Salvando...'
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </button>
              </div>
            </div>

            {totalActiveCount > 0 && (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                Essa live possui {totalActiveCount} configuração(ões) de rastreamento ativa(s).
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
