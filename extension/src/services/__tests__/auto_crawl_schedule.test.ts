import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  evaluateAutoCrawlCondition,
  setupAutoCrawlAlarm,
  AUTO_CRAWL_SCHEDULE_ALARM,
} from '../../background';
import * as storage from '../storage';
import * as crawler from '../crawler';
import * as api from '../api';

describe('auto_crawl_schedule (User Story 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (global as any).chrome = {
      alarms: {
        create: vi.fn(),
        clear: vi.fn(),
        get: vi.fn(async () => null),
      },
      notifications: {
        create: vi.fn(async () => 'notif-id'),
        clear: vi.fn(async () => true),
      },
    };
  });

  it('returns disabled when auto_crawl_enabled is false', async () => {
    vi.spyOn(storage, 'getConfig').mockResolvedValue({
      ...storage.DEFAULT_CONFIG,
      auto_crawl_enabled: false,
    });

    const result = await evaluateAutoCrawlCondition();
    expect(result.triggered).toBe(false);
    expect(result.reason).toBe('disabled');
  });

  it('returns running when crawlState.is_running is true (mutual exclusion)', async () => {
    vi.spyOn(storage, 'getConfig').mockResolvedValue({
      ...storage.DEFAULT_CONFIG,
      auto_crawl_enabled: true,
      auto_crawl_interval_hours: 24,
    });
    vi.spyOn(storage, 'getCrawlState').mockResolvedValue({
      is_running: true,
      progress: { total_searches: 1, completed_searches: 0, total_pages: 0, total_properties: 0 },
    });

    const result = await evaluateAutoCrawlCondition();
    expect(result.triggered).toBe(false);
    expect(result.reason).toBe('running');
  });

  it('returns interval_not_elapsed when less than configured hours have passed', async () => {
    vi.spyOn(storage, 'getConfig').mockResolvedValue({
      ...storage.DEFAULT_CONFIG,
      auto_crawl_enabled: true,
      auto_crawl_interval_hours: 24,
    });
    vi.spyOn(storage, 'getCrawlState').mockResolvedValue({
      is_running: false,
      progress: { total_searches: 0, completed_searches: 0, total_pages: 0, total_properties: 0 },
    });
    // 5 hours ago (less than 24h)
    vi.spyOn(storage, 'getLastCrawlStats').mockResolvedValue({
      sessionId: 10,
      totalProperties: 20,
      pagesProcessed: 2,
      searchesCrawled: 1,
      completedAt: Date.now() - 5 * 60 * 60 * 1000,
      trigger: 'manual',
    });

    const result = await evaluateAutoCrawlCondition();
    expect(result.triggered).toBe(false);
    expect(result.reason).toBe('interval_not_elapsed');
    expect(result.elapsed_ms).toBeDefined();
    expect(result.interval_ms).toBe(24 * 60 * 60 * 1000);
  });

  it('dispatches notification and defers when backend health check fails', async () => {
    vi.spyOn(storage, 'getConfig').mockResolvedValue({
      ...storage.DEFAULT_CONFIG,
      auto_crawl_enabled: true,
      auto_crawl_interval_hours: 24,
    });
    vi.spyOn(storage, 'getCrawlState').mockResolvedValue(null);
    // 25 hours ago
    vi.spyOn(storage, 'getLastCrawlStats').mockResolvedValue({
      sessionId: 10,
      totalProperties: 20,
      pagesProcessed: 2,
      searchesCrawled: 1,
      completedAt: Date.now() - 25 * 60 * 60 * 1000,
      trigger: 'automatic',
    });
    // Backend offline
    vi.spyOn(api, 'checkBackendHealth').mockResolvedValue(false);

    const result = await evaluateAutoCrawlCondition();
    expect(result.triggered).toBe(false);
    expect(result.reason).toBe('backend_offline');
    expect(chrome.notifications.create).toHaveBeenCalledWith(
      expect.stringContaining('backend-offline'),
      expect.objectContaining({
        title: expect.stringContaining('Servidor'),
      })
    );
  });

  it('triggers crawl when interval has elapsed and backend is healthy', async () => {
    vi.spyOn(storage, 'getConfig').mockResolvedValue({
      ...storage.DEFAULT_CONFIG,
      auto_crawl_enabled: true,
      auto_crawl_interval_hours: 24,
    });
    vi.spyOn(storage, 'getCrawlState').mockResolvedValue(null);
    // 25 hours ago
    vi.spyOn(storage, 'getLastCrawlStats').mockResolvedValue({
      sessionId: 10,
      totalProperties: 20,
      pagesProcessed: 2,
      searchesCrawled: 1,
      completedAt: Date.now() - 25 * 60 * 60 * 1000,
      trigger: 'manual',
    });
    vi.spyOn(api, 'checkBackendHealth').mockResolvedValue(true);
    vi.spyOn(storage, 'getSavedSearches').mockResolvedValue([
      {
        id: 1,
        external_id: 's1',
        name: 'Madrid',
        url: '/madrid',
        full_url: 'https://idealista.com/madrid',
        crawl_enabled: true,
      },
    ]);
    const startCrawlSpy = vi.spyOn(crawler, 'startCrawl').mockResolvedValue({ success: true, session_id: 99 });

    const result = await evaluateAutoCrawlCondition();
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe('started');
    expect(startCrawlSpy).toHaveBeenCalledWith([1], 'http://localhost:8050', 'automatic');
  });

  it('bypasses interval check when forced is true', async () => {
    vi.spyOn(storage, 'getConfig').mockResolvedValue({
      ...storage.DEFAULT_CONFIG,
      auto_crawl_enabled: true,
      auto_crawl_interval_hours: 24,
    });
    vi.spyOn(storage, 'getCrawlState').mockResolvedValue(null);
    // Completed just 1 minute ago
    vi.spyOn(storage, 'getLastCrawlStats').mockResolvedValue({
      sessionId: 10,
      totalProperties: 20,
      pagesProcessed: 2,
      searchesCrawled: 1,
      completedAt: Date.now() - 60 * 1000,
      trigger: 'manual',
    });
    vi.spyOn(api, 'checkBackendHealth').mockResolvedValue(true);
    vi.spyOn(storage, 'getSavedSearches').mockResolvedValue([
      {
        id: 2,
        external_id: 's2',
        name: 'Valencia',
        url: '/valencia',
        full_url: 'https://idealista.com/valencia',
        crawl_enabled: true,
      },
    ]);
    vi.spyOn(crawler, 'startCrawl').mockResolvedValue({ success: true, session_id: 100 });

    const result = await evaluateAutoCrawlCondition({ forced: true });
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe('started');
  });

  it('registers periodic alarm when enabled and clears when disabled', async () => {
    await setupAutoCrawlAlarm(true);
    expect(chrome.alarms.create).toHaveBeenCalledWith(AUTO_CRAWL_SCHEDULE_ALARM, {
      periodInMinutes: 30,
    });

    await setupAutoCrawlAlarm(false);
    expect(chrome.alarms.clear).toHaveBeenCalledWith(AUTO_CRAWL_SCHEDULE_ALARM);
  });
});
