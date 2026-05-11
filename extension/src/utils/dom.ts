// DOM extraction utilities

/**
 * Safely query for a single element
 */
export function querySelector<T extends Element>(
  selector: string,
  context: Document | Element = document
): T | null {
  return context.querySelector(selector) as T | null;
}

/**
 * Safely query for multiple elements
 */
export function querySelectorAll<T extends Element>(
  selector: string,
  context: Document | Element = document
): T[] {
  return Array.from(context.querySelectorAll(selector)) as T[];
}

/**
 * Get text content from an element
 */
export function getTextContent(
  element: Element | null,
  defaultValue: string = ''
): string {
  return element?.textContent?.trim() || defaultValue;
}

/**
 * Get attribute from an element
 */
export function getAttribute(
  element: Element | null,
  attribute: string,
  defaultValue: string = ''
): string {
  return element?.getAttribute(attribute) || defaultValue;
}

/**
 * Extract number from text
 */
export function extractNumber(text: string): number | undefined {
  const match = text.replace(/\./g, '').replace(/,/g, '.').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Wait for element to appear in DOM
 */
export function waitForElement(
  selector: string,
  timeout: number = 5000
): Promise<Element | null> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }
    
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Check if element is visible
 */
export function isVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Scroll element into view smoothly
 */
export function scrollToElement(element: Element): void {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
