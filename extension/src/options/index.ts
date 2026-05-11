// Options page logic
import type { CrawlConfig, SaveConfigResponse, GetConfigResponse } from '../types';

// DOM Elements
const form = document.getElementById('config-form') as HTMLFormElement;
const serverUrlInput = document.getElementById('server-url') as HTMLInputElement;
const humanLikeCheckbox = document.getElementById('human-like-enabled') as HTMLInputElement;
const delaySettings = document.getElementById('delay-settings') as HTMLDivElement;
const minPageDelayInput = document.getElementById('min-page-delay') as HTMLInputElement;
const maxPageDelayInput = document.getElementById('max-page-delay') as HTMLInputElement;
const minNavDelayInput = document.getElementById('min-navigation-delay') as HTMLInputElement;
const maxNavDelayInput = document.getElementById('max-navigation-delay') as HTMLInputElement;
const clearStorageBtn = document.getElementById('clear-storage') as HTMLButtonElement;
const saveStatus = document.getElementById('save-status') as HTMLSpanElement;

// Load configuration on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
});

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
    
    if (minPageDelay >= maxPageDelay) {
      alert('Min page delay must be less than max page delay');
      return;
    }
    
    if (minNavDelay >= maxNavDelay) {
      alert('Min navigation delay must be less than max navigation delay');
      return;
    }
    
    const config: CrawlConfig = {
      server_url: serverUrlInput.value.trim(),
      human_like_enabled: humanLikeCheckbox.checked,
      min_page_delay: minPageDelay,
      max_page_delay: maxPageDelay,
      min_navigation_delay: minNavDelay,
      max_navigation_delay: maxNavDelay,
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
