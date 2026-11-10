/**
 * Shared challenge detection utilities for search and detail crawler pages.
 */

export const CHALLENGE_INDICATORS = [
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
  'datadome',
] as const;

export const AUTHENTIC_PAGE_MARKERS = [
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
  'inmuebles encontrados',
  'guardar alerta',
  'ordenar por',
  'filtros',
] as const;

/**
 * Check if a title or text indicates a bot challenge (Cloudflare, Turnstile, CAPTCHA).
 */
export function checkForChallenge(title: string, bodyText: string): boolean {
  const lowerTitle = (title || '').toLowerCase();
  const lowerBody = (bodyText || '').toLowerCase();

  // If authentic content markers are present, check if challenge indicator overrides
  const hasAuthenticMarkers = AUTHENTIC_PAGE_MARKERS.some(
    marker => lowerTitle.includes(marker) || lowerBody.includes(marker)
  );

  const hasChallengeText = CHALLENGE_INDICATORS.some(
    ind => lowerTitle.includes(ind) || lowerBody.includes(ind)
  );

  if (hasAuthenticMarkers && !hasChallengeText) {
    return false;
  }

  return hasChallengeText;
}

/**
 * Browser-injected function to inspect DOM for challenges.
 * Can be serialized and run inside chrome.scripting.executeScript.
 */
export function inspectPageChallengeInBrowser(): {
  isChallenge: boolean;
  reason?: 'cloudflare_turnstile' | 'captcha' | 'antibot_block';
} {
  const pageTitle = (document.title || '').toLowerCase();
  const pageText = (document.body ? document.body.innerText || document.body.textContent || '' : '').toLowerCase();

  // Check if authentic listing elements exist FIRST: if real listing elements are present, it is not a blocking challenge
  const hasAuthenticListing = Boolean(
    document.querySelector(
      '.main-info__title-main, .info-data-price, .details-property_features, #main-multimedia, #main-content, .item-info-container, article.item'
    )
  );
  if (hasAuthenticListing) {
    return { isChallenge: false };
  }

  // Check for DOM challenge elements
  const hasTurnstile = Boolean(
    document.querySelector('.cf-turnstile, #challenge-stage, #challenge-running, #challenge-form')
  );
  if (hasTurnstile) {
    return { isChallenge: true, reason: 'cloudflare_turnstile' };
  }

  const hasCaptcha = Boolean(
    document.querySelector('.g-recaptcha, .hcaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], #datadome, #dd-elements')
  );
  if (hasCaptcha) {
    return { isChallenge: true, reason: 'captcha' };
  }

  // Text-based indicators
  const challengeKeywords = [
    'just a moment',
    'verify you are human',
    'checking your browser',
    'verificando tu navegador',
    'un momento, por favor',
    'atención al cliente: resuelve',
    'atencion al cliente: resuelve',
  ];

  const hasChallengeKeyword = challengeKeywords.some(
    kw => pageTitle.includes(kw) || pageText.includes(kw)
  );

  if (hasChallengeKeyword) {
    return { isChallenge: true, reason: 'antibot_block' };
  }

  return { isChallenge: false };
}
