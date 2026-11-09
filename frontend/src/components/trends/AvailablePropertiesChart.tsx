import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { MonthlyTrend } from '../../types/property';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AvailablePropertiesChartProps {
  data: MonthlyTrend[];
}

export function AvailablePropertiesChart({ data }: AvailablePropertiesChartProps) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: 'Viviendas Disponibles',
        data: data.map((d) => d.properties_active),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#059669',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) =>
            ` ${context.parsed.y.toLocaleString('es-ES')} viviendas disponibles`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          callback: (value: any) => `${value.toLocaleString('es-ES')}`,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Evolución de Viviendas Disponibles
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Stock de inmuebles activos en catálogo a lo largo del tiempo (Mayo – Octubre 2026)
          </p>
        </div>
      </div>
      <div className="h-64 sm:h-72 w-full">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
