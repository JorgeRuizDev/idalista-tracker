import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  navigateToUrl,
  closeCrawlTab,
  _getCrawlTabIdForTesting,
  _setCrawlTabIdForTesting,
} from '../crawler';

describe('background_nav (User Story 1)', () => {
  let createdTabs: any[] = [];
  let updatedTabs: any[] = [];
  let removedTabIds: number[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    createdTabs = [];
    updatedTabs = [];
    removedTabIds = [];
    _setCrawlTabIdForTesting(null);

    (global as any).chrome = {
      tabs: {
        create: vi.fn(async (createProperties: chrome.tabs.CreateProperties) => {
          const tab = {
            id: 201 + createdTabs.length,
            url: createProperties.url,
            active: createProperties.active,
          };
          createdTabs.push(createProperties);
          return tab;
        }),
        update: vi.fn(async (tabId: number, updateProperties: chrome.tabs.UpdateProperties) => {
          updatedTabs.push({ tabId, updateProperties });
          return { id: tabId, ...updateProperties };
        }),
        get: vi.fn(async (tabId: number) => {
          if (removedTabIds.includes(tabId)) {
            throw new Error(`No tab with id: ${tabId}`);
          }
          return { id: tabId };
        }),
        remove: vi.fn(async (tabId: number) => {
          removedTabIds.push(tabId);
          return Promise.resolve();
        }),
        query: vi.fn(async () => []),
      },
    };
  });

  it('creates dedicated search crawl tab with active: false on initial navigation', async () => {
    const tab = await navigateToUrl('https://www.idealista.com/areas/venta-viviendas/');

    expect(chrome.tabs.create).toHaveBeenCalledTimes(1);
    expect(chrome.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://www.idealista.com/areas/venta-viviendas/',
        active: false,
      })
    );
    expect(tab.id).toBe(201);
    expect(_getCrawlTabIdForTesting()).toBe(201);
  });

  it('reuses the dedicated crawl tab for subsequent pages with active: false', async () => {
    // Initial page
    await navigateToUrl('https://www.idealista.com/areas/venta-viviendas/');
    expect(createdTabs.length).toBe(1);

    // Page 2 navigation
    const tab2 = await navigateToUrl('https://www.idealista.com/areas/venta-viviendas/pagina-2.htm');

    expect(chrome.tabs.create).toHaveBeenCalledTimes(1); // No new tab created!
    expect(chrome.tabs.update).toHaveBeenCalledTimes(1);
    expect(chrome.tabs.update).toHaveBeenCalledWith(
      201,
      expect.objectContaining({
        url: 'https://www.idealista.com/areas/venta-viviendas/pagina-2.htm',
        active: false,
      })
    );
    expect(tab2.id).toBe(201);
  });

  it('creates a new background tab if previous crawl tab was closed or invalid', async () => {
    _setCrawlTabIdForTesting(999);
    (chrome.tabs.get as any).mockRejectedValueOnce(new Error('Tab closed'));

    const tab = await navigateToUrl('https://www.idealista.com/areas/venta-viviendas/');

    expect(chrome.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        active: false,
      })
    );
    expect(tab.id).toBe(201);
    expect(_getCrawlTabIdForTesting()).toBe(201);
  });

  it('closes dedicated crawl tab cleanly upon completion or cancellation', async () => {
    await navigateToUrl('https://www.idealista.com/areas/venta-viviendas/');
    expect(_getCrawlTabIdForTesting()).toBe(201);

    await closeCrawlTab();

    expect(chrome.tabs.remove).toHaveBeenCalledWith(201);
    expect(_getCrawlTabIdForTesting()).toBeNull();
  });
});
