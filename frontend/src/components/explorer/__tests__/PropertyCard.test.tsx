import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SoldStatusSelector } from '../SoldStatusSelector';
import { PropertyCard } from '../PropertyCard';
import type { Property } from '../../../types/property';

const mockSoldProperty: Property = {
  id: 10,
  idealista_id: '111427424',
  title: 'Piso en Avenida Reyes Católicos',
  address: 'Avenida Reyes Católicos, 15',
  zone: 'Los Vadillos - Reyes Católicos',
  property_type: 'Piso',
  original_price: 300000,
  current_price: 270000,
  discount_amount: 30000,
  discount_pct: 10.0,
  size_m2: 95,
  price_per_m2: 2842,
  bedrooms: 3,
  floor: '4ª planta exterior',
  has_elevator: true,
  status: 'sold',
  first_seen_at: '2026-05-11T11:59:50',
  last_seen_at: '2026-07-30T11:57:56',
  sold_at: '2026-09-10T22:16:40',
  days_on_market: 122,
  photos: ['https://example.com/photo1.jpg'],
  property_url: 'https://idealista.com/inmueble/111427424/',
  price_history_count: 2,
};

const mockActiveProperty: Property = {
  id: 11,
  idealista_id: '222427425',
  title: 'Ático en Gamonal',
  zone: 'Gamonal - San Bruno - G9',
  original_price: 180000,
  current_price: 180000,
  discount_amount: 0,
  discount_pct: 0,
  size_m2: 80,
  status: 'active',
  photos: [],
  property_url: 'https://idealista.com/inmueble/222427425/',
  price_history_count: 0,
};

describe('SoldStatusSelector', () => {
  it('renders all three status options and responds to clicks', () => {
    const onChange = vi.fn();
    render(<SoldStatusSelector value="all" onChange={onChange} />);

    expect(screen.getByText('Incluir Todos')).toBeDefined();
    expect(screen.getByText('Activos')).toBeDefined();
    expect(screen.getByText('Solo Vendidos')).toBeDefined();

    fireEvent.click(screen.getByText('Solo Vendidos'));
    expect(onChange).toHaveBeenCalledWith('only_sold');

    fireEvent.click(screen.getByText('Activos'));
    expect(onChange).toHaveBeenCalledWith('only_active');
  });
});

describe('PropertyCard', () => {
  it('renders sold badge, discount, and days on market for sold property', () => {
    const onSelect = vi.fn();
    render(<PropertyCard property={mockSoldProperty} onSelect={onSelect} />);

    expect(screen.getByText('VENDIDO')).toBeDefined();
    expect(screen.getByText(/122 días/i)).toBeDefined();
    expect(screen.getByText(/270\.000/i)).toBeDefined();
    expect(screen.getByText(/-10%/i)).toBeDefined();

    fireEvent.click(screen.getByText('Piso en Avenida Reyes Católicos'));
    expect(onSelect).toHaveBeenCalledWith(mockSoldProperty);
  });

  it('renders active property without sold badge', () => {
    render(<PropertyCard property={mockActiveProperty} onSelect={vi.fn()} />);

    expect(screen.queryByText(/VENDIDO/i)).toBeNull();
    expect(screen.getByText(/180\.000/i)).toBeDefined();
  });
});
