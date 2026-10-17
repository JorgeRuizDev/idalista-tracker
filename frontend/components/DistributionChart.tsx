'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { InsightPriceBucket } from '@/types/property';
import { cn } from '@/lib/utils';

interface DistributionChartProps {
  buckets: InsightPriceBucket[];
  title: string;
  subtitle?: string;
  className?: string;
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-border rounded-lg shadow-lg">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">
          {payload[0].value} properties
        </p>
      </div>
    );
  }
  return null;
}

export function DistributionChart({ buckets, title, subtitle, className }: DistributionChartProps) {
  if (buckets.length === 0) {
    return (
      <div
        className={cn(
          'bg-white rounded-lg border border-border p-6 shadow-sm flex items-center justify-center min-h-[300px]',
          className
        )}
      >
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const chartData = buckets.map((bucket) => ({
    range: bucket.range,
    count: bucket.count,
    min: bucket.min,
    max: bucket.max,
  }));

  const maxCount = Math.max(...buckets.map((b) => b.count));
  const getBarColor = (count: number) => {
    const intensity = maxCount > 0 ? count / maxCount : 0;
    if (intensity > 0.75) return '#22c55e';
    if (intensity > 0.5) return '#4ade80';
    if (intensity > 0.25) return '#86efac';
    return '#bbf7d0';
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-border p-4 sm:p-6 shadow-sm',
        className
      )}
    >
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>
      )}

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.count)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default DistributionChart;
