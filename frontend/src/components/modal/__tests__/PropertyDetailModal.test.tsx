import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertyDetailModal } from '../PropertyDetailModal';
import { api } from '../../../services/api';
import type { Property, PropertySnapshotResponse } from '../../../types/property';

const mockProperty: Property = {
  id: 101,
  idealista_id: 'prop_test_101',
  title: 'Piso señorial en Almagro',
  address: 'Calle Almagro 24',
  zone: 'Chamberí',
  original_price: 650000,
  current_price: 600000,
  discount_amount: 50000,
  discount_pct: 7.7,
  size_m2: 120,
  price_per_m2: 5000,
  bedrooms: 3,
  floor: '3ª exterior',
  has_elevator: true,
  status: 'active',
  detail_status: 'completed',
  first_seen_at: '2026-10-01T10:00:00',
  photos: ['https://img3.idealista.com/blur/fallback.jpg'],
  property_url: 'https://idealista.com/inmueble/prop_test_101/',
  price_history_count: 1,
};

const mockSnapshotResponse: PropertySnapshotResponse = {
  property_id: 101,
  idealista_id: 'prop_test_101',
  detail_status: 'completed',
  snapshot: {
    crawled_at: '2026-10-25T12:00:00Z',
    source_engine: 'chrome_extension',
    full_description: 'Exclusiva vivienda exterior reformada con calidades de lujo.\n\nSalón de 40m2 con chimenea.',
    neighborhood: 'Almagro',
    district: 'Chamberí',
    city: 'Madrid',
    province: 'Madrid',
    latitude: 40.43,
    longitude: -3.69,
    features: {
      'características básicas': ['120 m² construidos', '3 habitaciones', '2 baños'],
      edificio: ['Planta 3ª exterior', 'Con ascensor'],
      equipamiento: ['Aire acondicionado', 'Calefacción central'],
    },
    photos: [
      {
        sequence_index: 0,
        local_url: '/media/properties/prop_test_101/photo_0.jpg',
        original_url: 'https://img3.idealista.com/0.jpg',
        caption: 'Salón con chimenea',
      },
      {
        sequence_index: 1,
        local_url: '/media/properties/prop_test_101/photo_1.jpg',
        original_url: 'https://img3.idealista.com/1.jpg',
        caption: 'Dormitorio principal',
      },
    ],
  },
};

describe('PropertyDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders snapshot details: status pill, full description, features and photos', async () => {
    vi.spyOn(api, 'getPropertySnapshot').mockResolvedValue(mockSnapshotResponse);
    vi.spyOn(api, 'getPropertyDetail').mockResolvedValue(mockProperty);

    render(<PropertyDetailModal property={mockProperty} onClose={vi.fn()} />);

    // Check status pill
    await waitFor(() => {
      expect(screen.getByText(/Ficha completa/i)).toBeInTheDocument();
    });

    // Check full description
    expect(screen.getByText(/Exclusiva vivienda exterior/i)).toBeInTheDocument();
    expect(screen.getByText(/Salón de 40m2 con chimenea/i)).toBeInTheDocument();

    // Check structured features
    expect(screen.getByText('120 m² construidos')).toBeInTheDocument();
    expect(screen.getByText('Aire acondicionado')).toBeInTheDocument();
    expect(screen.getByText('Calefacción central')).toBeInTheDocument();

    // Check photo gallery
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    // Click next photo button
    const nextBtn = screen.getByLabelText('Foto siguiente');
    fireEvent.click(nextBtn);
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('renders pending status pill when snapshot is not available yet', async () => {
    const pendingProperty = { ...mockProperty, detail_status: 'pending' as const };
    vi.spyOn(api, 'getPropertySnapshot').mockRejectedValue(new Error('Snapshot not found'));
    vi.spyOn(api, 'getPropertyDetail').mockResolvedValue(pendingProperty);

    render(<PropertyDetailModal property={pendingProperty} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Pendiente de análisis/i)).toBeInTheDocument();
    });
  });
});
