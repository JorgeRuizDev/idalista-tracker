import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AvailablePropertiesChart } from '../AvailablePropertiesChart';
import type { MonthlyTrend } from '../../../types/property';

vi.mock('react-chartjs-2', () => ({
  Line: ({ data }: any) => (
    <div data-testid="line-chart" data-labels={JSON.stringify(data.labels)}>
      {data.datasets.map((ds: any, idx: number) => (
        <span key={idx} data-testid={`dataset-${idx}`}>
          {ds.label}: {ds.data.join(',')}
        </span>
      ))}
    </div>
  ),
}));

const mockTrends: MonthlyTrend[] = [
  {
    month: '2026-05',
    label: 'Mayo 2026',
    avg_price: 240000,
    avg_m2: 2350,
    properties_active: 850,
    properties_sold: 45,
    price_drops: 20,
    avg_drop_pct: 5.2,
  },
  {
    month: '2026-06',
    label: 'Junio 2026',
    avg_price: 242000,
    avg_m2: 2370,
    properties_active: 890,
    properties_sold: 50,
    price_drops: 25,
    avg_drop_pct: 4.8,
  },
];

describe('AvailablePropertiesChart', () => {
  it('renders heading and descriptive text', () => {
    render(<AvailablePropertiesChart data={mockTrends} />);
    expect(screen.getByText('Evolución de Viviendas Disponibles')).toBeDefined();
    expect(
      screen.getByText(
        'Stock de inmuebles activos en catálogo a lo largo del tiempo (Mayo – Octubre 2026)'
      )
    ).toBeDefined();
  });

  it('passes active properties data to the chart dataset', () => {
    render(<AvailablePropertiesChart data={mockTrends} />);
    const dataset = screen.getByTestId('dataset-0');
    expect(dataset.textContent).toContain('Viviendas Disponibles: 850,890');
  });
});
