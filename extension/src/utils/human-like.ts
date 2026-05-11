// Human behavior simulation utilities

/**
 * Generate a random delay within a range
 */
export function getRandomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simulate human-like scrolling on the page
 */
export async function simulateScroll(
  options: {
    steps?: number;
    minDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<void> {
  const { steps = 5, minDelay = 200, maxDelay = 800 } = options;
  
  const pageHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;
  const scrollableHeight = pageHeight - viewportHeight;
  
  if (scrollableHeight <= 0) return;
  
  // Scroll down in steps
  for (let i = 1; i <= steps; i++) {
    const targetScroll = (scrollableHeight / steps) * i;
    
    window.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    });
    
    // Wait between scrolls
    await sleep(getRandomDelay(minDelay, maxDelay));
  }
  
  // Scroll back to top slightly (human behavior)
  if (Math.random() > 0.5) {
    await sleep(getRandomDelay(500, 1000));
    window.scrollTo({
      top: scrollableHeight * 0.1,
      behavior: 'smooth',
    });
  }
}

/**
 * Simulate reading time based on content length
 */
export function calculateReadingTime(contentLength: number): number {
  // Average reading speed: ~200 words per minute
  // Assuming average word length of 5 characters
  const words = contentLength / 5;
  const readingTimeMs = (words / 200) * 60 * 1000;
  
  // Add some variance (±30%)
  const variance = readingTimeMs * 0.3;
  return readingTimeMs + getRandomDelay(-variance, variance);
}

/**
 * Simulate mouse movement (for future enhancement)
 * Note: JavaScript cannot actually move the mouse cursor,
 * but we can add visual indicators if needed
 */
export function simulateMouseMovement(): void {
  // Placeholder for future mouse movement simulation
  // This would require more advanced techniques like
  // visual cursor overlays or interaction with page elements
}

/**
 * Add random variation to a value
 */
export function addVariance(value: number, variancePercent: number = 20): number {
  const variance = value * (variancePercent / 100);
  return value + getRandomDelay(-variance, variance);
}

/**
 * Simulate thinking pause
 */
export async function simulateThinking(minMs: number = 500, maxMs: number = 2000): Promise<void> {
  await sleep(getRandomDelay(minMs, maxMs));
}
