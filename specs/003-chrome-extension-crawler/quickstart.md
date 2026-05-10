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

---

## Project Structure

```
idalista-tracker/
├── extension/                    # Chrome Extension (TypeScript)
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
├── src/                          # Existing Python backend
│   ├── api/
│   ├── services/
│   └── ...
│
└── specs/003-chrome-extension-crawler/
    ├── spec.md
    ├── plan.md
    ├── research.md
    ├── data-model.md
    ├── quickstart.md
    └── contracts/
```

---

## Setup Instructions

### Step 1: Create Extension Directory Structure

```bash
# From project root
mkdir -p extension/src/{content,popup,options,services,utils,types}
mkdir -p extension/public/{icons,_locales/en}
mkdir -p extension/dist
```

### Step 2: Initialize Node.js Project

```bash
cd extension

# Initialize with defaults
npm init -y

# Install dependencies
npm install -D typescript @types/chrome vite @vitejs/plugin-react

# Install dev tools
npm install -D eslint @typescript-eslint/parser @typescript-eslint/plugin
npm install -D prettier eslint-config-prettier
```

### Step 3: TypeScript Configuration

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

### Step 4: Vite Configuration

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

### Step 5: Manifest V3

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
    "scripting",
    "tabs"
  ],
  "host_permissions": [
    "https://www.idealista.com/*"
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

### Step 6: Build Scripts

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

### 4. Making Changes

1. Edit source files in `extension/src/`
2. Vite rebuilds automatically in dev mode
3. Click the refresh icon on the extension card in `chrome://extensions/`
4. Test the changes

---

## Development Scripts

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
# Check for issues
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Formatting

```bash
npm run format
```

---

## Testing the Extension

### Manual Testing Checklist

1. **Extension Loads**
   - [ ] Extension icon appears in toolbar
   - [ ] Popup opens when clicking icon
   - [ ] Options page opens from right-click menu

2. **Configuration**
   - [ ] Can save server URL
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
   - [ ] Sends data to configured server

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

## Backend API Setup

The extension requires a running backend API to receive property data.

### Start Existing Backend

```bash
# From project root
cd src

# Install Python dependencies (if not already)
pip install -r requirements.txt

# Run the API
uvicorn main:app --reload --port 8000
```

### Configure Extension

1. Open extension Options page
2. Set Server URL to `http://localhost:8000`
3. Save configuration

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
- Verify `host_permissions` in manifest includes API URL

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `extension/src/background.ts` | Service worker - crawl orchestration |
| `extension/src/content/index.ts` | Content script - DOM extraction |
| `extension/src/popup/index.html` | Extension popup UI |
| `extension/src/options/index.html` | Configuration page |
| `extension/src/services/api.ts` | API client |
| `extension/src/services/crawler.ts` | Crawl logic |
| `extension/src/types/index.ts` | TypeScript interfaces |
| `extension/public/manifest.json` | Extension manifest |

---

## Next Steps

1. **Generate Icon Files**: Create 16x16, 32x32, 48x48, 128x128 PNG icons in `public/icons/`
2. **Implement Background Script**: Service worker for crawl orchestration
3. **Implement Content Scripts**: DOM extraction for searches and listings
4. **Build Popup UI**: React or vanilla JS for user interface
5. **Build Options Page**: Configuration settings
6. **Test End-to-End**: Full crawl flow from extension to API
