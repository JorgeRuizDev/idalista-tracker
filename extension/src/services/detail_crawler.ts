/**
 * Extension crawler service that retrieves pending detail listings
 * and extracts full snapshots using authentic background tab navigation.
 */
import { fetchPendingDetails, submitPropertyDetail, reportDetailCrawlFailure } from './api';
import type { DetailSnapshotPayload, DetailCrawlProgress, PendingDetailListing } from '../types';

export interface DetailQueueOptions {
  onProgress?: (progress: DetailCrawlProgress) => void;
  isCancelled?: () => boolean;
  jitterMinMs?: number;
  jitterMaxMs?: number;
  hydrationDelayMs?: number;
  pollChallengeIntervalMs?: number;
  maxChallengeWaitMs?: number;
}

/**
 * Check if a title or text indicates a bot challenge (Cloudflare, Turnstile, CAPTCHA).
 */
export function checkForChallenge(title: string, bodyText: string): boolean {
  const lowerTitle = (title || '').toLowerCase();
  const lowerBody = (bodyText || '').toLowerCase();

  const challengeIndicators = [
    'just a moment',
    'moment please',
    'cf-turnstile',
    'turnstile',
    'verify you are human',
    'checking your browser',
    'verificando tu navegador',
    'un momento, por favor',
    'atención al cliente: resuelve',
    'challenge-running',
    'g-recaptcha',
    'hcaptcha',
  ];

  return challengeIndicators.some(ind => lowerTitle.includes(ind) || lowerBody.includes(ind));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a tab to reach 'complete' loading status or be removed.
 */
function waitForTabLoad(
  tabId: number,
  timeoutMs: number = 30000,
  onTabRemoved?: () => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const timer = setTimeout(() => {
      cleanup();
      if (!resolved) {
        reject(new Error('Tab load timeout'));
      }
    }, timeoutMs);

    function updatedListener(updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        resolved = true;
        cleanup();
        resolve();
      }
    }

    function removedListener(removedTabId: number) {
      if (removedTabId === tabId) {
        resolved = true;
        cleanup();
        onTabRemoved?.();
        reject(new Error('Tab was closed'));
      }
    }

    function cleanup() {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(updatedListener);
      chrome.tabs.onRemoved.removeListener(removedListener);
    }

    chrome.tabs.onUpdated.addListener(updatedListener);
    chrome.tabs.onRemoved.addListener(removedListener);
  });
}

/**
 * Inspect page state: checks for bot challenges, delisting, or extracts snapshot.
 */
async function inspectTabContent(tabId: number): Promise<{
  isChallenge: boolean;
  isDelisted: boolean;
  data?: DetailSnapshotPayload;
}> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const pageTitle = document.title || '';
      const pageText = document.body
        ? (document.body.innerText || document.body.textContent || '').toLowerCase()
        : '';

      // 1. Anti-bot challenge check
      const challengeKeywords = [
        'just a moment',
        'cf-turnstile',
        'turnstile',
        'verify you are human',
        'checking your browser',
        'verificando tu navegador',
        'un momento, por favor',
      ];
      const hasChallengeSelector = Boolean(
        document.querySelector('#challenge-running, .cf-turnstile, iframe[src*="turnstile"], .g-recaptcha')
      );
      const isChallenge =
        hasChallengeSelector ||
        challengeKeywords.some(kw => pageTitle.toLowerCase().includes(kw) || pageText.includes(kw));

      if (isChallenge) {
        return { isChallenge: true, isDelisted: false };
      }

      // 2. Delisting check
      const delistedPhrases = [
        'el anuncio ya no está publicado',
        'anuncio dado de baja',
        'inmueble no disponible',
        'este anuncio ha sido desactivado',
        'anuncio no encontrado',
        'el inmueble que buscas ya no está en idealista',
      ];
      const isDelisted = delistedPhrases.some(p => pageText.includes(p));
      if (isDelisted) {
        return {
          isChallenge: false,
          isDelisted: true,
          data: {
            source_engine: 'chrome_extension',
            delisted: true,
            photos: [],
          },
        };
      }

      // 3. Extract JSON-LD
      let jsonLdData: Record<string, any> = {};
      try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of Array.from(scripts)) {
          const parsed = JSON.parse(script.textContent || '{}');
          if (Array.isArray(parsed)) {
            for (const item of parsed) Object.assign(jsonLdData, item);
          } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
            for (const item of parsed['@graph']) Object.assign(jsonLdData, item);
          } else {
            Object.assign(jsonLdData, parsed);
          }
        }
      } catch (_) {}

      // 4. Description
      let fullDescription = '';
      const descParas = Array.from(
        document.querySelectorAll('.comment p, .description-content p, .adCommentsLanguage p')
      )
        .map(p => p.textContent?.trim())
        .filter(Boolean);

      if (descParas.length > 0) {
        fullDescription = descParas.join('\n\n');
      } else {
        const descEl = document.querySelector('.comment, .description-content, .adCommentsLanguage');
        fullDescription = descEl?.textContent?.trim() || jsonLdData.description || '';
      }

      // 5. Location
      let neighborhood: string | undefined;
      let district: string | undefined;
      let city: string | undefined;
      let province: string | undefined;

      const locEl = document.querySelector('.main-info__title-minor, #headerMap');
      if (locEl?.textContent) {
        const parts = locEl.textContent.split(',').map(s => s.trim()).filter(Boolean);
        for (const part of parts) {
          const lower = part.toLowerCase();
          if (lower.includes('barrio')) {
            neighborhood = part.replace(/^barrio\s+/i, '').trim();
          } else if (lower.includes('distrito')) {
            district = part.replace(/^distrito\s+/i, '').trim();
          } else if (!city && !lower.includes('barrio') && !lower.includes('distrito')) {
            city = part;
          }
        }
        if (parts.length >= 3 && !neighborhood && !district) {
          neighborhood = parts[0];
          district = parts[1];
          if (!city) city = parts[2];
        }
      }

      if (jsonLdData.address) {
        if (!city) city = jsonLdData.address.addressLocality;
        if (!province) province = jsonLdData.address.addressRegion || city;
      }

      // Coordinates
      let latitude: number | undefined;
      let longitude: number | undefined;
      if (jsonLdData.geo) {
        latitude = parseFloat(jsonLdData.geo.latitude);
        longitude = parseFloat(jsonLdData.geo.longitude);
      }

      // 6. Features
      const features: Record<string, any> = {};
      const featureItems = document.querySelectorAll(
        '.details-property_features li, .details-property-feature li'
      );
      featureItems.forEach(item => {
        const text = item.textContent?.trim() || '';
        const lower = text.toLowerCase();
        const m2Match = lower.match(/(\d+)\s*m²/);
        if (m2Match) features.built_meters = parseInt(m2Match[1], 10);
        const roomMatch = lower.match(/(\d+)\s*(?:habitación|habitaciones|hab\.)/);
        if (roomMatch) features.rooms = parseInt(roomMatch[1], 10);
        const bathMatch = lower.match(/(\d+)\s*(?:baño|baños)/);
        if (bathMatch) features.bathrooms = parseInt(bathMatch[1], 10);
        if (lower.includes('terraza')) features.terrace = true;
        if (lower.includes('con ascensor')) features.elevator = true;
        if (lower.includes('sin ascensor')) features.elevator = false;
        if (lower.includes('aire acondicionado')) features.air_conditioning = true;
        if (lower.includes('calefacción')) features.heating = text;
        if (lower.includes('planta') || lower.includes('bajo') || lower.includes('ático')) features.floor = text;
        if (lower.includes('segunda mano') || lower.includes('obra nueva') || lower.includes('buen estado')) {
          features.condition = text;
        }
      });

      // 7. Photos
      const photos: Array<{ original_url: string; sequence_index: number; caption?: string }> = [];
      const seenUrls = new Set<string>();

      const imgElements = document.querySelectorAll<HTMLImageElement>(
        'img[src*="idealista.com"], img[data-ondemand-img*="idealista.com"], .gallery-fallback img'
      );

      imgElements.forEach(img => {
        const rawUrl = img.getAttribute('data-ondemand-img') || img.src;
        if (!rawUrl) return;
        const cleanUrl = rawUrl.split('?')[0].trim();
        if (!cleanUrl || seenUrls.has(cleanUrl)) return;
        seenUrls.add(cleanUrl);
        photos.push({
          original_url: cleanUrl,
          sequence_index: photos.length,
          caption: img.alt?.trim() || undefined,
        });
      });

      if (photos.length === 0 && jsonLdData.image) {
        const jsonImgs = Array.isArray(jsonLdData.image) ? jsonLdData.image : [jsonLdData.image];
        jsonImgs.forEach((img: any) => {
          const url = typeof img === 'string' ? img : img?.url;
          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            photos.push({
              original_url: url,
              sequence_index: photos.length,
              caption: typeof img === 'object' ? img?.caption : undefined,
            });
          }
        });
      }

      return {
        isChallenge: false,
        isDelisted: false,
        data: {
          source_engine: 'chrome_extension',
          full_description: fullDescription,
          neighborhood,
          district,
          city,
          province,
          latitude,
          longitude,
          features,
          photos,
          delisted: false,
        },
      };
    },
  });

  return results?.[0]?.result || { isChallenge: false, isDelisted: false };
}

/**
 * Execute deep listing analysis for all pending properties in queue.
 */
export async function runFullPendingDetailQueue(
  options: DetailQueueOptions = {}
): Promise<{ processed: number; errors: number; total: number }> {
  const {
    onProgress,
    isCancelled,
    jitterMinMs = 2500,
    jitterMaxMs = 5000,
    hydrationDelayMs = 2000,
    pollChallengeIntervalMs = 1500,
    maxChallengeWaitMs = 120000,
  } = options;

  let processed = 0;
  let errors = 0;
  let totalProcessedOverall = 0;

  console.log('[DetailCrawler] Starting full pending detail crawl queue...');

  while (true) {
    if (isCancelled?.()) {
      console.log('[DetailCrawler] Crawl cancelled by operator.');
      break;
    }

    let response;
    try {
      response = await fetchPendingDetails(50, false);
    } catch (fetchErr) {
      console.error('[DetailCrawler] Failed to fetch pending listings:', fetchErr);
      errors++;
      break;
    }

    if (!response || !response.items || response.items.length === 0) {
      console.log('[DetailCrawler] No more pending detail listings in queue.');
      break;
    }

    const currentBatch = response.items;
    const totalRemaining = response.pending_count || currentBatch.length;

    for (let i = 0; i < currentBatch.length; i++) {
      if (isCancelled?.()) break;

      const listing = currentBatch[i];
      let tabId: number | null = null;
      let tabWasClosedByUser = false;

      totalProcessedOverall++;
      onProgress?.({
        total: totalRemaining,
        current: totalProcessedOverall,
        currentIdealistaId: listing.idealista_id,
        status: `Analizando ficha ${totalProcessedOverall}/${totalRemaining}: ${listing.idealista_id}`,
        stage: 'deep_analysis',
        challengeActive: false,
      });

      try {
        console.log(`[DetailCrawler] Opening background tab for ${listing.idealista_id}...`);
        const tab = await chrome.tabs.create({
          url: listing.property_url,
          active: false,
        });
        tabId = tab.id || null;
        if (!tabId) throw new Error('Failed to create tab');

        // Listen for user closing tab
        const tabCloseListener = (removedId: number) => {
          if (removedId === tabId) {
            tabWasClosedByUser = true;
          }
        };
        chrome.tabs.onRemoved.addListener(tabCloseListener);

        await waitForTabLoad(tabId, 30000);
        await sleep(hydrationDelayMs);

        // Inspect content & check for challenge
        let inspection = await inspectTabContent(tabId);

        if (inspection.isChallenge) {
          console.warn(`[DetailCrawler] Bot challenge detected for ${listing.idealista_id}. Bringing tab to focus.`);
          // Bring tab to user focus
          await chrome.tabs.update(tabId, { active: true });

          onProgress?.({
            total: totalRemaining,
            current: totalProcessedOverall,
            currentIdealistaId: listing.idealista_id,
            status: 'Reto anti-bot detectado. Resuélvelo en la pestaña activa para continuar.',
            stage: 'paused_challenge',
            challengeActive: true,
          });

          // Poll until solved or timeout/closed
          const startTime = Date.now();
          while (inspection.isChallenge && Date.now() - startTime < maxChallengeWaitMs) {
            if (tabWasClosedByUser || isCancelled?.()) break;
            await sleep(pollChallengeIntervalMs);
            try {
              inspection = await inspectTabContent(tabId);
            } catch (pollErr) {
              // Tab may have navigated or closed
              break;
            }
          }

          if (inspection.isChallenge) {
            throw new Error(tabWasClosedByUser ? 'Tab was closed during challenge' : 'Challenge solve timeout');
          }
        }

        chrome.tabs.onRemoved.removeListener(tabCloseListener);

        if (tabWasClosedByUser) {
          throw new Error('Tab closed by user');
        }

        if (inspection.isDelisted) {
          console.log(`[DetailCrawler] Listing ${listing.idealista_id} confirmed delisted. Discarding.`);
          await submitPropertyDetail(listing.idealista_id, {
            source_engine: 'chrome_extension',
            delisted: true,
            photos: [],
          });
          processed++;
        } else if (inspection.data) {
          console.log(
            `[DetailCrawler] Submitting snapshot for ${listing.idealista_id} (${inspection.data.photos.length} photos)...`
          );
          await submitPropertyDetail(listing.idealista_id, inspection.data);
          processed++;
        } else {
          throw new Error('Failed to extract snapshot data from tab');
        }
      } catch (err: any) {
        console.error(`[DetailCrawler] Error extracting ${listing.idealista_id}:`, err);
        errors++;
        const errorType = tabWasClosedByUser ? 'tab_closed' : 'extraction_error';
        await reportDetailCrawlFailure(listing.idealista_id, {
          source_engine: 'chrome_extension',
          error_type: errorType,
          error_message: String(err?.message || err),
        });

        if (tabWasClosedByUser) {
          console.log('[DetailCrawler] Tab closed by user. Cleanly halting queue execution.');
          break;
        }
      } finally {
        if (tabId && !tabWasClosedByUser) {
          try {
            await chrome.tabs.remove(tabId);
          } catch (_) {}
        }

        // Polite jittered delay
        const jitter = jitterMinMs + Math.floor(Math.random() * (jitterMaxMs - jitterMinMs + 1));
        await sleep(jitter);
      }

      if (tabWasClosedByUser) {
        break;
      }
    }

    if (isCancelled?.()) break;
  }

  onProgress?.({
    total: totalProcessedOverall,
    current: totalProcessedOverall,
    status: `Análisis profundo finalizado. Procesadas: ${processed}, Errores: ${errors}`,
    stage: 'completed',
    challengeActive: false,
  });

  return { processed, errors, total: totalProcessedOverall };
}

/**
 * Backwards compatible single cycle runner for priority items.
 */
export async function runFallbackDetailCrawlCycle(): Promise<{ processed: number; errors: number }> {
  return runFullPendingDetailQueue({
    jitterMinMs: 2500,
    jitterMaxMs: 4000,
  });
}
