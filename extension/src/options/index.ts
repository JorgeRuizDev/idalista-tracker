// Options page logic
import type { CrawlConfig, SaveConfigResponse, GetConfigResponse } from '../types';
import { getLastCrawlStats } from '../services/storage';

// DOM Elements
const form = document.getElementById('config-form') as HTMLFormElement;
const serverUrlInput = document.getElementById('server-url') as HTMLInputElement;
const humanLikeCheckbox = document.getElementById('human-like-enabled') as HTMLInputElement;
const delaySettings = document.getElementById('delay-settings') as HTMLDivElement;
const minPageDelayInput = document.getElementById('min-page-delay') as HTMLInputElement;
const maxPageDelayInput = document.getElementById('max-page-delay') as HTMLInputElement;
const minNavDelayInput = document.getElementById('min-navigation-delay') as HTMLInputElement;
const maxNavDelayInput = document.getElementById('max-navigation-delay') as HTMLInputElement;
const autoCrawlCheckbox = document.getElementById('auto-crawl-enabled') as HTMLInputElement;
const autoCrawlIntervalInput = document.getElementById('auto-crawl-interval') as HTMLInputElement;
const clearStorageBtn = document.getElementById('clear-storage') as HTMLButtonElement;
const saveStatus = document.getElementById('save-status') as HTMLSpanElement;

// Load configuration and status on page load
function initOptions(): void {
  updateBuildAndStatusInfo();
  loadConfig().catch((err) => {
    console.error('Failed to load config:', err);
    showStatus('Failed to load configuration', 'error');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOptions);
} else {
  initOptions();
}

// Toggle delay settings visibility
humanLikeCheckbox.addEventListener('change', () => {
  delaySettings.classList.toggle('hidden', !humanLikeCheckbox.checked);
});

// Handle form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await saveConfig();
});

// Handle clear storage
clearStorageBtn.addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all extension data? This cannot be undone.')) {
    try {
      await chrome.storage.local.clear();
      showStatus('Storage cleared successfully', 'success');
      // Reload defaults
      await loadConfig();
      await updateBuildAndStatusInfo();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      showStatus('Failed to clear storage', 'error');
    }
  }
});

// Load configuration from storage
async function loadConfig(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' }) as GetConfigResponse;
    const config = response.config;
    
    if (config) {
      serverUrlInput.value = config.server_url;
      humanLikeCheckbox.checked = config.human_like_enabled;
      minPageDelayInput.value = String(config.min_page_delay / 1000); // Convert ms to seconds
      maxPageDelayInput.value = String(config.max_page_delay / 1000);
      minNavDelayInput.value = String(config.min_navigation_delay / 1000);
      maxNavDelayInput.value = String(config.max_navigation_delay / 1000);
      autoCrawlCheckbox.checked = Boolean(config.auto_crawl_enabled);
      autoCrawlIntervalInput.value = String(config.auto_crawl_interval_hours ?? 24);
      
      // Show/hide delay settings
      delaySettings.classList.toggle('hidden', !config.human_like_enabled);
    }
  } catch (error) {
    console.error('Failed to load config:', error);
    showStatus('Failed to load configuration', 'error');
  }
}

// Save configuration
async function saveConfig(): Promise<void> {
  try {
    // Validate inputs
    const minPageDelay = parseInt(minPageDelayInput.value, 10) * 1000; // Convert to ms
    const maxPageDelay = parseInt(maxPageDelayInput.value, 10) * 1000;
    const minNavDelay = parseInt(minNavDelayInput.value, 10) * 1000;
    const maxNavDelay = parseInt(maxNavDelayInput.value, 10) * 1000;
    
    if (minPageDelay > maxPageDelay) {
      alert('Min page delay must be less than or equal to max page delay');
      return;
    }
    
    if (minNavDelay > maxNavDelay) {
      alert('Min navigation delay must be less than or equal to max navigation delay');
      return;
    }

    const autoCrawlIntervalHours = parseInt(autoCrawlIntervalInput.value, 10);
    if (isNaN(autoCrawlIntervalHours) || autoCrawlIntervalHours < 1) {
      alert('Auto-crawl interval must be at least 1 hour');
      return;
    }
    
    const config: CrawlConfig = {
      server_url: serverUrlInput.value.trim(),
      human_like_enabled: humanLikeCheckbox.checked,
      min_page_delay: minPageDelay,
      max_page_delay: maxPageDelay,
      min_navigation_delay: minNavDelay,
      max_navigation_delay: maxNavDelay,
      auto_crawl_enabled: autoCrawlCheckbox.checked,
      auto_crawl_interval_hours: autoCrawlIntervalHours,
    };
    
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_CONFIG',
      payload: config,
    }) as SaveConfigResponse;
    
    if (response.success) {
      showStatus('Settings saved successfully!', 'success');
    } else {
      showStatus(`Failed to save: ${response.error}`, 'error');
    }
  } catch (error) {
    console.error('Failed to save config:', error);
    showStatus('Failed to save configuration', 'error');
  }
}

// Show status message
function showStatus(message: string, type: 'success' | 'error'): void {
  saveStatus.textContent = message;
  saveStatus.className = `save-status ${type}`;
  
  setTimeout(() => {
    saveStatus.textContent = '';
    saveStatus.className = 'save-status';
  }, 3000);
}

/**
 * Display extension build version, date/hour, and last crawl status
 */
async function updateBuildAndStatusInfo(): Promise<void> {
  const versionEl = document.getElementById('extension-version');
  const headerBuildEl = document.getElementById('header-build-time');
  const infoVersionEl = document.getElementById('info-extension-version');
  const infoBuildEl = document.getElementById('info-build-time');
  const infoLastCrawlEl = document.getElementById('info-last-crawl');

  // 1. Version from manifest or build define
  let fullVersion = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : '1.0.0';
  if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
    const manifest = chrome.runtime.getManifest();
    if (manifest.version_name) {
      fullVersion = manifest.version_name;
    } else if (manifest.version) {
      fullVersion = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : manifest.version;
    }
  }

  // 2. Build time from build define
  let formattedBuildTime = 'Unknown';
  try {
    if (typeof __BUILD_TIME__ !== 'undefined' && __BUILD_TIME__) {
      const d = new Date(__BUILD_TIME__);
      formattedBuildTime = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  } catch (_) {
    formattedBuildTime = String(typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'Unknown');
  }

  if (versionEl) {
    versionEl.textContent = `v${fullVersion}`;
  }
  if (headerBuildEl) {
    headerBuildEl.textContent = `Build: ${formattedBuildTime}`;
    headerBuildEl.title = `ISO: ${typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : ''}`;
  }
  if (infoVersionEl) {
    infoVersionEl.textContent = `v${fullVersion}`;
  }
  if (infoBuildEl) {
    infoBuildEl.textContent = formattedBuildTime;
  }

  // 3. Last Crawl Update
  if (infoLastCrawlEl) {
    try {
      const lastStats = await getLastCrawlStats();
      if (lastStats && lastStats.completedAt) {
        const crawlDate = new Date(lastStats.completedAt);
        const triggerLabel = lastStats.trigger === 'automatic' ? 'Automático' : 'Manual';
        const dateStr = `${crawlDate.toLocaleDateString()} ${crawlDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        infoLastCrawlEl.textContent = `${dateStr} (${triggerLabel}) • ${lastStats.totalProperties} inmuebles • ${lastStats.pagesProcessed} págs`;
      } else {
        infoLastCrawlEl.textContent = 'Ninguno (sin rastreos completados aún)';
      }
    } catch (_) {
      infoLastCrawlEl.textContent = 'No disponible';
    }
  }
}
