import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IntervalSelector } from '../IntervalSelector';
import { IntervalMetricCards } from '../IntervalMetricCards';
import type { IntervalAudit } from '../../../types/property';

const mockAudit: IntervalAudit = {
  start_date: '2026-07-01',
  end_date: '2026-07-31',
  interval_label: 'Julio 2026',
  inclusions: 228,
  sales: 286,
  drops_count: 97,
  avg_drop_pct: 5.6,
  total_drop_amount: 1052437,
  increases_count: 13,
  avg_inc_pct: 5.7,
  avg_days_to_sell: 67,
  avg_m2: 1845,
  zone_breakdown: [
    {
      zone: 'Los Vadillos - Reyes Católicos',
      inclusions: 32,
      sales: 44,
      avg_days_to_sell: 69,
      avg_discount_pct: 7.4,
      avg_sale_price: 244000,
      avg_m2: 2409,
    },
  ],
};

describe('IntervalSelector', () => {
  it('renders monthly presets and calls onSelectPreset', () => {
    const onSelect = vi.fn();
    render(
      <IntervalSelector
        selectedPreset="2026-07"
        startDate="2026-07-01"
        endDate="2026-07-31"
        onSelectPreset={onSelect}
        onCustomDateChange={vi.fn()}
      />
    );

    expect(screen.getByText('Julio 2026')).toBeDefined();
    expect(screen.getByText('Mayo 2026')).toBeDefined();

    fireEvent.click(screen.getByText('Mayo 2026'));
    expect(onSelect).toHaveBeenCalledWith('2026-05', '2026-05-01', '2026-05-31');
  });
});

describe('IntervalMetricCards', () => {
  it('renders all 6 KPI cards with aggregated values', () => {
    render(<IntervalMetricCards data={mockAudit} />);

    expect(screen.getByText('228')).toBeDefined();
    expect(screen.getByText('286')).toBeDefined();
    expect(screen.getByText('97')).toBeDefined();
    expect(screen.getByText(/5\.6%/i)).toBeDefined();
    expect(screen.getByText('67')).toBeDefined();
    expect(screen.getByText(/1[.,]?845 €/i)).toBeDefined();
  });
});
