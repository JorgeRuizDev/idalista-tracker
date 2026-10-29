/**
 * Content script to extract full listing snapshot from Idealista listing detail pages.
 */
import type { DetailSnapshotPayload, DetailPhotoItem } from '../types';

/**
 * Check if the current page represents a delisted property.
 */
export function isListingDelisted(): boolean {
  const pageText = document.body
    ? (document.body.innerText || document.body.textContent || '').toLowerCase()
    : '';
  const delistedPhrases = [
    'el anuncio ya no está publicado',
    'anuncio dado de baja',
    'inmueble no disponible',
    'este anuncio ha sido desactivado',
    'anuncio no encontrado',
    'el inmueble que buscas ya no está en idealista',
  ];
  return delistedPhrases.some(phrase => pageText.includes(phrase));
}

/**
 * Extract full property details from the DOM and JSON-LD.
 */
export function extractDetailSnapshot(): DetailSnapshotPayload {
  if (isListingDelisted()) {
    return {
      source_engine: 'chrome_extension',
      delisted: true,
      photos: [],
    };
  }

  // 1. JSON-LD parsing
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
  } catch (e) {
    console.debug('Error parsing JSON-LD in detail_extractor:', e);
  }

  // 2. Full description
  let fullDescription = '';
  const descParagraphs = Array.from(
    document.querySelectorAll('.comment p, .description-content p, .adCommentsLanguage p')
  )
    .map(p => p.textContent?.trim())
    .filter(Boolean);

  if (descParagraphs.length > 0) {
    fullDescription = descParagraphs.join('\n\n');
  } else {
    const descContainer = document.querySelector('.comment, .description-content, .adCommentsLanguage');
    fullDescription = descContainer?.textContent?.trim() || jsonLdData.description || '';
  }

  // 3. Location hierarchy
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

  // 4. Coordinates
  let latitude: number | undefined;
  let longitude: number | undefined;
  if (jsonLdData.geo) {
    latitude = parseFloat(jsonLdData.geo.latitude);
    longitude = parseFloat(jsonLdData.geo.longitude);
  }

  // 5. Features
  const features: Record<string, any> = {};
  const featureItems = document.querySelectorAll('.details-property_features li, .details-property-feature li');
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
  const pageText = document.body
    ? (document.body.innerText || document.body.textContent || '').toLowerCase()
    : '';
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

  // 6. Gallery photos
  const photos: DetailPhotoItem[] = [];
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

  // Step A: Extract full high-res photo gallery from inline script tags
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

  // Step B: Script regex scan for high-res property images if < 3 photos found
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

  // Step B: Check DOM gallery images (including opened gallery modal/slider containers)
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

  // Step C: Fallback to JSON-LD image property
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
  };
}

// Listen for message from background script
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'EXTRACT_PROPERTY_DETAIL') {
      try {
        const payload = extractDetailSnapshot();
        sendResponse({ success: true, data: payload });
      } catch (err) {
        sendResponse({ success: false, error: String(err) });
      }
      return true;
    }
  });
}
