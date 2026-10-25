/**
 * Unit tests for challenge detection, tab focus, and resilient tab-close handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkForChallenge, runFullPendingDetailQueue } from '../detail_crawler';
import * as api from '../api';

describe('detail_crawler anti-bot challenge & resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup chrome mock
    (global as any).chrome = {
      tabs: {
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        onUpdated: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
        onRemoved: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      scripting: {
        executeScript: vi.fn(),
      },
    };
  });

  it('detects Cloudflare Turnstile and CAPTCHA challenge in DOM/title', () => {
    // Challenge case 1: Cloudflare title
    expect(checkForChallenge('Just a moment...', '')).toBe(true);

    // Challenge case 2: Turnstile text in body
    expect(checkForChallenge('Idealista', 'Verify you are human cf-turnstile')).toBe(true);

    // Normal listing
    expect(checkForChallenge('Piso en venta en Chamberí', 'Fantástico piso reformado')).toBe(false);
  });

  it('activates tab and brings to focus when challenge is detected', async () => {
    // Mock chrome.tabs.create
    (chrome.tabs.create as any).mockResolvedValue({ id: 101 });
    (chrome.tabs.update as any).mockResolvedValue({});
    (chrome.tabs.remove as any).mockResolvedValue({});

    // Mock simulate instant tab load
    (chrome.tabs.onUpdated.addListener as any).mockImplementation((cb: any) => {
      setTimeout(() => cb(101, { status: 'complete' }), 10);
    });

    // Mock scripting.executeScript: first returns challenge, second returns listing
    let callCount = 0;
    (chrome.scripting.executeScript as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve([{ result: { isChallenge: true, isDelisted: false } }]);
      }
      return Promise.resolve([
        {
          result: {
            isChallenge: false,
            isDelisted: false,
            data: {
              source_engine: 'chrome_extension',
              full_description: 'Test property',
              photos: [],
            },
          },
        },
      ]);
    });

    vi.spyOn(api, 'fetchPendingDetails')
      .mockResolvedValueOnce({
        pending_count: 1,
        items: [
          {
            property_id: 1,
            idealista_id: 'test_challenge_1',
            property_url: 'https://idealista.com/test_challenge_1',
            extension_attempts: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ pending_count: 0, items: [] });

    vi.spyOn(api, 'submitPropertyDetail').mockResolvedValue({
      status: 'success',
      property_id: 1,
      idealista_id: 'test_challenge_1',
      detail_status: 'completed',
      photos_downloaded: 0,
    });

    const progressUpdates: any[] = [];
    const result = await runFullPendingDetailQueue({
      onProgress: p => progressUpdates.push(p),
      jitterMinMs: 10,
      jitterMaxMs: 20,
      hydrationDelayMs: 10,
      pollChallengeIntervalMs: 50,
    });

    // Should bring tab to active: true
    expect(chrome.tabs.update).toHaveBeenCalledWith(101, { active: true });
    // Progress should have recorded paused_challenge stage
    const challengeUpdate = progressUpdates.find(p => p.stage === 'paused_challenge');
    expect(challengeUpdate).toBeDefined();
    expect(result.processed).toBe(1);
  });

  it('handles tab close cleanly when user closes challenge tab', async () => {
    (chrome.tabs.create as any).mockResolvedValue({ id: 102 });
    (chrome.tabs.update as any).mockResolvedValue({});
    (chrome.tabs.remove as any).mockResolvedValue({});

    (chrome.tabs.onUpdated.addListener as any).mockImplementation((cb: any) => {
      setTimeout(() => cb(102, { status: 'complete' }), 10);
    });

    const removedListeners: any[] = [];
    (chrome.tabs.onRemoved.addListener as any).mockImplementation((cb: any) => {
      removedListeners.push(cb);
    });
    (chrome.tabs.onRemoved.removeListener as any).mockImplementation((cb: any) => {
      const idx = removedListeners.indexOf(cb);
      if (idx !== -1) removedListeners.splice(idx, 1);
    });

    // First call detects challenge, then user closes tab
    (chrome.scripting.executeScript as any).mockImplementation(() => {
      setTimeout(() => {
        removedListeners.forEach(cb => cb(102));
      }, 10);
      return Promise.resolve([{ result: { isChallenge: true, isDelisted: false } }]);
    });

    vi.spyOn(api, 'fetchPendingDetails').mockResolvedValueOnce({
      pending_count: 1,
      items: [
        {
          property_id: 2,
          idealista_id: 'test_close_1',
          property_url: 'https://idealista.com/test_close_1',
          extension_attempts: 0,
        },
      ],
    });

    const failSpy = vi.spyOn(api, 'reportDetailCrawlFailure').mockResolvedValue({
      status: 'failure_recorded',
      idealista_id: 'test_close_1',
      current_attempts: 1,
      detail_status: 'pending',
    });

    const result = await runFullPendingDetailQueue({
      jitterMinMs: 10,
      jitterMaxMs: 20,
      hydrationDelayMs: 10,
      pollChallengeIntervalMs: 20,
      maxChallengeWaitMs: 300,
    });

    expect(result.processed).toBe(0);
    expect(failSpy).toHaveBeenCalledWith(
      'test_close_1',
      expect.objectContaining({ error_type: 'tab_closed' })
    );
  });
});
