import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { MonthlyTrend } from '../../types/property';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DropsVsSalesChartProps {
  data: MonthlyTrend[];
}

export function DropsVsSalesChart({ data }: DropsVsSalesChartProps) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: 'Rebajas de Precio',
        data: data.map((d) => d.price_drops),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderRadius: 6,
      },
      {
        label: 'Ventas Concluidas',
        data: data.map((d) => d.properties_sold),
        backgroundColor: 'rgba(225, 29, 72, 0.8)',
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${context.parsed.y} operaciones`,
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
            Volumen: Rebajas de Precio vs. Ventas Concluidas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparativa mensual de dinamismo y ajustes de oferta (Mayo – Octubre 2026)
          </p>
        </div>
      </div>
      <div className="h-64 sm:h-72 w-full">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
