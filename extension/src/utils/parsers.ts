// Data parsing utilities

/**
 * Parse price string to number
 * Handles formats like "150.000 €", "150000", "€150,000"
 */
export function parsePrice(priceText: string): number {
  if (!priceText) return 0;
  
  // Remove currency symbols and whitespace
  const cleaned = priceText
    .replace(/[€$£]/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')  // Remove thousand separators (European)
    .replace(/,/g, '.'); // Convert decimal comma to dot
  
  // Extract number
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Parse square meters from text
 * Handles formats like "134 m²", "134m2", "134"
 */
export function parseSquareMeters(text: string): number | undefined {
  if (!text) return undefined;
  
  const match = text.match(/(\d+)\s*m[²2]/i);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Parse number of bedrooms from text
 * Handles formats like "3 hab", "3 dormitorios", "3 beds"
 */
export function parseBedrooms(text: string): number | undefined {
  if (!text) return undefined;
  
  // Match bedroom patterns
  const patterns = [
    /(\d+)\s*hab/i,
    /(\d+)\s*dormitorio/i,
    /(\d+)\s*bed/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  return undefined;
}

/**
 * Parse floor information from text
 */
export function parseFloorInfo(text: string): string | undefined {
  if (!text) return undefined;
  
  // Match floor patterns
  const patterns = [
    /(planta\s+\w+)/i,
    /(\d+ª?\s*planta)/i,
    /(bajo)/i,
    /(entresuelo)/i,
    /(ático|atico)/i,
    /(sótano|sotano)/i,
    /(interior|exterior)/i,
    /(con ascensor|sin ascensor)/i,
  ];
  
  const results: string[] = [];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      results.push(match[1]);
    }
  }
  
  return results.length > 0 ? results.join(', ') : undefined;
}

/**
 * Parse elevator information from floor text
 */
export function parseElevator(floorInfo: string): boolean | undefined {
  if (!floorInfo) return undefined;
  
  if (/con ascensor/i.test(floorInfo)) {
    return true;
  }
  if (/sin ascensor/i.test(floorInfo)) {
    return false;
  }
  
  return undefined;
}

/**
 * Clean and truncate description text
 */
export function cleanDescription(text: string, maxLength: number = 2000): string {
  if (!text) return '';
  
  // Remove extra whitespace
  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
  
  // Truncate if too long
  if (cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength - 3) + '...';
  }
  
  return cleaned;
}

/**
 * Extract property ID from URL
 */
export function extractPropertyId(url: string): string | undefined {
  const match = url.match(/inmueble\/(\d+)/);
  return match ? match[1] : undefined;
}

/**
 * Normalize URL (ensure it has protocol and domain)
 */
export function normalizeUrl(url: string, base: string = 'https://www.idealista.com'): string {
  if (url.startsWith('http')) {
    return url;
  }
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  if (url.startsWith('/')) {
    return `${base}${url}`;
  }
  return `${base}/${url}`;
}

/**
 * Parse date string to ISO format
 */
export function parseDate(dateText: string): string | undefined {
  if (!dateText) return undefined;
  
  const date = new Date(dateText);
  if (isNaN(date.getTime())) {
    return undefined;
  }
  
  return date.toISOString();
}
