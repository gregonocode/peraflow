'use client';

import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';


ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Inicializar Supabase
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
    fill: boolean;
    pointRadius: number;
    pointHoverRadius: number;
  }[];
}

interface AccessData {
  time_bucket: string;
  access_count: number;
}

export default function Dashboard() {
  const [filter, setFilter] = useState<'daily' | '7days' | '30days'>('daily');
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData>({ labels: [], datasets: [] });
  const [accessToday, setAccessToday] = useState<number>(0);
  const [newAccess, setNewAccess] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      // Força o Supabase a atualizar o token da sessão (refresca o JWT)
    await supabase.auth.refreshSession();

      // Buscar dados do usuário
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/login');
        return;
      }

      // Buscar plano
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('plan_type')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      if (subError) {
        console.error('Erro ao buscar plano:', subError);
        setUserPlan('Nenhum plano ativo');
      } else {
        const planType = subscription?.plan_type?.toLowerCase();
        if (planType === 'basic') {
          setUserPlan('Basic');
        } else if (planType === 'pro'|| planType === 'premium') {
          setUserPlan('premium');
        } else {
          console.log('planType não reconhecido:', planType); // Adicione esta linha
          setUserPlan('Nenhum plano ativo');
        }
      }

      // Buscar dados da view
     const { data: accesses, error: accessError } = await supabase
     .from('live_accesses_aggregated')
     .select('time_bucket, access_count')
     .eq('user_id', user.id); // ✅ filtro por dono

      if (accessError) {
        console.error('Erro ao buscar acessos:', accessError);
        setChartData({ labels: [], datasets: [] });
        setAccessToday(0);
        setNewAccess(0);
        return;
      }

      // Processar dados
      let labels: string[] = [];
      let data: number[] = [];
      let todayAccesses = 0;
      let yesterdayAccesses = 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (accesses && accesses.length > 0) {
        if (filter === 'daily') {
          // Filtrar acessos de hoje e agrupar por hora
          const hourlyData: { [key: string]: number } = {};
          for (let i = 0; i < 24; i++) {
            hourlyData[`${i}`] = 0;
          }
          (accesses as AccessData[]).forEach((access) => {
            const accessDate = new Date(access.time_bucket);
            if (accessDate >= today) {
              const hour = accessDate.getHours();
              hourlyData[`${hour}`] = (hourlyData[`${hour}`] || 0) + access.access_count;
              todayAccesses += access.access_count;
            }
          });
          labels = Object.keys(hourlyData).map((h) => `${h}h`);
          data = Object.values(hourlyData);
        } else if (filter === '7days') {
          // Agrupar por dia (últimos 7 dias)
          const dailyData: { [key: string]: number } = {};
          for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dailyData[date.toISOString().split('T')[0]] = 0;
          }
          (accesses as AccessData[]).forEach((access) => {
            const accessDate = new Date(access.time_bucket);
            const dateKey = accessDate.toISOString().split('T')[0];
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            if (accessDate >= sevenDaysAgo) {
              dailyData[dateKey] = (dailyData[dateKey] || 0) + access.access_count;
              if (accessDate >= today) {
                todayAccesses += access.access_count;
              } else if (accessDate >= yesterday && accessDate < today) {
                yesterdayAccesses += access.access_count;
              }
            }
          });
          labels = Object.keys(dailyData).reverse().map((date) =>
            new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          );
          data = Object.values(dailyData).reverse();
        } else {
          // Agrupar por semana (últimos 30 dias)
          const weeklyData: { [key: string]: number } = {};
          for (let i = 0; i < 4; i++) {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - i * 7);
            weeklyData[weekStart.toISOString().split('T')[0]] = 0;
          }
          (accesses as AccessData[]).forEach((access) => {
            const accessDate = new Date(access.time_bucket);
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            if (accessDate >= thirtyDaysAgo) {
              const weekStart = new Date(accessDate);
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              const weekKey = weekStart.toISOString().split('T')[0];
              weeklyData[weekKey] = (weeklyData[weekKey] || 0) + access.access_count;
            }
          });
          labels = Object.keys(weeklyData).reverse().map((date, i) => `Semana ${4 - i}`);
          data = Object.values(weeklyData).reverse();
        }
      }

      setAccessToday(todayAccesses);
      setNewAccess(todayAccesses - yesterdayAccesses);

      setChartData({
        labels,
        datasets: [
          {
            label: 'Acessos à Live',
            data,
            borderColor: '#059669',
            backgroundColor: '#34D399',
            tension: 0.4,
            fill: false,
            pointRadius: 5,
            pointHoverRadius: 8,
          },
        ],
      });
    }
    fetchData();
  }, [router, filter]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#1e1e1e',
          font: {
            size: 14,
          },
        },
      },
      title: {
        display: true,
        text: 'Acessos à Sua Live',
        color: '#1e1e1e',
        font: {
          size: 18,
        },
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: '#059669',
        titleColor: '#E6FFFA',
        bodyColor: '#E6FFFA',
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#1e1e1e',
          font: {
            size: 12,
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          color: '#1e1e1e',
          font: {
            size: 12,
          },
        },
        grid: {
          color: '#e5e7eb',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="font-lato">
      <h1 className="text-3xl font-bold text-[#1e1e1e] mb-6">Bem-vindo ao seu Dashboard</h1>
      <p className="text-gray-600 mb-4">
        Acompanhe os acessos à sua live e gerencie sua estratégia!
      </p>
<div className="mb-4">
  <span
    className={`px-3 py-1 rounded-full text-sm font-semibold ${
      userPlan === 'Basic'
        ? 'bg-[#E6FFFA] text-[#059669]'
        : userPlan === 'premium'
        ? 'bg-gradient-to-r from-pink-200 via-purple-200 via-blue-200 to-green-200 text-[#3C2F00] shadow-sm border border-white/30 backdrop-blur-sm'
        : 'bg-gray-100 text-gray-800'
    }`}
  >
    Plano: {userPlan || 'Carregando...'}
  </span>
</div>


      <div className="flex space-x-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md flex-1">
          <h3 className="text-lg font-semibold text-[#1e1e1e] mb-2">Acessos Hoje</h3>
          <p className="text-2xl font-bold text-[#059669]">{accessToday}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex-1">
          <h3 className="text-lg font-semibold text-[#1e1e1e] mb-2">Novos Acessos</h3>
          <p className="text-2xl font-bold text-[#059669]">{newAccess}</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md w-full h-[400px]">
        <div className="flex space-x-4 mb-6">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'daily'
                ? 'bg-[#059669] text-white'
                : 'bg-gray-200 text-[#1e1e1e] hover:bg-gray-300'
            }`}
            onClick={() => setFilter('daily')}
          >
            Diário
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === '7days'
                ? 'bg-[#059669] text-white'
                : 'bg-gray-200 text-[#1e1e1e] hover:bg-gray-300'
            }`}
            onClick={() => setFilter('7days')}
          >
            Últimos 7 Dias
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === '30days'
                ? 'bg-[#059669] text-white'
                : 'bg-gray-200 text-[#1e1e1e] hover:bg-gray-300'
            }`}
            onClick={() => setFilter('30days')}
          >
            Últimos 30 Dias
          </button>
        </div>
        <div className="h-[300px]">
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}