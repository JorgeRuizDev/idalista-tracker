"use client";

/**
 * PriceChart Component
 * Displays price distribution histogram using Recharts
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PriceDistribution } from '@/types/property';
import { formatCurrency } from '@/lib/utils';

interface PriceChartProps {
  distribution: PriceDistribution;
}

interface ChartDataPoint {
  range: string;
  min: number;
  max: number;
  count: number;
  fullRange: string;
}

/**
 * Custom tooltip component for the chart
 */
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-border rounded-lg shadow-lg">
        <p className="text-sm font-medium text-foreground mb-1">
          {data.fullRange}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-primary">{data.count}</span> properties
        </p>
      </div>
    );
  }
  return null;
}

export function PriceChart({ distribution }: PriceChartProps) {
  // Handle empty state
  if (distribution.total_properties === 0 || distribution.buckets.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Price Distribution
        </h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">No price data available</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle single property or identical prices
  if (distribution.buckets.length === 1) {
    const bucket = distribution.buckets[0];
    return (
      <div className="bg-white rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Price Distribution
        </h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary mb-2">
              {distribution.total_properties}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {distribution.total_properties === 1 ? 'Property' : 'Properties'} at
            </p>
            <p className="text-xl font-semibold text-foreground">
              {formatCurrency(bucket.bucket_min)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Format data for chart
  const chartData: ChartDataPoint[] = distribution.buckets.map((bucket) => {
    const range = formatCurrency(bucket.bucket_min);
    const fullRange = `${formatCurrency(bucket.bucket_min)} - ${formatCurrency(bucket.bucket_max)}`;
    return {
      range,
      min: bucket.bucket_min,
      max: bucket.bucket_max,
      count: bucket.count,
      fullRange
    };
  });

  // Calculate statistics
  const avgPrice = formatCurrency(distribution.avg_price);
  const priceRange = `${formatCurrency(distribution.min_price)} - ${formatCurrency(distribution.max_price)}`;

  return (
    <div className="bg-white rounded-lg border border-border p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Price Distribution
          </h3>
          <p className="text-sm text-muted-foreground">
            {distribution.total_properties} properties
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="inline-block mr-4">
            Avg: <span className="font-medium text-foreground">{avgPrice}</span>
          </span>
          <span className="inline-block">
            Range: <span className="font-medium text-foreground">{priceRange}</span>
          </span>
        </div>
      </div>

      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 40
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="range"
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              label={{
                value: 'Properties',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index % 2 === 0 ? '#3b82f6' : '#60a5fa'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default PriceChart;
