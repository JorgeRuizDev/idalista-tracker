import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../Header';

describe('Header component', () => {
  it('renders brand logo and title', () => {
    render(<Header activeTab="explorer" onTabChange={vi.fn()} />);

    expect(screen.getByText('Urbana Pulse')).toBeInTheDocument();
    expect(screen.getByText('Burgos')).toBeInTheDocument();
  });

  it('renders all three navigation options in both desktop and mobile contexts', () => {
    render(
      <Header
        activeTab="explorer"
        onTabChange={vi.fn()}
        totalCount={1250}
        soldCount={320}
      />
    );

    // Desktop nav labels
    expect(screen.getByText('Explorador de Inmuebles')).toBeInTheDocument();
    expect(screen.getByText('Auditoría por Intervalos')).toBeInTheDocument();
    expect(screen.getByText('Evolución & Censo de Zonas')).toBeInTheDocument();

    // Mobile nav labels
    expect(screen.getAllByText('Explorar').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Intervalos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tendencias').length).toBeGreaterThanOrEqual(1);
  });

  it('triggers onTabChange with correct tab ID when clicked', () => {
    const handleTabChange = vi.fn();
    render(<Header activeTab="explorer" onTabChange={handleTabChange} />);

    // Click on mobile / desktop tabs
    const intervalTabs = screen.getAllByRole('button', { name: /intervalos/i });
    expect(intervalTabs.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(intervalTabs[0]);

    expect(handleTabChange).toHaveBeenCalledWith('intervals');

    const trendsTabs = screen.getAllByRole('button', { name: /tendencias/i });
    expect(trendsTabs.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(trendsTabs[0]);

    expect(handleTabChange).toHaveBeenCalledWith('trends');
  });

  it('indicates the active tab with aria-current="page"', () => {
    render(<Header activeTab="intervals" onTabChange={vi.fn()} />);

    const currentPages = screen.getAllByRole('button', { current: 'page' });
    expect(currentPages.length).toBeGreaterThanOrEqual(1);

    for (const btn of currentPages) {
      expect(btn.textContent).toMatch(/intervalos/i);
    }
  });
});
