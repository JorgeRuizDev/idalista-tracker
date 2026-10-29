import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';
import { api } from '../services/api';
import type { Property, PropertyListResponse, NormalizedZone } from '../types/property';

const mockProperty: Property = {
  id: 101,
  idealista_id: 'prop_test_101',
  title: 'Piso señorial en Burgos Centro',
  address: 'Calle Santander 12',
  zone: 'Centro',
  original_price: 250000,
  current_price: 220000,
  discount_amount: 30000,
  discount_pct: 12.0,
  size_m2: 95,
  price_per_m2: 2315,
  bedrooms: 3,
  floor: '2ª',
  has_elevator: true,
  status: 'active',
  detail_status: 'completed',
  first_seen_at: '2026-10-01T10:00:00',
  photos: ['/media/properties/prop_test_101/photo_0.jpg'],
  property_url: 'https://idealista.com/inmueble/prop_test_101/',
  price_history_count: 1,
};

const mockListResponse: PropertyListResponse = {
  items: [mockProperty],
  total: 1,
  limit: 24,
  offset: 0,
};

const mockZones: NormalizedZone[] = [
  {
    zone: 'Gamonal',
    total: 50,
    active: 40,
    sold: 10,
    missing: 0,
    avg_price: 150000,
    avg_m2: 80,
    avg_days_to_sell: 30,
    avg_discount_pct: 5.0,
  },
  {
    zone: 'Centro',
    total: 80,
    active: 60,
    sold: 20,
    missing: 0,
    avg_price: 220000,
    avg_m2: 90,
    avg_days_to_sell: 45,
    avg_discount_pct: 7.0,
  },
];

describe('App URL Query Params Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'getZones').mockResolvedValue(mockZones);
    vi.spyOn(api, 'getProperties').mockResolvedValue(mockListResponse);
    vi.spyOn(api, 'getPropertyDetail').mockResolvedValue(mockProperty);
    vi.spyOn(api, 'getPropertySnapshot').mockResolvedValue({
      property_id: 101,
      idealista_id: 'prop_test_101',
      detail_status: 'completed',
      snapshot: null,
    });
  });

  afterEach(() => {
    // Reset location
    window.history.replaceState(null, '', '/');
  });

  it('restores filters from URL on initial load and calls API with them', async () => {
    // Simulate page opened with query params
    window.history.replaceState(
      null,
      '',
      '/?status=only_sold&zone=Gamonal&min_price=100000&max_price=200000&deals=true'
    );

    render(<App />);

    await waitFor(() => {
      expect(api.getProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sold',
          zone: 'Gamonal',
          min_price: 100000,
          max_price: 200000,
          has_price_drop: true,
        })
      );
    });

    // Check that zone selector has value Gamonal
    const select = screen.getByDisplayValue(/Gamonal/i);
    expect(select).toBeInTheDocument();
  });

  it('opens property detail modal on initial load when property query param is present', async () => {
    window.history.replaceState(null, '', '/?property=prop_test_101');

    render(<App />);

    // Verify getPropertyDetail was called with the ID from query param
    await waitFor(() => {
      expect(api.getPropertyDetail).toHaveBeenCalledWith('prop_test_101');
    });

    // Verify modal is open with property information
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText('Piso señorial en Burgos Centro')).toBeInTheDocument();
      expect(within(dialog).getByText('Ref: prop_test_101')).toBeInTheDocument();
    });
  });

  it('pushes property param to URL when property card is clicked, and cleans URL when closed', async () => {
    window.history.replaceState(null, '', '/');
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Piso señorial en Burgos Centro')).toBeInTheDocument();
    });

    // Click on property card to view detail
    const card = screen.getByText('Piso señorial en Burgos Centro');
    fireEvent.click(card);

    // Modal should be open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // pushState should have been called with property in query string
    expect(pushStateSpy).toHaveBeenCalledWith(
      null,
      '',
      expect.stringContaining('property=prop_test_101')
    );

    // Close modal
    const closeBtn = screen.getByLabelText('Cerrar ventana');
    fireEvent.click(closeBtn);

    // replaceState should have been called without property
    await waitFor(() => {
      expect(replaceStateSpy).toHaveBeenCalledWith(
        null,
        '',
        expect.not.stringContaining('property=')
      );
    });
  });

  it('handles popstate event by closing or opening modal according to URL', async () => {
    window.history.replaceState(null, '', '/?property=prop_test_101');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Simulate browser Back button: URL no longer has property param
    window.history.replaceState(null, '', '/');
    fireEvent(window, new PopStateEvent('popstate'));

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
