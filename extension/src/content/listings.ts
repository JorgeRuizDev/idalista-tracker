// Property listings extraction from Idealista search results
import type { ExtractedProperty, PaginationInfo } from '../types';

/**
 * Extract property listings from Idealista search results page
 */
export function extractPropertyListings(): ExtractedProperty[] {
  const properties: ExtractedProperty[] = [];
  
  // Selector for property articles
  const propertyElements = document.querySelectorAll('article.item[data-element-id]');
  
  console.log(`Found ${propertyElements.length} property listings`);
  
  propertyElements.forEach((element) => {
    try {
      const property = parsePropertyElement(element);
      if (property) {
        properties.push(property);
      }
    } catch (error) {
      console.error('Error parsing property element:', error);
    }
  });
  
  return properties;
}

/**
 * Parse a single property element
 */
function parsePropertyElement(element: Element): ExtractedProperty | null {
  // Get external ID from data attribute
  const externalId = element.getAttribute('data-element-id');
  if (!externalId) {
    console.warn('Property element missing data-element-id');
    return null;
  }
  
  // Get title
  const titleEl = element.querySelector('.item-info-container h3 a, .item-link, .item-title');
  const title = titleEl?.textContent?.trim() || '';
  
  // Get URL
  const urlPath = titleEl?.getAttribute('href') || '';
  const url = urlPath.startsWith('http') ? urlPath : `https://www.idealista.com${urlPath}`;
  
  // Get price
  const priceEl = element.querySelector('.item-price, .price');
  const priceText = priceEl?.textContent?.trim() || '';
  const price = parsePrice(priceText);
  
  // Get location
  const locationEl = element.querySelector('.item-detail-char, .item-address, .address');
  const location = locationEl?.textContent?.trim() || '';
  
  // Get details (size, bedrooms, floor)
  const detailsEl = element.querySelector('.item-detail-char');
  const detailsText = detailsEl?.textContent?.trim() || '';
  
  const squareMeters = extractSquareMeters(detailsText);
  const bedrooms = extractBedrooms(detailsText);
  const floorInfo = extractFloorInfo(detailsText);
  
  // Get description
  const descEl = element.querySelector('.item-description, .description');
  const description = descEl?.textContent?.trim();
  
  // Get photos
  const photos: string[] = [];
  const imgEl = element.querySelector('.item-gallery img, .item-image img');
  if (imgEl) {
    const src = imgEl.getAttribute('src') || imgEl.getAttribute('data-src');
    if (src) {
      photos.push(src);
    }
  }
  
  return {
    external_id: externalId,
    title,
    price,
    currency: 'EUR',
    location,
    url,
    square_meters: squareMeters,
    bedrooms,
    floor_info: floorInfo,
    description,
    photos,
  };
}

/**
 * Parse price from text (e.g., "150.000 €" -> 150000)
 */
function parsePrice(priceText: string): number {
  const cleaned = priceText
    .replace(/[€$£]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/\s/g, '');
  
  const match = cleaned.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Extract square meters from details text
 */
function extractSquareMeters(detailsText: string): number | undefined {
  const match = detailsText.match(/(\d+)\s*m²/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Extract number of bedrooms from details text
 */
function extractBedrooms(detailsText: string): number | undefined {
  const match = detailsText.match(/(\d+)\s*hab/i);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Extract floor info from details text
 */
function extractFloorInfo(detailsText: string): string | undefined {
  const floorMatch = detailsText.match(/(planta\s+\w+|\d+ª?\s*planta|bajo|entresuelo|ático|sótano)/i);
  return floorMatch ? floorMatch[1] : undefined;
}

/**
 * Get pagination information from the page
 */
export function getPaginationInfo(): PaginationInfo {
  const info: PaginationInfo = {
    current_page: 1,
    has_next_page: false,
  };
  
  // Get current page from URL or pagination
  const urlMatch = window.location.href.match(/pagina-(\d+)/);
  if (urlMatch) {
    info.current_page = parseInt(urlMatch[1], 10);
  }
  
  // Check for next page
  const nextLink = document.querySelector('.pagination li.next a, a.next, .next a');
  if (nextLink) {
    info.has_next_page = true;
    const href = nextLink.getAttribute('href') || '';
    // Convert relative URL to absolute URL
    if (href) {
      try {
        // Use the current page's URL as the base for relative URLs
        const absoluteUrl = new URL(href, window.location.href).href;
        info.next_page_url = absoluteUrl;
        console.log('Next page URL:', absoluteUrl);
      } catch (e) {
        console.error('Failed to construct absolute URL from:', href);
        info.next_page_url = href;
      }
    }
  }
  
  // Get total pages if available
  const lastPageEl = document.querySelector('.pagination li:last-child a, .pagination .last a');
  if (lastPageEl) {
    const href = lastPageEl.getAttribute('href') || '';
    const pageMatch = href.match(/pagina-(\d+)/);
    if (pageMatch) {
      info.total_pages = parseInt(pageMatch[1], 10);
    }
  }
  
  return info;
}
