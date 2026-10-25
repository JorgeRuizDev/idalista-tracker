import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
  zone_breakdown: [],
};

describe('IntervalMetricCards Interactive Filtering', () => {
  it('calls onSelectMetric with correct metric when cards are clicked', () => {
    const onSelectMetric = vi.fn();
    render(
      <IntervalMetricCards
        data={mockAudit}
        onSelectMetric={onSelectMetric}
      />
    );

    // Inclusiones
    fireEvent.click(screen.getByRole('button', { name: /inclusiones/i }));
    expect(onSelectMetric).toHaveBeenCalledWith('inclusions');

    // Ventas Concluidas
    fireEvent.click(screen.getByRole('button', { name: /ventas concluidas/i }));
    expect(onSelectMetric).toHaveBeenCalledWith('sales');

    // Rebajas de Precio
    fireEvent.click(screen.getByRole('button', { name: /rebajas de precio/i }));
    expect(onSelectMetric).toHaveBeenCalledWith('price_drops');

    // Aumentos de Precio
    fireEvent.click(screen.getByRole('button', { name: /aumentos de precio/i }));
    expect(onSelectMetric).toHaveBeenCalledWith('price_increases');
  });

  it('highlights the selected card and sets aria-pressed="true"', () => {
    render(
      <IntervalMetricCards
        data={mockAudit}
        selectedMetric="sales"
      />
    );

    const salesCard = screen.getByRole('button', { name: /ventas concluidas/i });
    expect(salesCard.getAttribute('aria-pressed')).toBe('true');
    expect(salesCard.className).toContain('ring-2');

    const inclusionsCard = screen.getByRole('button', { name: /inclusiones/i });
    expect(inclusionsCard.getAttribute('aria-pressed')).toBe('false');
  });

  it('supports keyboard navigation via Enter and Space keys', () => {
    const onSelectMetric = vi.fn();
    render(
      <IntervalMetricCards
        data={mockAudit}
        onSelectMetric={onSelectMetric}
      />
    );

    const dropsCard = screen.getByRole('button', { name: /rebajas de precio/i });
    fireEvent.keyDown(dropsCard, { key: 'Enter', code: 'Enter' });
    expect(onSelectMetric).toHaveBeenCalledWith('price_drops');

    fireEvent.keyDown(dropsCard, { key: ' ', code: 'Space' });
    expect(onSelectMetric).toHaveBeenCalledWith('price_drops');
  });
});
