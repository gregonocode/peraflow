'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import * as Select from '@radix-ui/react-select';
import { Switch } from '@radix-ui/react-switch';
import { ChevronDown, Plus } from 'lucide-react';
import { FaStream, FaFacebook, FaTiktok, FaTrash } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import toast, { Toaster } from 'react-hot-toast';

// Inicializar Supabase
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

export default function TrackingPage() {
  const [lives, setLives] = useState<Live[]>([]);
  const [selectedLive, setSelectedLive] = useState<string>('');
  const [facebookPixels, setFacebookPixels] = useState<SocialPixel[]>([{ nome: '', pixel_id: '', ativo: false }]);
  const [tiktokPixels, setTiktokPixels] = useState<SocialPixel[]>([{ nome: '', pixel_id: '', ativo: false }]);
  const [googlePixel, setGooglePixel] = useState<{
    nome: string;
    ativo: boolean;
    tipo: 'GA4' | 'GTM' | 'ADS';
    codigo: string;
    script_custom: string;
  }>({ nome: '', ativo: false, tipo: 'GA4', codigo: '', script_custom: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Buscar lives e pixels do Supabase
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

  // Buscar pixels ao mudar a live selecionada
  useEffect(() => {
    if (!selectedLive) return;

    async function fetchPixels() {
      const { data: facebookData, error: facebookError } = await supabase
        .from('pixel_facebook')
        .select('id, live_id, nome, pixel_id, ativo')
        .eq('live_id', selectedLive);

      if (facebookError) {
        console.error('Erro ao buscar pixel_facebook:', facebookError);
        setFacebookPixels([{ nome: '', pixel_id: '', ativo: false }]);
      } else {
        setFacebookPixels(facebookData.length > 0 ? facebookData : [{ nome: '', pixel_id: '', ativo: false }]);
      }

      const { data: tiktokData, error: tiktokError } = await supabase
        .from('pixel_tiktok')
        .select('id, live_id, nome, pixel_id, ativo')
        .eq('live_id', selectedLive);

      if (tiktokError) {
        console.error('Erro ao buscar pixel_tiktok:', tiktokError);
        setTiktokPixels([{ nome: '', pixel_id: '', ativo: false }]);
      } else {
        setTiktokPixels(tiktokData.length > 0 ? tiktokData : [{ nome: '', pixel_id: '', ativo: false }]);
      }

      const { data: googleData, error: googleError } = await supabase
        .from('pixel_google')
        .select('id, live_id, nome, pixel_id, ativo, tipo, codigo, script_custom')
        .eq('live_id', selectedLive)
        .single();

      if (googleError && googleError.code !== 'PGRST116') {
        console.error('Erro ao buscar pixel_google:', googleError);
        setGooglePixel({ nome: '', ativo: false, tipo: 'GA4', codigo: '', script_custom: '' });
      } else {
        setGooglePixel(googleData || { nome: '', ativo: false, tipo: 'GA4', codigo: '', script_custom: '' });
      }
    }
    fetchPixels();
  }, [selectedLive]);

  // Adicionar novo pixel
  const addPixel = (setPixels: React.Dispatch<React.SetStateAction<SocialPixel[]>>) => {
    setPixels((prev) => [...prev, { nome: '', pixel_id: '', ativo: false }]);
  };

  // Remover pixel
  const removePixel = (index: number, setPixels: React.Dispatch<React.SetStateAction<SocialPixel[]>>) => {
    setPixels((prev) => prev.filter((_, i) => i !== index));
  };

  // Atualizar pixel do Facebook ou TikTok
  const updatePixel = (
    index: number,
    field: 'nome' | 'pixel_id' | 'ativo',
    value: string | boolean,
    setPixels: React.Dispatch<React.SetStateAction<SocialPixel[]>>
  ) => {
    setPixels((prev) =>
      prev.map((pixel, i) =>
        i === index ? { ...pixel, [field]: value } : pixel
      )
    );
  };

  // Atualizar pixel do Google
  const updateGooglePixel = (
    field: 'nome' | 'ativo' | 'tipo' | 'codigo' | 'script_custom',
    value: string | boolean
  ) => {
    setGooglePixel((prev) => ({ ...prev, [field]: value }));
  };

  // Função de salvamento
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

    if (success.every((s) => s)) {
      toast.success('Configurações salvas com sucesso!');
    } else {
      toast.error('Erro ao salvar configurações.');
    }
    setSaving(false);
  };

  return (
    <div className="font-lato min-h-screen bg-[#F3F4F8] py-12 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1e1e1e] mb-6 text-center">
          Configuração de Rastreamento
        </h1>
        <p className="text-lg text-gray-600 mb-12 text-center">
          Configure o rastreamento para suas lives selecionando a live e os pixels desejados.
        </p>

        {loading ? (
          <div className="text-center text-gray-600">Carregando...</div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-lg space-y-8">
            {/* Seção: Selecionar Live */}
            <div className="bg-gray-50 p-6 rounded-md">
              <h2 className="text-xl font-semibold text-[#1e1e1e] flex items-center gap-2 mb-4">
                <FaStream className="text-green-500" /> Selecione Uma Live
              </h2>
              <Select.Root
                value={selectedLive}
                onValueChange={setSelectedLive}
              >
                <Select.Trigger
                  className="w-full flex items-center justify-between px-4 py-2 border border-[#181818] rounded-md text-sm font-medium text-[#1e1e1e] bg-white hover:bg-[#E6FFFA] transition-colors"
                >
                  <Select.Value placeholder="Selecione uma live" />
                  <ChevronDown className="w-5 h-5 text-[#059669]" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    className="min-w-[220px] bg-white rounded-md shadow-lg p-2 z-50"
                    sideOffset={5}
                  >
                    <Select.Viewport>
                      {lives.length === 0 ? (
                        <Select.Item
                          value="Sem Call Lives"
                          disabled
                          className="flex items-center p-2 text-[#1e1e1e] opacity-50"
                        >
                          <Select.ItemText>Nenhuma live encontrada</Select.ItemText>
                        </Select.Item>
                      ) : (
                        lives.map((live) => (
                          <Select.Item
                            key={live.id}
                            value={live.id}
                            className="flex items-center p-2 text-[#1e1e1e] hover:bg-[#E6FFFA] rounded cursor-pointer"
                          >
                            <Select.ItemText>{live.title}</Select.ItemText>
                          </Select.Item>
                        ))
                      )}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Seção: Facebook Pixel */}
            <div className="bg-gray-50 p-6 rounded-md">
              <h2 className="text-xl font-semibold text-[#1e1e1e] flex items-center gap-2 mb-4">
                <FaFacebook className="text-blue-600" /> Facebook Pixel
              </h2>
              {facebookPixels.map((pixel, index) => (
                <div key={index} className="mb-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-[#1e1e1e]">
                      <span className="font-bold">Pixel:</span>{' '}
                      <span className="font-normal text-gray-500">{pixel.nome || `Pixel ${index + 1}`}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={pixel.ativo}
                        onCheckedChange={(checked) => updatePixel(index, 'ativo', checked, setFacebookPixels)}
                        className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-[#059669]"
                      >
                        <span
                          className={`block w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                            pixel.ativo ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </Switch>
                      {facebookPixels.length > 1 && (
                        <button
                          onClick={() => removePixel(index, setFacebookPixels)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Remover pixel"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {pixel.ativo && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={pixel.nome}
                        onChange={(e) => updatePixel(index, 'nome', e.target.value, setFacebookPixels)}
                        placeholder="Nome do pixel"
                        className="w-full px-4 py-2 border border-[#181818] rounded-md text-sm text-[#1e1e1e] focus:outline-none focus:ring-2 focus:ring-[#059669]"
                      />
                      <input
                        type="text"
                        value={pixel.pixel_id}
                        onChange={(e) => updatePixel(index, 'pixel_id', e.target.value, setFacebookPixels)}
                        placeholder="Ex: FB-12345"
                        className="w-full px-4 py-2 border border-[#181818] rounded-md text-sm text-[#1e1e1e] focus:outline-none focus:ring-2 focus:ring-[#059669]"
                      />
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => addPixel(setFacebookPixels)}
                className="flex items-center text-sm text-[#059669] hover:underline"
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar outro Facebook Pixel
              </button>
            </div>

            {/* Seção: TikTok Pixel */}
            <div className="bg-gray-50 p-6 rounded-md">
              <h2 className="text-xl font-semibold text-[#1e1e1e] flex items-center gap-2 mb-4">
                <FaTiktok className="text-black" /> TikTok Pixel
              </h2>
              {tiktokPixels.map((pixel, index) => (
                <div key={index} className="mb-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-[#1e1e1e]">
                      <span className="font-bold">Pixel:</span>{' '}
                      <span className="font-normal text-gray-500">{pixel.nome || `Pixel ${index + 1}`}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={pixel.ativo}
                        onCheckedChange={(checked) => updatePixel(index, 'ativo', checked, setTiktokPixels)}
                        className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-[#059669]"
                      >
                        <span
                          className={`block w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                            pixel.ativo ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </Switch>
                      {tiktokPixels.length > 1 && (
                        <button
                          onClick={() => removePixel(index, setTiktokPixels)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Remover pixel"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {pixel.ativo && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={pixel.nome}
                        onChange={(e) => updatePixel(index, 'nome', e.target.value, setTiktokPixels)}
                        placeholder="Nome do pixel"
                        className="w-full px-4 py-2 border border-[#181818] rounded-md text-sm text-[#1e1e1e] focus:outline-none focus:ring-2 focus:ring-[#059669]"
                      />
                      <input
                        type="text"
                        value={pixel.pixel_id}
                        onChange={(e) => updatePixel(index, 'pixel_id', e.target.value, setTiktokPixels)}
                        placeholder="Ex: TT-12345"
                        className="w-full px-4 py-2 border border-[#181818] rounded-md text-sm text-[#1e1e1e] focus:outline-none focus:ring-2 focus:ring-[#059669]"
                      />
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => addPixel(setTiktokPixels)}
                className="flex items-center text-sm text-[#059669] hover:underline"
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar outro TikTok Pixel
              </button>
            </div>

            {/* Seção: Google Tracking */}
            <div className="bg-gray-50 p-6 rounded-md">
              <h2 className="text-xl font-semibold text-[#1e1e1e] flex items-center gap-2 mb-4">
                <FcGoogle /> Google Tracking
              </h2>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[#1e1e1e]">
                    <span className="font-bold">Pixel:</span>{' '}
                    <span className="font-normal text-gray-500">{googlePixel.nome || 'Google Pixel'}</span>
                  </label>
                  <Switch
                    checked={googlePixel.ativo}
                    onCheckedChange={(checked) => updateGooglePixel('ativo', checked)}
                    className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-[#059669]"
                  >
                    <span
                      className={`block w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                        googlePixel.ativo ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </Switch>
                </div>
                {googlePixel.ativo && (
                  <div className="space-y-2">
                    <Select.Root
                      value={googlePixel.tipo}
                      onValueChange={(value) => updateGooglePixel('tipo', value)}
                    >
                      <Select.Trigger
                        className="w-full flex items-center justify-between px-4 py-2 border border-[#181818] rounded-md text-sm font-medium text-[#1e1e1e] bg-white hover:bg-[#E6FFFA] transition-colors"
                      >
                        <Select.Value placeholder="Selecione o tipo" />
                        <ChevronDown className="w-5 h-5 text-[#059669]" />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content
                          className="min-w-[220px] bg-white rounded-md shadow-lg p-2 z-50"
                          sideOffset={5}
                        >
                          <Select.Viewport>
                            {['GA4', 'GTM', 'ADS'].map((tipo) => (
                              <Select.Item
                                key={tipo}
                                value={tipo}
                                className="flex items-center p-2 text-[#1e1e1e] hover:bg-[#E6FFFA] rounded cursor-pointer"
                              >
                                <Select.ItemText>{tipo}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                    <input
                      type="text"
                      value={googlePixel.nome}
                      onChange={(e) => updateGooglePixel('nome', e.target.value)}
                      placeholder="Nome do pixel"
                      className="w-full px-4 py-2 border border-[#181818] rounded-md text-sm text-[#1e1e1e] focus:outline-none focus:ring-2 focus:ring-[#059669]"
                    />
                    <input
                      type="text"
                      value={googlePixel.codigo}
                      onChange={(e) => updateGooglePixel('codigo', e.target.value)}
                      placeholder="Ex: G-XXXX, GTM-XXXX, AW-XXXX"
                      className="w-full px-4 py-2 border border-[#181818] rounded-md text-sm text-[#1e1e1e] focus:outline-none focus:ring-2 focus:ring-[#059669]"
                    />
                    <textarea
                      value={googlePixel.script_custom ?? ''}
                      onChange={(e) => updateGooglePixel('script_custom', e.target.value)}
                      placeholder="Cole o script personalizado aqui (opcional)"
                      className="w-full px-4 py-2 border border-[#181818] rounded-md text-sm text-[#1e1e1e] focus:outline-none focus:ring-2 focus:ring-[#059669] min-h-[100px]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Botão de Salvar */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || !selectedLive}
                className={`inline-block px-6 py-3 bg-gradient-to-r from-[#181818] to-[#333333] text-white rounded-md text-sm font-medium hover:from-[#059669] hover:to-[#065F46] transition-all transform hover:scale-105 ${
                  saving || !selectedLive ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}