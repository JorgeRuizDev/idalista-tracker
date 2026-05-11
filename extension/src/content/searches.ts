// Saved searches extraction from Idealista
import type { ExtractedSavedSearch } from '../types';

/**
 * Extract saved searches from the Idealista saved searches page
 */
export function extractSavedSearches(): ExtractedSavedSearch[] {
  const searches: ExtractedSavedSearch[] = [];
  
  // Try different selectors for saved searches
  const selectors = [
    'article.your-searches__card',
    'article[data-searchid]',
    '.your-searches__item',
    '.search-card',
  ];
  
  let searchElements: NodeListOf<Element> | null = null;
  
  for (const selector of selectors) {
    searchElements = document.querySelectorAll(selector);
    if (searchElements.length > 0) {
      console.log(`Found ${searchElements.length} saved searches with selector: ${selector}`);
      break;
    }
  }
  
  if (!searchElements || searchElements.length === 0) {
    console.log('No saved searches found on page');
    return searches;
  }
  
  searchElements.forEach((element, index) => {
    try {
      const search = parseSearchElement(element, index);
      if (search) {
        searches.push(search);
      }
    } catch (error) {
      console.error('Error parsing search element:', error);
    }
  });
  
  return searches;
}

/**
 * Parse a single saved search element
 */
function parseSearchElement(element: Element, index: number): ExtractedSavedSearch | null {
  // Try to get external ID from data attribute
  let externalId = element.getAttribute('data-searchid');
  
  // If not found, try to extract from URL
  if (!externalId) {
    const linkElement = element.querySelector('a[href*="/venta-"], a[href*="/alquiler-"]');
    if (linkElement) {
      const href = linkElement.getAttribute('href') || '';
      const match = href.match(/[?&]searchId=([^&]+)/);
      if (match) {
        externalId = match[1];
      }
    }
  }
  
  // Generate fallback ID if still not found
  if (!externalId) {
    externalId = `search_${Date.now()}_${index}`;
  }
  
  // Get search name/title
  const nameSelectors = [
    '.your-searches__title',
    'h2',
    'h3',
    '.search-title',
    '.title',
  ];
  
  let name = '';
  for (const selector of nameSelectors) {
    const nameEl = element.querySelector(selector);
    if (nameEl) {
      name = nameEl.textContent?.trim() || '';
      break;
    }
  }
  
  if (!name) {
    name = `Search ${index + 1}`;
  }
  
  // Get URL
  const urlElement = element.querySelector('a[href*="/venta-"], a[href*="/alquiler-"]');
  const urlPath = urlElement?.getAttribute('href') || '';
  const fullUrl = urlPath.startsWith('http') 
    ? urlPath 
    : `https://www.idealista.com${urlPath}`;
  
  // Get result count
  const countSelectors = [
    '.your-searches__count',
    '.result-count',
    '.count',
  ];
  
  let resultCount: number | undefined;
  for (const selector of countSelectors) {
    const countEl = element.querySelector(selector);
    if (countEl) {
      const countText = countEl.textContent || '';
      const match = countText.match(/(\d+)/);
      if (match) {
        resultCount = parseInt(match[1], 10);
        break;
      }
    }
  }
  
  // Get description
  const descSelectors = [
    '.your-searches__description',
    '.description',
    'p',
  ];
  
  let description: string | undefined;
  for (const selector of descSelectors) {
    const descEl = element.querySelector(selector);
    if (descEl) {
      description = descEl.textContent?.trim();
      break;
    }
  }
  
  return {
    external_id: externalId,
    name,
    url: urlPath,
    full_url: fullUrl,
    result_count: resultCount,
    description,
  };
}
