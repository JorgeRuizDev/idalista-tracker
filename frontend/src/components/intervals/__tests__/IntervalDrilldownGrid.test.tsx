import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PropertyGrid } from '../../explorer/PropertyGrid';
import type { Property } from '../../../types/property';

const mockProperty: Property = {
  id: 1,
  idealista_id: '101',
  title: 'Piso en Gamonal',
  address: 'Calle Vitoria 10',
  zone: 'Gamonal - San Bruno - G9',
  original_price: 150000,
  current_price: 135000,
  discount_amount: 15000,
  discount_pct: 10.0,
  status: 'active',
  photos: ['https://example.com/photo.jpg'],
  property_url: 'https://idealista.com/inmueble/101',
  price_history_count: 2,
};

describe('Interval Drilldown PropertyGrid Integration', () => {
  it('renders drilldown properties with correct card content', () => {
    const onSelect = vi.fn();
    render(
      <PropertyGrid
        properties={[mockProperty]}
        total={1}
        limit={24}
        offset={0}
        isLoading={false}
        onPageChange={vi.fn()}
        onSelectProperty={onSelect}
      />
    );

    expect(screen.getByText('Piso en Gamonal')).toBeDefined();
    expect(screen.getByText(/135\.000/)).toBeDefined();

    fireEvent.click(screen.getByText('Piso en Gamonal'));
    expect(onSelect).toHaveBeenCalledWith(mockProperty);
  });

  it('renders pagination and handles page change for drilldown results', () => {
    const onPageChange = vi.fn();
    render(
      <PropertyGrid
        properties={[mockProperty]}
        total={50}
        limit={24}
        offset={0}
        isLoading={false}
        onPageChange={onPageChange}
        onSelectProperty={vi.fn()}
      />
    );

    expect(screen.getByText((_, el) => el?.textContent?.replace(/\s+/g, ' ').trim() === 'Página 1 de 3')).toBeDefined();

    const nextBtn = screen.getByRole('button', { name: /siguiente/i });
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(24);
  });

  it('renders empty state when no drilldown properties match and triggers onResetFilters', () => {
    const onReset = vi.fn();
    render(
      <PropertyGrid
        properties={[]}
        total={0}
        limit={24}
        offset={0}
        isLoading={false}
        onPageChange={vi.fn()}
        onSelectProperty={vi.fn()}
        onResetFilters={onReset}
      />
    );

    expect(screen.getByText('No se encontraron inmuebles')).toBeDefined();

    const resetBtn = screen.getByRole('button', { name: /restablecer todos los filtros/i });
    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalled();
  });
});
