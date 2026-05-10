# Quickstart Guide: Chrome Extension Property Crawler

**Date**: 2026-05-10  
**Feature**: Chrome Extension Property Crawler  
**Branch**: 003-chrome-extension-crawler

---

## Prerequisites

- **Node.js**: v18 or higher (LTS recommended)
- **npm**: v9 or higher (or **pnpm** / **yarn**)
- **Git**: For version control
- **Chrome Browser**: v88+ (Manifest V3 support)
- **Python**: 3.11+ (for backend API)
- **Existing Backend**: The FastAPI backend should already be set up

---

## Architecture Overview

This project consists of two parts:

1. **Chrome Extension** (TypeScript) - New component
   - Runs in the browser
   - Extracts data from Idealista pages
   - Sends data to the backend API
   - No authentication required (connects to your local backend)

2. **FastAPI Backend** (Python) - Existing, needs modifications
   - Receives property data from extension
   - Stores in SQLite database
   - Tracks property history and changes
   - Manages crawl sessions

---

## Project Structure

```
idalista-tracker/
├── extension/                    # NEW: Chrome Extension (TypeScript)
│   ├── src/
│   │   ├── background.ts         # Service worker
│   │   ├── content/
│   │   │   ├── index.ts          # Content script entry
│   │   │   ├── searches.ts       # Saved searches extraction
│   │   │   └── listings.ts       # Property listings extraction
│   │   ├── popup/                # Extension popup UI
│   │   ├── options/              # Extension options page
│   │   ├── services/
│   │   │   ├── api.ts            # API communication
│   │   │   ├── crawler.ts        # Crawl orchestration
│   │   │   └── storage.ts        # Chrome storage wrapper
│   │   ├── utils/
│   │   │   ├── dom.ts            # DOM extraction utilities
│   │   │   ├── human-like.ts     # Human behavior simulation
│   │   │   └── parsers.ts        # Data parsing utilities
│   │   └── types/
│   │       └── index.ts          # TypeScript interfaces
│   ├── public/
│   │   ├── manifest.json         # Extension manifest
│   │   ├── icons/                # Extension icons
│   │   └── _locales/             # i18n files
│   ├── dist/                     # Compiled output
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts            # Build configuration
│
├── src/                          # EXISTING: Python backend
│   ├── api/routes/
│   │   ├── properties.py         # MODIFY: Add batch endpoint
│   │   ├── crawl.py              # MODIFY: Add session endpoints
│   │   └── searches.py           # NEW: Saved search routes
│   ├── services/
│   │   ├── property_service.py   # MODIFY: Add batch processing
│   │   └── crawl_service.py      # NEW: Crawl management
│   ├── database/
│   │   └── models.py             # MODIFY: Add new models
│   └── main.py                   # MODIFY: Register routes
│
└── specs/003-chrome-extension-crawler/
    ├── plan.md
    ├── research.md
    ├── data-model.md
    ├── quickstart.md
    └── contracts/
```

---

## Step 1: Backend Setup (Existing)

The backend should already be set up. If not, refer to the existing project setup.

### Start the Backend

```bash
# From project root
cd src

# Install dependencies (if not already done)
pip install -r requirements.txt

# Run database migrations (after we add the new models)
alembic upgrade head

# Start the API server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Verify Backend is Running

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-10T...",
  "version": "0.1.0"
}
```

---

## Step 2: Extension Setup (New)

### Create Extension Directory Structure

```bash
# From project root
mkdir -p extension/src/{content,popup,options,services,utils,types}
mkdir -p extension/public/{icons,_locales/en}
mkdir -p extension/dist
```

### Initialize Node.js Project

```bash
cd extension

# Initialize with defaults
npm init -y

# Install TypeScript and build tools
npm install -D typescript @types/chrome vite

# Install dev tools
npm install -D eslint @typescript-eslint/parser @typescript-eslint/plugin
npm install -D prettier eslint-config-prettier
```

### TypeScript Configuration

Create `extension/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["chrome"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Vite Configuration

Create `extension/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
```

### Manifest V3

Create `extension/public/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Idalista Property Crawler",
  "version": "1.0.0",
  "description": "Crawl property listings from Idealista and track changes over time",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://www.idealista.com/*",
    "http://localhost:8000/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://www.idealista.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_page": "options.html",
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["icons/*"],
      "matches": ["https://www.idealista.com/*"]
    }
  ]
}
```

### Build Scripts

Update `extension/package.json`:

```json
{
  "name": "idalista-property-crawler",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite build --watch --mode development",
    "build": "tsc && vite build",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.254",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.1.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.10"
  }
}
```

---

## Development Workflow

### 1. Install Dependencies

```bash
cd extension
npm install
```

### 2. Build Extension

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build
```

### 3. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension/dist` folder
5. Extension should appear in the toolbar

### 4. Configure Extension

1. Click extension icon → Options (or right-click → Options)
2. Set Server URL to `http://localhost:8000`
3. Adjust delay settings if needed
4. Save configuration

### 5. Making Changes

1. Edit source files in `extension/src/`
2. Vite rebuilds automatically in dev mode
3. Click the refresh icon on the extension card in `chrome://extensions/`
4. Test the changes

---

## Testing the Extension

### Manual Testing Checklist

1. **Extension Loads**
   - [ ] Extension icon appears in toolbar
   - [ ] Popup opens when clicking icon
   - [ ] Options page opens from right-click menu

2. **Configuration**
   - [ ] Can save server URL (`http://localhost:8000`)
   - [ ] Can enable/disable human-like behavior
   - [ ] Can adjust delay settings
   - [ ] Settings persist after browser restart

3. **Saved Searches Detection**
   - [ ] Navigate to `https://www.idealista.com/usuario/tus-alertas`
   - [ ] Open extension popup
   - [ ] Should display list of saved searches
   - [ ] Can select/deselect searches

4. **Crawling**
   - [ ] Click "Start Crawl" begins crawling
   - [ ] Shows progress indicator
   - [ ] Navigates through pages automatically
   - [ ] Extracts property data
   - [ ] Sends data to backend

5. **Pause/Resume**
   - [ ] Can pause crawling mid-session
   - [ ] Can resume from where it left off
   - [ ] State persists if browser closes

6. **Error Handling**
   - [ ] Handles network errors gracefully
   - [ ] Retries on failure (with backoff)
   - [ ] Shows error messages to user
   - [ ] Handles rate limiting (429 responses)

---

## API Communication

The extension communicates with the backend via HTTP (no authentication required):

### Example API Call

```typescript
// From extension/src/services/api.ts

const API_BASE = 'http://localhost:8000/api/v1';

async function ingestBatch(data: BatchData) {
  const response = await fetch(`${API_BASE}/properties/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}
```

### CORS Configuration

The backend already has CORS enabled in `src/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

For production, restrict `allow_origins` to your specific extension ID.

---

## Project-Specific Commands

### Build Everything

```bash
# Build extension
(cd extension && npm run build)

# Backend should already be running
```

### Clean Build

```bash
cd extension
rm -rf dist node_modules
npm install
npm run build
```

### Development Mode

Run these in separate terminals:

```bash
# Terminal 1: Extension build watcher
cd extension && npm run dev

# Terminal 2: Python backend
cd src && uvicorn main:app --reload --port 8000
```

### Run Tests

```bash
# Backend tests
cd src
pytest

# Extension type check
cd extension && npm run type-check
```

---

## Troubleshooting

### Extension Not Loading

- Check `dist/` folder contains `manifest.json`
- Verify manifest.json is valid JSON
- Check Chrome console for errors

### TypeScript Errors

```bash
# Rebuild TypeScript
npm run type-check

# Clear cache
rm -rf node_modules/.vite
```

### Chrome Storage Issues

```bash
# Clear extension storage
# 1. Open extension popup
# 2. Right-click > Inspect
# 3. Console: chrome.storage.local.clear()
```

### Content Script Not Injecting

- Check `matches` pattern in manifest matches the URL
- Verify content script is listed in build output
- Check for CSP errors in console

### API Communication Errors

- Verify backend is running: `curl http://localhost:8000/health`
- Check CORS settings in backend
- Verify `host_permissions` in manifest includes `http://localhost:8000/*`
- Check browser console for network errors

### Database Issues

```bash
# Reset database (WARNING: deletes all data!)
cd src
rm -f *.db
alembic upgrade head
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `extension/src/background.ts` | Service worker - crawl orchestration |
| `extension/src/content/index.ts` | Content script - DOM extraction |
| `extension/src/popup/index.html` | Extension popup UI |
| `extension/src/options/index.html` | Configuration page |
| `extension/src/services/api.ts` | API client (no auth) |
| `extension/src/services/crawler.ts` | Crawl logic |
| `extension/src/types/index.ts` | TypeScript interfaces |
| `extension/public/manifest.json` | Extension manifest |
| `src/api/routes/properties.py` | Backend batch endpoint |
| `src/database/models.py` | SQLAlchemy models |
| `src/services/property_service.py` | Property business logic |

---

## Next Steps

1. **Generate Icon Files**: Create 16x16, 32x32, 48x48, 128x128 PNG icons in `public/icons/`
2. **Create Database Migration**: Add new models and modify Property table
3. **Implement Backend Batch Endpoint**: Add `POST /api/v1/properties/batch`
4. **Implement Background Script**: Service worker for crawl orchestration
5. **Implement Content Scripts**: DOM extraction for searches and listings
6. **Build Popup UI**: Search selection, crawl control, progress display
7. **Build Options Page**: Configuration settings
8. **Test End-to-End**: Full crawl flow from extension to database

## Notes

- **No authentication** is implemented. The extension connects directly to your local backend.
- If exposing the backend to the internet, add API key or token-based authentication.
- The backend uses **SQLite** by default (sufficient for single-user use).
- For multi-user scenarios, consider migrating to PostgreSQL.
