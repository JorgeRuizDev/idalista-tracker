import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkForChallenge } from '../../utils/challenge';
import {
  handleChallengeNotification,
  handleNotificationClick,
  dismissChallengeNotification,
  getActiveChallenge,
  _resetChallengeStateForTesting,
} from '../../background';

describe('challenge_notification (User Story 2)', () => {
  let createdNotifications: Record<string, chrome.notifications.NotificationOptions> = {};
  let clearedNotificationIds: string[] = [];
  let updatedTabs: Array<{ tabId: number; props: chrome.tabs.UpdateProperties }> = [];
  let updatedWindows: Array<{ windowId: number; props: chrome.windows.UpdateProperties }> = [];

  beforeEach(() => {
    vi.clearAllMocks();
    createdNotifications = {};
    clearedNotificationIds = [];
    updatedTabs = [];
    updatedWindows = [];
    _resetChallengeStateForTesting();

    (global as any).chrome = {
      notifications: {
        create: vi.fn(async (notificationId: string, options: chrome.notifications.NotificationOptions) => {
          createdNotifications[notificationId] = options;
          return notificationId;
        }),
        clear: vi.fn(async (notificationId: string) => {
          clearedNotificationIds.push(notificationId);
          delete createdNotifications[notificationId];
          return true;
        }),
      },
      tabs: {
        get: vi.fn(async (tabId: number) => ({ id: tabId, windowId: 55 })),
        update: vi.fn(async (tabId: number, props: chrome.tabs.UpdateProperties) => {
          updatedTabs.push({ tabId, props });
          return { id: tabId, ...props };
        }),
      },
      windows: {
        update: vi.fn(async (windowId: number, props: chrome.windows.UpdateProperties) => {
          updatedWindows.push({ windowId, props });
          return { id: windowId, ...props };
        }),
      },
    };
  });

  describe('Challenge detection logic', () => {
    it('detects Turnstile and CAPTCHAs', () => {
      expect(checkForChallenge('Just a moment...', '')).toBe(true);
      expect(checkForChallenge('Idealista', 'Verify you are human cf-turnstile')).toBe(true);
      expect(checkForChallenge('Atención al cliente: Resuelve el reto', '')).toBe(true);
    });

    it('does not trigger on normal search or listing page', () => {
      expect(checkForChallenge('Pisos en venta en Madrid', '350 inmuebles encontrados')).toBe(false);
      expect(checkForChallenge('Casa en venta', 'detalles del inmueble')).toBe(false);
    });
  });

  describe('Desktop notification dispatch and click-to-focus', () => {
    it('creates persistent high-priority desktop notification when challenge is detected', async () => {
      const notificationId = await handleChallengeNotification({
        stage: 'search',
        tab_id: 101,
        url: 'https://www.idealista.com/areas/venta-viviendas/',
        reason: 'cloudflare_turnstile',
      });

      expect(notificationId).toBeTruthy();
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        notificationId,
        expect.objectContaining({
          type: 'basic',
          requireInteraction: true,
          priority: 2,
          title: 'Idalista Tracker: Verificación humana requerida',
        })
      );

      const activeChallenge = getActiveChallenge(101);
      expect(activeChallenge).not.toBeNull();
      expect(activeChallenge?.tabId).toBe(101);
      expect(activeChallenge?.notificationId).toBe(notificationId);
    });

    it('focuses the window and tab and clears notification on notification click', async () => {
      const notificationId = await handleChallengeNotification({
        stage: 'detail',
        tab_id: 102,
        url: 'https://www.idealista.com/inmueble/99999/',
        reason: 'antibot_block',
      });

      await handleNotificationClick(notificationId);

      // Windows focused
      expect(chrome.windows.update).toHaveBeenCalledWith(55, { focused: true });
      // Tab activated
      expect(chrome.tabs.update).toHaveBeenCalledWith(102, { active: true });
      // Notification cleared
      expect(clearedNotificationIds).toContain(notificationId);
    });

    it('dismisses notification when challenge is resolved', async () => {
      const notificationId = await handleChallengeNotification({
        stage: 'search',
        tab_id: 103,
        url: 'https://www.idealista.com/',
        reason: 'cloudflare_turnstile',
      });

      await dismissChallengeNotification(103);

      expect(clearedNotificationIds).toContain(notificationId);
      expect(getActiveChallenge(103)).toBeNull();
    });
  });
});
