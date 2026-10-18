import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CensusTable } from '../CensusTable';
import type { NormalizedZone } from '../../../types/property';

const mockZones: NormalizedZone[] = [
  {
    zone: 'Los Vadillos - Reyes Católicos',
    total: 243,
    active: 99,
    sold: 104,
    missing: 40,
    avg_price: 247050,
    avg_m2: 2409,
    avg_days_to_sell: 79,
    avg_discount_pct: 7.7,
  },
  {
    zone: 'Villa Pilar',
    total: 235,
    active: 182,
    sold: 38,
    missing: 15,
    avg_price: 282680,
    avg_m2: 2560,
    avg_days_to_sell: 84,
    avg_discount_pct: 4.7,
  },
];

describe('CensusTable', () => {
  it('renders zone records with totals and prices', () => {
    const onOpenDiagnostic = vi.fn();
    render(<CensusTable zones={mockZones} onOpenDiagnostic={onOpenDiagnostic} />);

    expect(screen.getByText('Los Vadillos - Reyes Católicos')).toBeDefined();
    expect(screen.getByText('Villa Pilar')).toBeDefined();
    expect(screen.getByText('243')).toBeDefined();
    expect(screen.getByText('235')).toBeDefined();

    const diagnosticBtn = screen.getByText(/Diagnóstico de Normalización/i);
    fireEvent.click(diagnosticBtn);
    expect(onOpenDiagnostic).toHaveBeenCalled();
  });
});
