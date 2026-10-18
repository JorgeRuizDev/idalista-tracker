/**
 * Extension fallback crawler service that retrieves pending detail listings
 * and extracts snapshots using tab navigation in the user's authentic browser.
 */
import { fetchPendingDetails, submitPropertyDetail, reportDetailCrawlFailure } from './api';
import type { DetailSnapshotPayload, PendingDetailListing } from '../types';

/**
 * Wait for a tab to finish loading.
 */
function waitForTabLoad(tabId: number, timeoutMs: number = 25000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab load timeout'));
    }, timeoutMs);

    function listener(updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run a fallback detail crawl cycle for priority pending properties.
 */
export async function runFallbackDetailCrawlCycle(): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    const response = await fetchPendingDetails(3, true);
    if (!response.items || response.items.length === 0) {
      return { processed: 0, errors: 0 };
    }

    console.log(`[DetailCrawler] Found ${response.items.length} pending listings for extension fallback`);

    for (const listing of response.items) {
      let tabId: number | null = null;
      try {
        console.log(`[DetailCrawler] Opening tab for listing ${listing.idealista_id}...`);
        const tab = await chrome.tabs.create({
          url: listing.property_url,
          active: false,
        });
        tabId = tab.id || null;

        if (!tabId) {
          throw new Error('Failed to create tab');
        }

        await waitForTabLoad(tabId);
        // Small hydration delay
        await sleep(2500);

        // Execute extraction script directly or via message
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            // Check for delisting
            const pageText = document.body ? document.body.innerText.toLowerCase() : '';
            const isDelisted = [
              'el anuncio ya no está publicado',
              'anuncio dado de baja',
              'inmueble no disponible',
              'este anuncio ha sido desactivado',
            ].some(p => pageText.includes(p));

            if (isDelisted) {
              return {
                source_engine: 'chrome_extension',
                delisted: true,
                photos: [],
              };
            }

            // Extract description
            const descParas = Array.from(
              document.querySelectorAll('.comment p, .description-content p')
            )
              .map(p => p.textContent?.trim())
              .filter(Boolean);
            const fullDescription = descParas.length > 0
              ? descParas.join('\n\n')
              : document.querySelector('.comment')?.textContent?.trim() || '';

            // Extract photos
            const photos: Array<{ original_url: string; sequence_index: number; caption?: string }> = [];
            const seen = new Set<string>();
            const imgs = document.querySelectorAll<HTMLImageElement>(
              'img[src*="idealista.com"], img[data-ondemand-img*="idealista.com"]'
            );

            imgs.forEach(img => {
              const src = img.getAttribute('data-ondemand-img') || img.src;
              if (src) {
                const clean = src.split('?')[0].trim();
                if (clean && !seen.has(clean)) {
                  seen.add(clean);
                  photos.push({
                    original_url: clean,
                    sequence_index: photos.length,
                    caption: img.alt?.trim() || undefined,
                  });
                }
              }
            });

            return {
              source_engine: 'chrome_extension',
              full_description: fullDescription,
              photos,
              delisted: false,
            };
          },
        });

        const extracted = results?.[0]?.result as DetailSnapshotPayload;
        if (!extracted) {
          throw new Error('No data extracted from tab');
        }

        console.log(`[DetailCrawler] Submitting detail snapshot for ${listing.idealista_id}...`);
        await submitPropertyDetail(listing.idealista_id, extracted);
        processed++;
      } catch (err: any) {
        console.error(`[DetailCrawler] Error extracting listing ${listing.idealista_id}:`, err);
        errors++;
        await reportDetailCrawlFailure(listing.idealista_id, {
          source_engine: 'chrome_extension',
          error_type: 'bot_challenge',
          error_message: String(err?.message || err),
        });
      } finally {
        if (tabId) {
          try {
            await chrome.tabs.remove(tabId);
          } catch (_) {}
        }
        // Polite delay between tabs
        await sleep(4000);
      }
    }
  } catch (err) {
    console.error('[DetailCrawler] Error in fallback detail crawl cycle:', err);
  }

  return { processed, errors };
}
