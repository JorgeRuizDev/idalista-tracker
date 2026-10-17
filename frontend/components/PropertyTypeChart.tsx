'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TypeDistribution } from '@/types/property';
import { cn } from '@/lib/utils';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

interface PropertyTypeChartProps {
  typeDistribution: TypeDistribution[];
  className?: string;
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-border rounded-lg shadow-lg">
        <p className="text-sm font-medium text-foreground">{data.type}</p>
        <p className="text-sm text-muted-foreground">
          {data.count} properties ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
}

function CustomLegend({ payload }: any) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground">
            {entry.value} ({entry.payload.percentage}%)
          </span>
        </div>
      ))}
    </div>
  );
}

export function PropertyTypeChart({ typeDistribution, className }: PropertyTypeChartProps) {
  if (typeDistribution.length === 0) {
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

  const chartData = typeDistribution.map((t) => ({
    name: t.type,
    value: t.count,
    percentage: t.percentage,
  }));

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-border p-4 sm:p-6 shadow-sm',
        className
      )}
    >
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Property Types
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Distribution by property category
      </p>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default PropertyTypeChart;
