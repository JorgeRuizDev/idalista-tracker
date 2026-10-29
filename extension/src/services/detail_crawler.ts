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

// Global singleton lock to guarantee strictly one queue execution and one tab at a time
let isDetailQueueRunning = false;

export function _resetDetailQueueLockForTesting(): void {
  isDetailQueueRunning = false;
}

/**
 * Check if a title or text indicates a bot challenge (Cloudflare, Turnstile, CAPTCHA).
 */
export function checkForChallenge(title: string, bodyText: string): boolean {
  const lowerTitle = (title || '').toLowerCase();
  const lowerBody = (bodyText || '').toLowerCase();

  // If title or body contains authentic listing markers, it is NOT a challenge!
  const hasListingMarkers = [
    'piso en venta',
    'casa en venta',
    'ático en venta',
    'dúplex en venta',
    'chalet en venta',
    'piso en alquiler',
    'alquiler de',
    'detalles del inmueble',
    'características',
    'habitaciones',
    'dormitorios',
  ].some(marker => lowerTitle.includes(marker) || lowerBody.includes(marker));

  if (hasListingMarkers) {
    return false;
  }

  const challengeIndicators = [
    'just a moment',
    'moment please',
    'verify you are human',
    'checking your browser',
    'verificando tu navegador',
    'un momento, por favor',
    'atención al cliente: resuelve',
    'atencion al cliente: resuelve',
    'challenge-running',
    'cf-turnstile',
    'g-recaptcha',
    'hcaptcha',
  ];

  return challengeIndicators.some(ind => lowerTitle.includes(ind) || lowerBody.includes(ind));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a tab to reach 'complete' loading status on an actual web URL.
 */
function waitForTabLoad(
  tabId: number,
  timeoutMs: number = 20000,
  onTabRemoved?: () => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const timer = setTimeout(() => {
      cleanup();
      if (!resolved) {
        resolved = true;
        // Soft timeout: resolve and let DOM hydration polling handle ready state
        resolve();
      }
    }, timeoutMs);

    function updatedListener(
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab?: chrome.tabs.Tab
    ) {
      const isBlank = tab?.url ? tab.url.startsWith('about:') || tab.url.startsWith('chrome:') : false;
      if (
        updatedTabId === tabId &&
        changeInfo.status === 'complete' &&
        !isBlank
      ) {
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
  // Step 1: Run comprehensive DOM extractor in isolated world
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const pageTitle = document.title || '';
      const pageText = document.body
        ? (document.body.innerText || document.body.textContent || '').toLowerCase()
        : '';

      // 1. Delisting check
      const delistedPhrases = [
        'ya no está publicado',
        'este anuncio ya no está publicado',
        'el anuncio ya no está publicado',
        'dio de baja',
        'anuncio dado de baja',
        'inmueble no disponible',
        'anuncio no disponible',
        'este anuncio ha sido desactivado',
        'anuncio no encontrado',
        'el inmueble que buscas ya no está en idealista',
        'lo sentimos, este anuncio',
        'anuncio desactivado',
      ];
      const hasDelistedBanner = Boolean(
        document.querySelector(
          '.deactivated-detail, .advert-deactivated, .warning-box, #heading404'
        )
      );
      const isDelistedText = delistedPhrases.some(p => pageText.includes(p));
      const hasActivePrice = Boolean(
        document.querySelector('.info-data-price, .price-features__current-price')
      );
      const hasActiveMultimedia = Boolean(
        document.querySelector('#main-multimedia, .gallery-fallback, #multimedia-container')
      );

      // An ad is delisted if delisting text/banner is present, and no active main price or photo gallery exists
      const isDelisted = (isDelistedText || hasDelistedBanner) && (!hasActivePrice && !hasActiveMultimedia);
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

      // 2. Check for authentic listing DOM markers
      const hasListingElements = Boolean(
        document.querySelector(
          '.main-info__title-main, .main-info__title-minor, .info-data-price, .details-property_features, .details-property-feature, .comment, .description-content, #headerMap, .gallery-fallback, #main-multimedia'
        )
      );

      // 3. Challenge check: Only if listing elements are absent and not delisted
      let isChallenge = false;
      if (!hasListingElements && !isDelisted) {
        const challengeKeywords = [
          'just a moment',
          'verify you are human',
          'checking your browser',
          'verificando tu navegador',
          'un momento, por favor',
          'atención al cliente: resuelve',
          'atencion al cliente: resuelve',
        ];
        const hasChallengeSelector = Boolean(
          document.querySelector(
            '#challenge-running, #challenge-form, #challenge-stage, .cf-turnstile:not([style*="display: none"]), #dd-elements, #datadome'
          )
        );
        isChallenge =
          hasChallengeSelector ||
          challengeKeywords.some(kw => pageTitle.toLowerCase().includes(kw) || pageText.includes(kw));
      }

      if (isChallenge) {
        return { isChallenge: true, isDelisted: false };
      }

      // 4. Extract JSON-LD
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

      // 5. Description
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

      // 6. Location
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

      // 7. Features & Inmobiliaria / Advertiser
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

      // Advertiser / Inmobiliaria extraction
      let agency: string | undefined;
      let advertiserType: 'professional' | 'private' = 'professional';

      const agencyLinkEl = document.querySelector<HTMLAnchorElement>(
        'a[href*="/pro/"], .about-advertiser a, .professional-name a, .advertiser-name a'
      );
      if (agencyLinkEl?.textContent?.trim()) {
        agency = agencyLinkEl.textContent.trim();
        advertiserType = 'professional';
      }

      if (!agency) {
        const agencyNameEl = document.querySelector(
          '.about-advertiser-name, .professional-name, .advertiser-name, .about-advertiser .name'
        );
        if (agencyNameEl?.textContent?.trim()) {
          agency = agencyNameEl.textContent.trim();
          advertiserType = 'professional';
        }
      }

      if (!agency) {
        const logoEl = document.querySelector<HTMLImageElement>(
          '.about-advertiser img, .professional-logo img, img.logo-inmo'
        );
        if (logoEl?.alt?.trim()) {
          agency = logoEl.alt.trim();
          advertiserType = 'professional';
        }
      }

      const contactEl = document.querySelector('.contact-client-name, .about-advertiser');
      const contactText = (contactEl?.textContent || '').toLowerCase();
      if (!agency && (contactText.includes('particular') || pageText.includes('anuncio de particular'))) {
        agency = 'Particular';
        advertiserType = 'private';
      }

      if (!agency && jsonLdData.seller) {
        const sellerName = typeof jsonLdData.seller === 'string' ? jsonLdData.seller : jsonLdData.seller?.name;
        if (sellerName) {
          agency = sellerName;
          advertiserType = 'professional';
        }
      }

      if (agency) {
        features.agency = agency;
        features.advertiser_type = advertiserType;
      }

      // 8. Photos (Full Gallery extraction from window.fullScreenGalleryPics, scripts, DOM, and JSON-LD)
      const photos: Array<{ original_url: string; sequence_index: number; caption?: string }> = [];
      const seenPhotoIds = new Map<string, number>();

      function isValidListingPhoto(url: string): boolean {
        if (!url) return false;
        const lower = url.toLowerCase();
        if (
          lower.includes('.svg') ||
          lower.includes('.gif') ||
          lower.includes('/static/') ||
          lower.includes('/icons/') ||
          lower.includes('/flags/') ||
          lower.includes('st3.idealista.com') ||
          lower.includes('st2.idealista.com') ||
          lower.includes('st1.idealista.com')
        ) {
          return false;
        }
        return lower.includes('idealista.com') && (lower.includes('img') || lower.includes('image'));
      }

      function getPhotoBaseId(url: string): string {
        const match = url.match(/\/([^\/?#]+?)\.(?:webp|jpg|jpeg|png)(?:$|\?)/i);
        return match ? match[1] : url;
      }

      function addPhoto(rawUrl: string, caption?: string) {
        if (!rawUrl) return;
        const cleanUrl = rawUrl.split('?')[0].trim();
        if (!cleanUrl || !isValidListingPhoto(cleanUrl)) return;

        const photoId = getPhotoBaseId(cleanUrl);
        if (seenPhotoIds.has(photoId)) {
          const existingIdx = seenPhotoIds.get(photoId)!;
          const existingUrl = photos[existingIdx].original_url;
          // Prefer .jpg over .webp if upgrading
          if (cleanUrl.toLowerCase().endsWith('.jpg') && !existingUrl.toLowerCase().endsWith('.jpg')) {
            photos[existingIdx].original_url = cleanUrl;
          }
          if (caption && !photos[existingIdx].caption) {
            photos[existingIdx].caption = caption.trim();
          }
          return;
        }

        seenPhotoIds.set(photoId, photos.length);
        photos.push({
          original_url: cleanUrl,
          sequence_index: photos.length,
          caption: caption?.trim() || undefined,
        });
      }

      function extractBalancedJson(text: string, marker: string): string | null {
        const pos = text.indexOf(marker);
        if (pos === -1) return null;
        const firstBrace = text.indexOf('{', pos);
        const firstBracket = text.indexOf('[', pos);
        if (firstBrace === -1 && firstBracket === -1) return null;

        const startIdx =
          firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)
            ? firstBrace
            : firstBracket;
        const openCh = text[startIdx];
        const closeCh = openCh === '{' ? '}' : ']';

        let depth = 0;
        let inString = false;
        let quoteChar = '';
        let escape = false;

        for (let i = startIdx; i < text.length; i++) {
          const ch = text[i];
          if (escape) {
            escape = false;
            continue;
          }
          if (ch === '\\') {
            escape = true;
            continue;
          }
          if (inString) {
            if (ch === quoteChar) inString = false;
            continue;
          }
          if (ch === '"' || ch === "'") {
            inString = true;
            quoteChar = ch;
            continue;
          }
          if (ch === openCh) depth++;
          else if (ch === closeCh) {
            depth--;
            if (depth === 0) return text.substring(startIdx, i + 1);
          }
        }
        return null;
      }

      function parseMediaPayload(obj: any) {
        if (!obj) return;
        if (Array.isArray(obj)) {
          for (const item of obj) parseMediaPayload(item);
        } else if (typeof obj === 'object') {
          const url = obj.url || obj.src || obj.rawUrl || obj.original || obj.msrc;
          if (url && typeof url === 'string') {
            addPhoto(url, obj.tag || obj.caption || obj.title || obj.description);
          }
          if (Array.isArray(obj.multimedias)) parseMediaPayload(obj.multimedias);
          if (Array.isArray(obj.photos)) parseMediaPayload(obj.photos);
          if (Array.isArray(obj.images)) parseMediaPayload(obj.images);
        }
      }

      // Priority 1: Extract full high-res photo gallery from inline script tags
      const scriptElements = Array.from(document.querySelectorAll('script'));
      for (const script of scriptElements) {
        const text = script.textContent || '';

        // 1. adMultimediasInfo
        if (text.includes('adMultimediasInfo')) {
          const rawMedia = extractBalancedJson(text, 'adMultimediasInfo');
          if (rawMedia) {
            try {
              const fixedJson = rawMedia
                .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
                .replace(/,\s*([}\]])/g, '$1');
              const parsed = JSON.parse(fixedJson);
              parseMediaPayload(parsed);
            } catch (_) {
              const urlRegex = /https:\/\/(?:img\d*|images\d*)\.idealista\.com\/[^\s"',]+/g;
              let urlMatch;
              while ((urlMatch = urlRegex.exec(rawMedia)) !== null) {
                addPhoto(urlMatch[0]);
              }
            }
          }
        }

        // 2. fullScreenGalleryPics
        if (text.includes('fullScreenGalleryPics')) {
          const rawPics = extractBalancedJson(text, 'fullScreenGalleryPics');
          if (rawPics) {
            try {
              const fixedJson = rawPics
                .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
                .replace(/,\s*([}\]])/g, '$1');
              const items = JSON.parse(fixedJson);
              parseMediaPayload(items);
            } catch (_) {
              const urlRegex = /https:\/\/(?:img\d*|images\d*)\.idealista\.com\/[^\s"',]+/g;
              let urlMatch;
              while ((urlMatch = urlRegex.exec(rawPics)) !== null) {
                addPhoto(urlMatch[0]);
              }
            }
          }
        }
      }

      // Priority 2: Script regex scan for high-res property images if < 3 photos found
      if (photos.length < 3) {
        for (const script of scriptElements) {
          const text = script.textContent || '';
          if (
            text.includes('idealista.com') &&
            (text.includes('WEB_DETAIL') || text.includes('image.master') || text.includes('blur/'))
          ) {
            const urlRegex =
              /https:\/\/(?:img\d*|images\d*)\.idealista\.com\/(?:blur\/)?(?:WEB_DETAIL[^\s"',]*|480_360[^\s"',]*|id\.pro[^\s"',]*)\/[^\s"',]+\.(?:webp|jpg|jpeg)/gi;
            let m;
            while ((m = urlRegex.exec(text)) !== null) {
              addPhoto(m[0]);
            }
          }
        }
      }

      // Priority 2: Check DOM gallery images (including opened gallery modal/slider containers)
      const galleryContainers = document.querySelectorAll(
        '#fullScreenGallery, .fullScreenGallery, .gallery-slider, .slideshow, .modal-gallery, .gallery-modal, .media-viewer, #main-multimedia, .gallery-mosaic, .main-image, .gallery-fallback, #mosaic-container, .detail-image-gallery, .gallery, article.container-detail'
      );
      galleryContainers.forEach(container => {
        const imgElements = container.querySelectorAll<HTMLImageElement>('img, source');
        imgElements.forEach(el => {
          const rawUrl =
            el.getAttribute('data-ondemand-img') ||
            el.getAttribute('data-src') ||
            (el as HTMLImageElement).src ||
            el.getAttribute('srcset');
          if (rawUrl) {
            const firstSrc = rawUrl.split(',')[0].trim().split(' ')[0];
            addPhoto(firstSrc, (el as HTMLImageElement).alt);
          }
        });
      });

      // Priority 3: Fallback to JSON-LD image property
      if (photos.length === 0 && jsonLdData.image) {
        const jsonImgs = Array.isArray(jsonLdData.image) ? jsonLdData.image : [jsonLdData.image];
        jsonImgs.forEach((img: any) => {
          const url = typeof img === 'string' ? img : img?.url;
          if (url) {
            addPhoto(url, typeof img === 'object' ? img?.caption : undefined);
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

  const inspection = results?.[0]?.result || { isChallenge: false, isDelisted: false };

  // Always query window.fullScreenGalleryPics in world: 'MAIN' to ensure full high-res photo gallery is captured
  if (!inspection.isChallenge && !inspection.isDelisted && inspection.data) {
    try {
      const mainResult = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
          const win = window as any;
          const candidates = [
            win.fullScreenGalleryPics,
            win.adMultimediasInfo,
            win.idealista?.detailConfig?.fullScreenGalleryPics,
            win.idealista?.adDetail?.multimedias,
            win.idealista?.adMultimediasInfo,
          ];
          const out: Array<{ url: string; tag?: string }> = [];
          function collect(item: any) {
            if (!item) return;
            if (Array.isArray(item)) {
              for (const el of item) collect(el);
            } else if (typeof item === 'object') {
              const u = item.url || item.src || item.rawUrl || item.original || item.msrc;
              if (u && typeof u === 'string') {
                out.push({
                  url: u,
                  tag: item.tag || item.title || item.caption || item.description,
                });
              }
              if (Array.isArray(item.multimedias)) collect(item.multimedias);
              if (Array.isArray(item.photos)) collect(item.photos);
              if (Array.isArray(item.images)) collect(item.images);
            }
          }
          for (const cand of candidates) {
            if (cand) collect(cand);
          }
          return out;
        },
      });
      if (mainResult?.[0]?.result && Array.isArray(mainResult[0].result) && mainResult[0].result.length > 0) {
        const photosList = inspection.data.photos as Array<{
          original_url: string;
          sequence_index: number;
          caption?: string;
        }>;
        const seenPhotoIds = new Map<string, number>();
        photosList.forEach((p, idx) => {
          const match = p.original_url.match(/\/([^\/?#]+?)\.(?:webp|jpg|jpeg|png)(?:$|\?)/i);
          const key = match ? match[1] : p.original_url;
          seenPhotoIds.set(key, idx);
        });

        for (const item of mainResult[0].result) {
          const clean = item?.url?.split('?')[0].trim();
          if (!clean) continue;
          const match = clean.match(/\/([^\/?#]+?)\.(?:webp|jpg|jpeg|png)(?:$|\?)/i);
          const key = match ? match[1] : clean;

          if (seenPhotoIds.has(key)) {
            const existingIdx = seenPhotoIds.get(key)!;
            const existingUrl = photosList[existingIdx].original_url;
            if (clean.toLowerCase().endsWith('.jpg') && !existingUrl.toLowerCase().endsWith('.jpg')) {
              photosList[existingIdx].original_url = clean;
            }
            if (item.tag && !photosList[existingIdx].caption) {
              photosList[existingIdx].caption = item.tag;
            }
          } else {
            seenPhotoIds.set(key, photosList.length);
            photosList.push({
              original_url: clean,
              sequence_index: photosList.length,
              caption: item.tag || undefined,
            });
          }
        }
      }
    } catch (_) {}
  }

  return inspection;
}

/**
 * Simulate clicking the "Más fotos" / photo gallery trigger button to open the full gallery.
 */
export async function triggerGalleryClick(tabId: number): Promise<boolean> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // 1. Scroll slightly so multimedia container is active in viewport
        try {
          window.scrollTo({ top: 350, behavior: 'instant' });
        } catch (_) {}

        // 2. Known selector candidates on Idealista detail pages
        const selectorCandidates = [
          'button.show-multimedia',
          'a.show-multimedia',
          '.multimedia-count',
          '.zone-multimedia button',
          '.zone-multimedia a',
          '.btn-more-photos',
          'button.more-photos',
          'button.show-all-photos',
          'button.gallery-trigger',
          'button[data-action="open-gallery"]',
          'button[data-action="show-photos"]',
          '[data-action*="photo"]',
          '[data-action*="gallery"]',
          '.gallery-transition',
          '[data--qa="gallery-open"]',
          '#main-multimedia button',
          '.main-multimedia button',
          '#main-multimedia .main-image',
          '#main-multimedia img',
          '.main-image img',
          '.gallery-mosaic img',
          '.gallery-mosaic button',
          'article.container-detail .main-image',
        ];

        let target: HTMLElement | null = null;
        for (const sel of selectorCandidates) {
          const el = document.querySelector<HTMLElement>(sel);
          if (el) {
            target = el;
            break;
          }
        }

        // 3. Fallback: Search elements inside multimedia zone or buttons with specific text
        if (!target) {
          const clickables = Array.from(
            document.querySelectorAll<HTMLElement>(
              '#main-multimedia button, #main-multimedia a, .zone-multimedia button, .zone-multimedia a, button, a'
            )
          );
          target =
            clickables.find(el => {
              const text = (el.innerText || el.textContent || '').toLowerCase().trim();
              return (
                text.includes('más fotos') ||
                text.includes('todas las fotos') ||
                text.includes('ver fotos') ||
                (text.includes('foto') && !text.includes('pedir') && !text.includes('denunciar'))
              );
            }) || null;
        }

        if (target) {
          try {
            target.scrollIntoView({ block: 'center', behavior: 'instant' });
          } catch (_) {}

          ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evtType => {
            try {
              target!.dispatchEvent(
                new MouseEvent(evtType, {
                  view: window,
                  bubbles: true,
                  cancelable: true,
                  buttons: 1,
                })
              );
            } catch (_) {}
          });
          if (typeof target.click === 'function') {
            target.click();
          }
          return true;
        }
        return false;
      },
    });
    return Boolean(results?.[0]?.result);
  } catch (err) {
    console.debug('[DetailCrawler] Error triggering gallery click:', err);
    return false;
  }
}

/**
 * Execute deep listing analysis for all pending properties in queue.
 */
export async function runFullPendingDetailQueue(
  options: DetailQueueOptions = {}
): Promise<{ processed: number; errors: number; total: number }> {
  // Prevent duplicate concurrent queues from running in parallel
  if (isDetailQueueRunning) {
    console.warn('[DetailCrawler] Queue already running. Skipping duplicate execution.');
    return { processed: 0, errors: 0, total: 0 };
  }
  isDetailQueueRunning = true;

  const {
    onProgress,
    isCancelled,
    jitterMinMs = 3000,
    jitterMaxMs = 6000,
    hydrationDelayMs = 2000,
    pollChallengeIntervalMs = 1500,
    maxChallengeWaitMs = 120000,
  } = options;

  let processed = 0;
  let errors = 0;
  let totalProcessedOverall = 0;

  console.log('[DetailCrawler] Starting full pending detail crawl queue...');

  try {
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

          await waitForTabLoad(tabId, 20000);
          await sleep(hydrationDelayMs);

          // Inspect content & check for challenge
          let inspection = await inspectTabContent(tabId);

          // Wait for DOM content to actually hydrate (avoid submitting empty blank pages)
          let waitHydrationTries = 0;
          while (
            !inspection.isChallenge &&
            !inspection.isDelisted &&
            (!inspection.data || (!inspection.data.full_description && inspection.data.photos.length === 0)) &&
            waitHydrationTries < 6
          ) {
            if (tabWasClosedByUser || isCancelled?.()) break;
            waitHydrationTries++;
            console.log(
              `[DetailCrawler] Waiting for page content to hydrate for ${listing.idealista_id} (try ${waitHydrationTries}/6)...`
            );
            await sleep(1500);
            inspection = await inspectTabContent(tabId);
          }

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

          // Simulate clicking "Más fotos" / gallery trigger if less than 3 photos were found
          if (!tabWasClosedByUser && !isCancelled?.() && !inspection.isDelisted) {
            if (!inspection.data || inspection.data.photos.length < 3) {
              const galleryClicked = await triggerGalleryClick(tabId);
              if (galleryClicked) {
                console.log(
                  `[DetailCrawler] Triggered gallery photo button for ${listing.idealista_id}, waiting for gallery hydration...`
                );
                await sleep(2000);
                // Re-inspect tab now that gallery is open and photos are fully rendered/populated
                inspection = await inspectTabContent(tabId);
              }
            }
          }

          if (inspection.isDelisted) {
            console.log(`[DetailCrawler] Listing ${listing.idealista_id} confirmed delisted. Discarding.`);
            await submitPropertyDetail(listing.idealista_id, {
              source_engine: 'chrome_extension',
              delisted: true,
              photos: [],
            });
            processed++;
          } else if (
            inspection.data &&
            (inspection.data.full_description || inspection.data.photos.length > 0)
          ) {
            console.log(
              `[DetailCrawler] Submitting snapshot for ${listing.idealista_id} (${inspection.data.photos.length} photos, agency: ${inspection.data.features?.agency || 'N/A'})...`
            );
            await submitPropertyDetail(listing.idealista_id, inspection.data);
            processed++;
          } else {
            throw new Error('Listing page failed to hydrate content (empty description and photos)');
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
        } finally {
          if (tabId && !tabWasClosedByUser) {
            try {
              await chrome.tabs.remove(tabId);
            } catch (_) {}
          }

          // Polite jittered delay between tabs
          const jitter = jitterMinMs + Math.floor(Math.random() * (jitterMaxMs - jitterMinMs + 1));
          await sleep(jitter);
        }

        if (isCancelled?.()) {
          break;
        }
      }

      if (isCancelled?.()) break;
    }
  } finally {
    isDetailQueueRunning = false;
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
    jitterMinMs: 3000,
    jitterMaxMs: 6000,
  });
}
