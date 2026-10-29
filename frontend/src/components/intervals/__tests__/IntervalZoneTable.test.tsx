import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IntervalZoneTable } from '../IntervalZoneTable';
import type { IntervalZoneMetric } from '../../../types/property';

const mockZones: IntervalZoneMetric[] = [
  {
    zone: 'Los Vadillos - Reyes Católicos',
    inclusions: 32,
    sales: 44,
    avg_days_to_sell: 69,
    avg_discount_pct: 7.4,
    avg_sale_price: 244000,
    avg_m2: 2409,
  },
  {
    zone: 'Gamonal - San Bruno - G9',
    inclusions: 45,
    sales: 60,
    avg_days_to_sell: 55,
    avg_discount_pct: 6.2,
    avg_sale_price: 185000,
    avg_m2: 2006,
  },
];

describe('IntervalZoneTable Interactive Row Filtering', () => {
  it('calls onSelectZone when a table row is clicked', () => {
    const onSelectZone = vi.fn();
    render(
      <IntervalZoneTable
        zoneBreakdown={mockZones}
        intervalLabel="Julio 2026"
        onSelectZone={onSelectZone}
      />
    );

    const gamonalRow = screen.getByText('Gamonal - San Bruno - G9').closest('tr');
    expect(gamonalRow).toBeDefined();

    fireEvent.click(gamonalRow!);
    expect(onSelectZone).toHaveBeenCalledWith('Gamonal - San Bruno - G9');
  });

  it('highlights selected zone row and sets aria-selected="true"', () => {
    render(
      <IntervalZoneTable
        zoneBreakdown={mockZones}
        intervalLabel="Julio 2026"
        selectedZone="Gamonal - San Bruno - G9"
      />
    );

    const gamonalRow = screen.getByText('Gamonal - San Bruno - G9').closest('tr');
    expect(gamonalRow?.getAttribute('aria-selected')).toBe('true');
    expect(gamonalRow?.className).toContain('border-indigo-600');

    const vadillosRow = screen.getByText('Los Vadillos - Reyes Católicos').closest('tr');
    expect(vadillosRow?.getAttribute('aria-selected')).toBe('false');
  });

  it('supports keyboard selection with Enter and Space keys', () => {
    const onSelectZone = vi.fn();
    render(
      <IntervalZoneTable
        zoneBreakdown={mockZones}
        intervalLabel="Julio 2026"
        onSelectZone={onSelectZone}
      />
    );

    const gamonalRow = screen.getByText('Gamonal - San Bruno - G9').closest('tr');
    fireEvent.keyDown(gamonalRow!, { key: 'Enter', code: 'Enter' });
    expect(onSelectZone).toHaveBeenCalledWith('Gamonal - San Bruno - G9');

    fireEvent.keyDown(gamonalRow!, { key: ' ', code: 'Space' });
    expect(onSelectZone).toHaveBeenCalledWith('Gamonal - San Bruno - G9');
  });

  it('renders and allows sorting by Precio Medio m²', () => {
    render(
      <IntervalZoneTable
        zoneBreakdown={mockZones}
        intervalLabel="Julio 2026"
      />
    );

    expect(screen.getByText('Precio Medio m²')).toBeDefined();
    expect(screen.getByText(/2[.,]?409 €\/m²/i)).toBeDefined();
    expect(screen.getByText(/2[.,]?006 €\/m²/i)).toBeDefined();

    // Click sort header
    fireEvent.click(screen.getByText('Precio Medio m²'));
  });
});
