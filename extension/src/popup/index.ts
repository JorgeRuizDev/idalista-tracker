// Popup logic
import type { 
  SavedSearch, 
  CrawlState, 
  StartCrawlResponse, 
  GetStatusResponse,
  GetSearchesResponse,
  GetConfigResponse,
  SaveSearchesResponse,
  ExtractedSavedSearch,
} from '../types';

// Content script response type
interface ExtractSearchesResponse {
  type: string;
  data: ExtractedSavedSearch[];
}

// DOM Elements
const searchesListEl = document.getElementById('searches-list') as HTMLDivElement;
const refreshBtn = document.getElementById('refresh-searches') as HTMLButtonElement;
const syncBtn = document.getElementById('sync-searches') as HTMLButtonElement;
const startCrawlBtn = document.getElementById('start-crawl') as HTMLButtonElement;
const pauseCrawlBtn = document.getElementById('pause-crawl') as HTMLButtonElement;
const resumeCrawlBtn = document.getElementById('resume-crawl') as HTMLButtonElement;
const stopCrawlBtn = document.getElementById('stop-crawl') as HTMLButtonElement;
const statusBadge = document.getElementById('status-badge') as HTMLSpanElement;
const crawlStateEl = document.getElementById('crawl-state') as HTMLSpanElement;
const progressBar = document.getElementById('progress-bar') as HTMLDivElement;
const progressFill = progressBar?.querySelector('.progress-fill') as HTMLDivElement;
const progressText = document.getElementById('progress-text') as HTMLParagraphElement;
const serverStatusEl = document.getElementById('server-status') as HTMLSpanElement;
const serverStatusTextEl = document.getElementById('server-status-text') as HTMLSpanElement;
const testConnectionBtn = document.getElementById('test-connection') as HTMLButtonElement;
const connectionErrorEl = document.getElementById('connection-error') as HTMLDivElement;
const logWindowEl = document.getElementById('log-window') as HTMLDivElement;
const clearLogBtn = document.getElementById('clear-log') as HTMLButtonElement;
const openSettingsBtn = document.getElementById('open-settings') as HTMLButtonElement;
const pendingCountEl = document.getElementById('pending-count') as HTMLSpanElement;
const refreshPendingBtn = document.getElementById('refresh-pending') as HTMLButtonElement;
const startDetailCrawlBtn = document.getElementById('start-detail-crawl') as HTMLButtonElement;
const stageBadgeEl = document.getElementById('stage-badge') as HTMLSpanElement;

// State
let searches: SavedSearch[] = [];
let selectedSearchIds: number[] = [];
let isServerOnline = false;
let currentConfig: { server_url: string } | null = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup opened');
  
  addLogEntry('Extension loaded', 'info');
  
  // Load initial data asynchronously (don't block)
  Promise.resolve().then(async () => {
    try {
      await loadConfig();
      await checkServerStatus();
      await loadSearches();
      await refreshPendingCount();
      
      // Check current crawl status and update UI
      const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' }) as GetStatusResponse;
      updateUIState(status);
      
      // If crawl is running, start polling
      if (status.is_running) {
        addLogEntry('Crawl is already running', 'info');
        updateStatus();
      }
    } catch (error) {
      console.error('Error during initialization:', error);
      addLogEntry('Error during initialization', 'error');
    }
  });
  
  // Set up event listeners
  refreshBtn.addEventListener('click', loadSearches);
  syncBtn.addEventListener('click', syncSearchesFromIdealista);
  startCrawlBtn.addEventListener('click', startCrawl);
  startDetailCrawlBtn?.addEventListener('click', startDetailCrawl);
  refreshPendingBtn?.addEventListener('click', refreshPendingCount);
  pauseCrawlBtn.addEventListener('click', pauseCrawl);
  resumeCrawlBtn.addEventListener('click', resumeCrawl);
  stopCrawlBtn.addEventListener('click', stopCrawl);
  testConnectionBtn.addEventListener('click', checkServerStatus);
  clearLogBtn.addEventListener('click', clearLog);
  openSettingsBtn.addEventListener('click', openSettings);

  // Listen for detail crawl progress broadcast
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'DETAIL_CRAWL_PROGRESS' && message.progress) {
      handleDetailProgressUpdate(message.progress);
    }
  });
});

// Add log entry
function addLogEntry(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="timestamp">${timestamp}</span> ${escapeHtml(message)}`;
  logWindowEl.appendChild(entry);
  
  // Limit log entries to prevent memory issues (keep last 100)
  while (logWindowEl.children.length > 100) {
    logWindowEl.removeChild(logWindowEl.firstChild!);
  }
  
  logWindowEl.scrollTop = logWindowEl.scrollHeight;
}

// Clear log
function clearLog(): void {
  logWindowEl.innerHTML = '';
  addLogEntry('Log cleared', 'info');
}

// Load configuration
async function loadConfig(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' }) as GetConfigResponse;
    currentConfig = response.config;
    console.log('Config loaded:', response.config);
    addLogEntry(`Server URL: ${response.config?.server_url || 'Not configured'}`, 'info');
  } catch (error) {
    console.error('Failed to load config:', error);
    addLogEntry('Failed to load configuration', 'error');
  }
}

// Check server status
async function checkServerStatus(): Promise<void> {
  serverStatusTextEl.textContent = 'Checking...';
  serverStatusEl.className = 'status-badge checking';
  testConnectionBtn.disabled = true;
  connectionErrorEl.classList.add('hidden');
  
  try {
    if (!currentConfig?.server_url) {
      throw new Error('Server URL not configured');
    }
    
    const response = await fetch(`${currentConfig.server_url}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      isServerOnline = true;
      serverStatusTextEl.textContent = 'Connected';
      serverStatusEl.className = 'status-badge online';
      serverStatusEl.title = `Backend: ${data.version || 'OK'}`;
      startCrawlBtn.disabled = selectedSearchIds.length === 0;
      addLogEntry('Backend connection successful', 'success');
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    isServerOnline = false;
    serverStatusTextEl.textContent = 'Offline';
    serverStatusEl.className = 'status-badge offline';
    serverStatusEl.title = 'Backend: Disconnected';
    startCrawlBtn.disabled = true;
    const errorMsg = (error as Error).message;
    connectionErrorEl.textContent = `Connection failed: ${errorMsg}`;
    connectionErrorEl.classList.remove('hidden');
    addLogEntry(`Backend connection failed: ${errorMsg}`, 'error');
  } finally {
    testConnectionBtn.disabled = false;
  }
}

// Open settings page
function openSettings(): void {
  chrome.runtime.openOptionsPage();
  addLogEntry('Opening settings page...', 'info');
}

// Load saved searches from background
async function loadSearches(): Promise<void> {
  try {
    searchesListEl.innerHTML = '<p class="loading">Loading searches...</p>';
    addLogEntry('Loading saved searches...', 'info');
    
    // First try to extract from current page (if on Idealista)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id && tab.url?.includes('idealista.com')) {
      try {
        const pageData = await sendMessageToContentScript<ExtractSearchesResponse>(tab.id, { action: 'EXTRACT_SEARCHES' });
        if (pageData?.data && pageData.data.length > 0) {
          addLogEntry(`Found ${pageData.data.length} searches on current page, saving...`, 'success');
          
          // Save to storage
          const saveResponse = await chrome.runtime.sendMessage({ 
            type: 'SAVE_SEARCHES', 
            payload: { searches: pageData.data } 
          }) as SaveSearchesResponse;
          
          if (saveResponse.success && saveResponse.searches) {
            addLogEntry(`Saved ${saveResponse.searches.length} searches`, 'success');
            renderSearches(saveResponse.searches);
          } else {
            // Fall back to stored searches
            const response = await chrome.runtime.sendMessage({ type: 'GET_SEARCHES' }) as GetSearchesResponse;
            renderSearches(response.searches);
          }
          return;
        }
      } catch (err) {
        console.log('Could not extract from current page:', err);
      }
    }
    
    // Fall back to stored searches
    const response = await chrome.runtime.sendMessage({ type: 'GET_SEARCHES' }) as GetSearchesResponse;
    if (response.searches && response.searches.length > 0) {
      addLogEntry(`Loaded ${response.searches.length} saved searches`, 'info');
      renderSearches(response.searches);
    } else {
      addLogEntry('No saved searches found. Click "Sync from Idealista" to load them.', 'warning');
      renderSearches([]);
    }
  } catch (error) {
    console.error('Failed to load searches:', error);
    addLogEntry('Failed to load searches', 'error');
    searchesListEl.innerHTML = '<p class="error">Failed to load searches. Click "Sync from Idealista" to load them.</p>';
  }
}

// Helper to send message to content script with retry
async function sendMessageToContentScript<T = unknown>(tabId: number, message: unknown, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await chrome.tabs.sendMessage(tabId, message) as T;
    } catch (error) {
      if (i === retries - 1) throw error;
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw new Error('Failed to communicate with content script');
}

// Sync searches from Idealista - opens the page and extracts
async function syncSearchesFromIdealista(): Promise<void> {
  try {
    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing...';
    addLogEntry('Syncing searches from Idealista...', 'info');
    
    // Check if we're already on the saved searches page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab.url?.includes('idealista.com/usuario/tus-alertas')) {
      // Already on the page, just extract
      addLogEntry('Already on saved searches page, extracting...', 'info');
      if (tab.id) {
        let pageData: ExtractSearchesResponse | undefined;
        try {
          pageData = await sendMessageToContentScript<ExtractSearchesResponse>(tab.id, { action: 'EXTRACT_SEARCHES' });
        } catch (error) {
          addLogEntry('Content script not ready, waiting...', 'warning');
          // Try injecting the content script manually
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            });
            addLogEntry('Content script injected, retrying...', 'info');
            // Wait a bit for script to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            pageData = await sendMessageToContentScript<ExtractSearchesResponse>(tab.id, { action: 'EXTRACT_SEARCHES' });
          } catch (injectError) {
            throw new Error('Could not load content script. Please refresh the page.');
          }
        }
        
        console.log('Extracted page data:', pageData);
        
        if (pageData?.data && pageData.data.length > 0) {
          addLogEntry(`Found ${pageData.data.length} searches, saving...`, 'info');
          
          const saveResponse = await chrome.runtime.sendMessage({ 
            type: 'SAVE_SEARCHES', 
            payload: { searches: pageData.data } 
          }) as SaveSearchesResponse;
          
          console.log('Save response:', saveResponse);
          
          if (saveResponse.success) {
            addLogEntry(`Synced ${pageData.data.length} searches`, 'success');
            
            // Use the returned searches or reload from storage
            const searchesToRender = saveResponse.searches || [];
            console.log('Rendering searches:', searchesToRender);
            renderSearches(searchesToRender);
          } else {
            addLogEntry(`Failed to save: ${saveResponse.error}`, 'error');
          }
        } else {
          addLogEntry('No searches found on page', 'warning');
        }
      }
    } else {
      // Open the saved searches page
      addLogEntry('Opening Idealista saved searches page...', 'info');
      const response = await chrome.runtime.sendMessage({ type: 'SYNC_SEARCHES' }) as { success: boolean; message?: string; error?: string };
      if (response.success) {
        addLogEntry('Opened Idealista saved searches page. Click Refresh after the page loads.', 'success');
        // Close the popup so user can see the page
        setTimeout(() => window.close(), 500);
      } else {
        addLogEntry(`Failed to sync: ${response.error}`, 'error');
      }
    }
  } catch (error) {
    console.error('Failed to sync searches:', error);
    addLogEntry(`Failed to sync: ${(error as Error).message}`, 'error');
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = 'Sync from Idealista';
  }
}

// Render searches list
function renderSearches(searchesData: SavedSearch[]): void {
  console.log('Rendering searches:', searchesData);
  searches = searchesData;
  
  if (searches.length === 0) {
    console.log('No searches to render');
    searchesListEl.innerHTML = `
      <p class="empty">
        No saved searches found.<br>
        Visit <a href="https://www.idealista.com/usuario/tus-alertas" target="_blank">Idealista Saved Searches</a>
      </p>
    `;
    return;
  }
  
  searchesListEl.innerHTML = searches.map(search => `
    <div class="search-item">
      <label class="search-label">
        <input type="checkbox" value="${search.id}" ${search.crawl_enabled ? 'checked' : ''}>
        <span class="search-name">${escapeHtml(search.name)}</span>
        <span class="search-count">${search.result_count || 0} properties</span>
      </label>
    </div>
  `).join('');
  
  // Add change listeners
  searchesListEl.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const id = parseInt(target.value, 10);
      
      if (target.checked) {
        selectedSearchIds.push(id);
      } else {
        selectedSearchIds = selectedSearchIds.filter(sid => sid !== id);
      }
      
      // Enable/disable crawl button based on selection and server status
      startCrawlBtn.disabled = selectedSearchIds.length === 0 || !isServerOnline;
      
      const searchName = searches.find(s => s.id === id)?.name || 'Unknown';
      addLogEntry(`${target.checked ? 'Selected' : 'Deselected'}: ${searchName}`, 'info');
    });
  });
  
  // Initialize selected IDs
  selectedSearchIds = searches.filter(s => s.crawl_enabled).map(s => s.id);
  startCrawlBtn.disabled = selectedSearchIds.length === 0 || !isServerOnline;
}

// Update crawl status
let isUpdatingStatus = false;

async function updateStatus(): Promise<void> {
  // Prevent concurrent updates
  if (isUpdatingStatus) {
    console.log('Status update already in progress, skipping...');
    return;
  }
  
  isUpdatingStatus = true;
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' }) as GetStatusResponse;
    
    const wasRunning = statusBadge?.textContent === 'Running';
    updateUIState(response);
    
    // If crawl just finished, show completion message
    if (wasRunning && !response.is_running) {
      addLogEntry('Crawl completed!', 'success');
      if (progressText) progressText.textContent = 'Crawl completed';
    }
    
    // Continue polling if crawl is running
    if (response.is_running) {
      setTimeout(() => {
        isUpdatingStatus = false;
        updateStatus();
      }, 2000);
    } else {
      isUpdatingStatus = false;
    }
  } catch (error) {
    console.error('Failed to get status:', error);
    isUpdatingStatus = false;
    // Retry on error
    setTimeout(updateStatus, 5000);
  }
}

// Update UI based on crawl state
function updateUIState(status: any): void {
  try {
    const isRunning = status.is_running;
    
    // Update status badge
    if (statusBadge) {
      statusBadge.textContent = isRunning ? 'Running' : 'Idle';
      statusBadge.className = `badge ${isRunning ? 'running' : 'idle'}`;
    }
    
    // Update crawl state text
    if (crawlStateEl) {
      crawlStateEl.textContent = isRunning ? 'Crawling...' : 'Idle';
    }

    // Update Stage badge
    if (stageBadgeEl) {
      if (!isRunning) {
        stageBadgeEl.textContent = 'Etapa: Inactivo';
        stageBadgeEl.style.background = '#e5e7eb';
        stageBadgeEl.style.color = '#374151';
      } else if (status.stage === 'discovery') {
        stageBadgeEl.textContent = 'Etapa 1: Búsqueda';
        stageBadgeEl.style.background = '#dbeafe';
        stageBadgeEl.style.color = '#1e40af';
      } else if (status.stage === 'deep_analysis') {
        stageBadgeEl.textContent = 'Etapa 2: Fichas';
        stageBadgeEl.style.background = '#e0e7ff';
        stageBadgeEl.style.color = '#3730a3';
      } else if (status.stage === 'paused_challenge') {
        stageBadgeEl.textContent = 'Reto Anti-Bot';
        stageBadgeEl.style.background = '#fee2e2';
        stageBadgeEl.style.color = '#991b1b';
      }
    }
    
    // Update buttons
    if (startCrawlBtn) startCrawlBtn.classList.toggle('hidden', isRunning);
    if (startDetailCrawlBtn) startDetailCrawlBtn.classList.toggle('hidden', isRunning);
    if (pauseCrawlBtn) pauseCrawlBtn.classList.toggle('hidden', !isRunning);
    if (resumeCrawlBtn) resumeCrawlBtn.classList.toggle('hidden', true);
    if (stopCrawlBtn) stopCrawlBtn.classList.toggle('hidden', !isRunning);
    
    // Update progress
    if (status.stage === 'deep_analysis' && status.detail_progress) {
      const dp = status.detail_progress;
      if (progressText) progressText.textContent = dp.status;
      if (dp.total > 0 && progressFill && progressBar) {
        const pct = Math.min(100, Math.round((dp.current / dp.total) * 100));
        progressFill.style.width = `${pct}%`;
        progressBar.classList.remove('hidden');
      }
    } else if (status.progress) {
      const { total_searches, completed_searches, total_pages, total_properties } = status.progress;
      
      const statSearches = document.getElementById('stat-searches');
      const statPages = document.getElementById('stat-pages');
      const statProperties = document.getElementById('stat-properties');
      
      if (statSearches) statSearches.textContent = `${completed_searches}/${total_searches}`;
      if (statPages) statPages.textContent = String(total_pages);
      if (statProperties) statProperties.textContent = String(total_properties);
      
      if (total_searches > 0 && progressFill && progressBar) {
        const progress = (completed_searches / total_searches) * 100;
        progressFill.style.width = `${progress}%`;
        progressBar.classList.remove('hidden');
        
        if (status.current_search && progressText) {
          progressText.textContent = `Crawling: ${status.current_search.name} (page ${status.current_page || 1})`;
        }
      }
    }
  } catch (error) {
    console.error('Error updating UI:', error);
  }
}

async function refreshPendingCount(): Promise<void> {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_PENDING_DETAILS_COUNT' });
    if (res && res.success) {
      if (pendingCountEl) pendingCountEl.textContent = String(res.count);
      if (startDetailCrawlBtn) {
        startDetailCrawlBtn.disabled = res.count === 0 || !isServerOnline;
      }
    }
  } catch (err) {
    console.debug('Failed to get pending count:', err);
  }
}

async function startDetailCrawl(): Promise<void> {
  if (!isServerOnline) {
    alert('Backend is not connected. Please check your settings.');
    return;
  }
  try {
    if (startDetailCrawlBtn) {
      startDetailCrawlBtn.disabled = true;
      startDetailCrawlBtn.textContent = 'Iniciando...';
    }
    addLogEntry('Iniciando análisis profundo de fichas pendientes...', 'info');
    const res = await chrome.runtime.sendMessage({ type: 'START_DETAIL_CRAWL_ONLY' });
    if (res && res.success) {
      addLogEntry('Análisis profundo iniciado en segundo plano', 'success');
      updateUIState({
        is_running: true,
        stage: 'deep_analysis',
        progress: { total_searches: 0, completed_searches: 0, total_pages: 0, total_properties: 0 },
      });
      setTimeout(() => updateStatus(), 1000);
    } else {
      addLogEntry(`Error al iniciar análisis: ${res?.error || 'Desconocido'}`, 'error');
    }
  } catch (err) {
    addLogEntry(`Error: ${(err as Error).message}`, 'error');
  } finally {
    if (startDetailCrawlBtn) {
      startDetailCrawlBtn.disabled = false;
      startDetailCrawlBtn.textContent = 'Analizar fichas pendientes';
    }
  }
}

function handleDetailProgressUpdate(progress: any): void {
  if (crawlStateEl) crawlStateEl.textContent = progress.status;
  if (stageBadgeEl) {
    if (progress.stage === 'paused_challenge') {
      stageBadgeEl.textContent = 'Reto Anti-Bot';
      stageBadgeEl.style.background = '#fee2e2';
      stageBadgeEl.style.color = '#991b1b';
    } else if (progress.stage === 'deep_analysis') {
      stageBadgeEl.textContent = 'Etapa 2: Fichas';
      stageBadgeEl.style.background = '#e0e7ff';
      stageBadgeEl.style.color = '#3730a3';
    } else if (progress.stage === 'completed') {
      stageBadgeEl.textContent = 'Completado';
      stageBadgeEl.style.background = '#dcfce7';
      stageBadgeEl.style.color = '#166534';
      refreshPendingCount();
    }
  }
  if (progressText) progressText.textContent = progress.status;
  if (progress.total > 0 && progressFill && progressBar) {
    const pct = Math.min(100, Math.round((progress.current / progress.total) * 100));
    progressFill.style.width = `${pct}%`;
    progressBar.classList.remove('hidden');
  }
}

// Start crawl
async function startCrawl(): Promise<void> {
  if (selectedSearchIds.length === 0) {
    addLogEntry('No searches selected. Please select at least one search.', 'warning');
    alert('Please select at least one search to crawl');
    return;
  }
  
  if (!isServerOnline) {
    addLogEntry('Cannot start crawl: Backend is offline', 'error');
    alert('Backend is not connected. Please check your settings.');
    return;
  }
  
  try {
    startCrawlBtn.disabled = true;
    startCrawlBtn.textContent = 'Starting...';
    addLogEntry(`Starting crawl with ${selectedSearchIds.length} searches...`, 'info');
    
    const config = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' }) as GetConfigResponse;
    
    console.log('Sending START_CRAWL message...');
    const response = await chrome.runtime.sendMessage({
      type: 'START_CRAWL',
      payload: {
        search_ids: selectedSearchIds,
        server_url: config.config.server_url,
      },
    }) as StartCrawlResponse;
    
    console.log('START_CRAWL response:', response);
    
    if (response && response.success && response.session_id) {
      addLogEntry(`Crawl started! Session ID: ${response.session_id}`, 'success');
      console.log('Crawl started:', response.session_id);
      // Force update UI to show crawling state immediately
      updateUIState({
        is_running: true,
        progress: { total_searches: selectedSearchIds.length, completed_searches: 0, total_pages: 0, total_properties: 0 }
      });
      // Don't await - let it run in background
      setTimeout(() => updateStatus(), 1000);
    } else {
      const errorMsg = response?.error || 'Unknown error - check browser console';
      console.error('Start crawl failed:', response);
      addLogEntry(`Failed to start crawl: ${errorMsg}`, 'error');
      alert(`Failed to start crawl: ${errorMsg}`);
      // Reset button state
      startCrawlBtn.disabled = false;
      startCrawlBtn.textContent = 'Start Crawl';
    }
  } catch (error) {
    console.error('Failed to start crawl:', error);
    addLogEntry(`Failed to start crawl: ${(error as Error).message}`, 'error');
    alert('Failed to start crawl. Check console for details.');
    // Only reset button on error
    startCrawlBtn.disabled = false;
    startCrawlBtn.textContent = 'Start Crawl';
  }
}

// Pause crawl
async function pauseCrawl(): Promise<void> {
  try {
    pauseCrawlBtn.disabled = true;
    addLogEntry('Pausing crawl...', 'info');
    
    const response = await chrome.runtime.sendMessage({ type: 'PAUSE_CRAWL' }) as { success: boolean; can_resume?: boolean; error?: string };
    console.log('Pause response:', response);
    
    if (response.success) {
      addLogEntry('Crawl paused', 'warning');
      pauseCrawlBtn.classList.add('hidden');
      resumeCrawlBtn.classList.remove('hidden');
      // Update status to reflect paused state
      await updateStatus();
    } else {
      addLogEntry(`Failed to pause: ${response.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Failed to pause crawl:', error);
    addLogEntry(`Failed to pause: ${(error as Error).message}`, 'error');
    // Even if it fails, update the UI to not be stuck
    pauseCrawlBtn.disabled = false;
  } finally {
    pauseCrawlBtn.disabled = false;
  }
}

// Resume crawl
async function resumeCrawl(): Promise<void> {
  try {
    resumeCrawlBtn.disabled = true;
    addLogEntry('Resuming crawl...', 'info');
    
    const response = await chrome.runtime.sendMessage({ type: 'RESUME_CRAWL' });
    
    if (response.success) {
      addLogEntry('Crawl resumed', 'success');
      resumeCrawlBtn.classList.add('hidden');
      pauseCrawlBtn.classList.remove('hidden');
      await updateStatus();
    } else {
      addLogEntry(`Failed to resume: ${response.error}`, 'error');
      alert(`Failed to resume: ${response.error}`);
    }
  } catch (error) {
    console.error('Failed to resume crawl:', error);
    addLogEntry('Failed to resume crawl', 'error');
  } finally {
    resumeCrawlBtn.disabled = false;
  }
}

// Stop crawl (force stop/clear state)
async function stopCrawl(): Promise<void> {
  try {
    stopCrawlBtn.disabled = true;
    addLogEntry('Stopping crawl...', 'info');
    
    const response = await chrome.runtime.sendMessage({ type: 'STOP_CRAWL' }) as { success: boolean; error?: string };
    
    if (response.success) {
      addLogEntry('Crawl stopped', 'success');
      // Reset UI
      stopCrawlBtn.classList.add('hidden');
      pauseCrawlBtn.classList.add('hidden');
      resumeCrawlBtn.classList.add('hidden');
      startCrawlBtn.classList.remove('hidden');
      startCrawlBtn.disabled = selectedSearchIds.length === 0 || !isServerOnline;
      await updateStatus();
    } else {
      addLogEntry(`Failed to stop: ${response.error}`, 'error');
    }
  } catch (error) {
    console.error('Failed to stop crawl:', error);
    addLogEntry(`Failed to stop: ${(error as Error).message}`, 'error');
  } finally {
    stopCrawlBtn.disabled = false;
  }
}

// Utility: escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
