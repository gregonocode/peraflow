'use client';

import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface InteracoesTabBarProps {
  liveId: string;
  activeTab: 'criar' | 'ver';
}

export default function InteracoesTabBar({ liveId, activeTab }: InteracoesTabBarProps) {
  const router = useRouter();

  return (
    <Tabs defaultValue={activeTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger
          value="criar"
          onClick={() => router.push(`/dashboard/criarlives/interacoes/criar_interacoes/${liveId}`)}
        >
          Adicionar Interação
        </TabsTrigger>
        <TabsTrigger
          value="ver"
          onClick={() => router.push(`/dashboard/criarlives/interacoes/ver_interacoes/${liveId}`)}
        >
          Ver Interações
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export { InteracoesTabBar };