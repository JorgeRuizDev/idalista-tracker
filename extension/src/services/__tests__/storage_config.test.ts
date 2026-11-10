import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getConfig,
  saveConfig,
  getLastCrawlStats,
  saveLastCrawlStats,
  DEFAULT_CONFIG,
} from '../storage';
import type { CrawlConfig, LastCrawlStats } from '../../types';

describe('storage_config', () => {
  let localStorageMock: Record<string, any> = {};

  beforeEach(() => {
    localStorageMock = {};
    (global as any).chrome = {
      storage: {
        local: {
          get: vi.fn((keys: string | string[]) => {
            if (typeof keys === 'string') {
              return Promise.resolve({ [keys]: localStorageMock[keys] });
            }
            const result: Record<string, any> = {};
            for (const k of keys) {
              result[k] = localStorageMock[k];
            }
            return Promise.resolve(result);
          }),
          set: vi.fn((items: Record<string, any>) => {
            Object.assign(localStorageMock, items);
            return Promise.resolve();
          }),
          remove: vi.fn((keys: string | string[]) => {
            const keyList = Array.isArray(keys) ? keys : [keys];
            for (const k of keyList) {
              delete localStorageMock[k];
            }
            return Promise.resolve();
          }),
          clear: vi.fn(() => {
            localStorageMock = {};
            return Promise.resolve();
          }),
        },
      },
    };
  });

  it('exposes DEFAULT_CONFIG with automated crawl disabled and 24h interval', () => {
    expect(DEFAULT_CONFIG.auto_crawl_enabled).toBe(false);
    expect(DEFAULT_CONFIG.auto_crawl_interval_hours).toBe(24);
    expect(DEFAULT_CONFIG.server_url).toBe('http://localhost:8050');
  });

  it('returns default config when storage is empty', async () => {
    const config = await getConfig();
    expect(config).not.toBeNull();
    expect(config?.auto_crawl_enabled).toBe(false);
    expect(config?.auto_crawl_interval_hours).toBe(24);
    expect(config?.server_url).toBe('http://localhost:8050');
  });

  it('merges missing auto_crawl fields into legacy stored config', async () => {
    // Legacy stored config without auto_crawl properties
    localStorageMock['config'] = {
      server_url: 'http://localhost:8050',
      human_like_enabled: true,
      min_page_delay: 2000,
      max_page_delay: 2000,
      min_navigation_delay: 3000,
      max_navigation_delay: 6000,
    };

    const config = await getConfig();
    expect(config?.auto_crawl_enabled).toBe(false);
    expect(config?.auto_crawl_interval_hours).toBe(24);
  });

  it('saves and retrieves updated auto crawl settings', async () => {
    const updatedConfig: CrawlConfig = {
      server_url: 'http://localhost:8050',
      human_like_enabled: true,
      min_page_delay: 1000,
      max_page_delay: 3000,
      min_navigation_delay: 2000,
      max_navigation_delay: 4000,
      auto_crawl_enabled: true,
      auto_crawl_interval_hours: 12,
    };

    await saveConfig(updatedConfig);
    const retrieved = await getConfig();

    expect(retrieved?.auto_crawl_enabled).toBe(true);
    expect(retrieved?.auto_crawl_interval_hours).toBe(12);
  });

  it('persists and retrieves last crawl statistics including trigger origin', async () => {
    const stats: LastCrawlStats = {
      sessionId: 42,
      totalProperties: 150,
      pagesProcessed: 5,
      searchesCrawled: 2,
      completedAt: 1700000000000,
      trigger: 'automatic',
    };

    await saveLastCrawlStats(stats);
    const retrieved = await getLastCrawlStats();

    expect(retrieved).not.toBeNull();
    expect(retrieved?.sessionId).toBe(42);
    expect(retrieved?.trigger).toBe('automatic');
    expect(retrieved?.completedAt).toBe(1700000000000);
  });
});
