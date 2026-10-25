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

  // 6. Gallery photos
  const photos: DetailPhotoItem[] = [];
  const seenUrls = new Set<string>();

  const imgElements = document.querySelectorAll<HTMLImageElement>(
    'img[src*="idealista.com"], img[data-ondemand-img*="idealista.com"], .gallery-fallback img'
  );

  imgElements.forEach(img => {
    const rawUrl = img.getAttribute('data-ondemand-img') || img.src;
    if (!rawUrl) return;

    // Clean URL query params
    const cleanUrl = rawUrl.split('?')[0].trim();
    if (!cleanUrl || seenUrls.has(cleanUrl)) return;

    seenUrls.add(cleanUrl);
    photos.push({
      original_url: cleanUrl,
      sequence_index: photos.length,
      caption: img.alt?.trim() || undefined,
    });
  });

  // Also check JSON-LD images if DOM photos are sparse
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
