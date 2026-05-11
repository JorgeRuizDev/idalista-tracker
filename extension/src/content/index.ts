// Content script entry point
import { extractSavedSearches } from './searches';
import { extractPropertyListings, getPaginationInfo } from './listings';
import type { ExtractedSavedSearch, ExtractedProperty, PaginationInfo } from '../types';

// Detect page type and extract appropriate data
function detectPageType(): 'saved_searches' | 'search_results' | 'property_detail' | 'unknown' {
  const url = window.location.href;
  
  if (url.includes('/usuario/tus-alertas') || url.includes('/usuario/busquedas-guardadas')) {
    return 'saved_searches';
  }
  
  if (document.querySelector('article.item[data-element-id]')) {
    return 'search_results';
  }
  
  if (url.includes('/inmueble/')) {
    return 'property_detail';
  }
  
  return 'unknown';
}

// Main extraction function
function extractPageData() {
  const pageType = detectPageType();
  console.log('Idalista: Detected page type:', pageType);
  
  switch (pageType) {
    case 'saved_searches':
      return {
        type: 'saved_searches',
        data: extractSavedSearches(),
      };
      
    case 'search_results':
      return {
        type: 'search_results',
        listings: extractPropertyListings(),
        pagination: getPaginationInfo(),
      };
      
    default:
      return { type: pageType, data: null };
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'EXTRACT_DATA') {
    const data = extractPageData();
    sendResponse(data);
  }
  
  if (request.action === 'EXTRACT_SEARCHES') {
    const searches = extractSavedSearches();
    sendResponse({ type: 'saved_searches', data: searches });
  }
  
  if (request.action === 'EXTRACT_LISTINGS') {
    const listings = extractPropertyListings();
    const pagination = getPaginationInfo();
    sendResponse({ type: 'search_results', listings, pagination });
  }
  
  if (request.action === 'NAVIGATE') {
    if (request.url) {
      window.location.href = request.url;
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No URL provided' });
    }
  }
  
  return true;
});

// Auto-extract on page load if configured
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Idalista: Content script loaded');
  });
} else {
  console.log('Idalista: Content script loaded (document already ready)');
}

export { extractPageData, detectPageType };
