# Idalista Property Crawler - Chrome Extension

A Chrome extension that crawls property listings from Idealista saved searches and feeds them into the Idalista backend API for tracking and analysis.

## Overview

This extension allows you to:
- Automatically detect your Idealista saved searches
- Select which searches to crawl
- Extract property data (price, size, location, etc.)
- Send data in batches to your local backend
- Track property changes and identify sold properties

## Prerequisites

Before you start, make sure you have:

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **npm** (comes with Node.js)
   - Verify: `npm --version`

3. **Google Chrome** (version 88 or higher)
   - The extension uses Manifest V3

4. **Backend API Running**
   - The FastAPI backend must be running at `http://localhost:8000`
   - See main project README for backend setup

## Quick Start

### 1. Install Dependencies

Open a terminal/command prompt and navigate to the extension folder:

```bash
cd extension
npm install
```

This will download all required packages (TypeScript, Vite, ESLint, etc.).

### 2. Build the Extension

#### For Development (with auto-rebuild):

```bash
npm run dev
```

This starts a watcher that automatically rebuilds when you change files.

#### For Production:

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

### 3. Load in Chrome

1. Open Chrome and navigate to: `chrome://extensions/`

2. Enable **"Developer mode"** (toggle in top right corner)

3. Click **"Load unpacked"** button

4. Select the `extension/dist` folder

5. The extension icon should appear in your Chrome toolbar!

## Development Workflow

### Project Structure

```
extension/
├── src/
│   ├── background.ts          # Service worker - manages crawl sessions
│   ├── content/
│   │   ├── index.ts           # Content script entry point
│   │   ├── searches.ts        # Extract saved searches from page
│   │   └── listings.ts        # Extract property listings from page
│   ├── popup/
│   │   ├── index.html         # Popup UI HTML
│   │   ├── index.ts           # Popup logic
│   │   └── styles.css         # Popup styles
│   ├── options/
│   │   ├── index.html         # Settings page HTML
│   │   ├── index.ts           # Settings logic
│   │   └── styles.css         # Settings styles
│   ├── services/
│   │   ├── api.ts             # Backend API communication
│   │   ├── crawler.ts         # Crawl orchestration logic
│   │   └── storage.ts         # Chrome Storage wrapper
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   └── utils/
│       ├── dom.ts             # DOM manipulation utilities
│       ├── human-like.ts      # Human behavior simulation
│       └── parsers.ts         # Data parsing utilities
├── public/
│   ├── manifest.json          # Extension manifest (required)
│   └── icons/                 # Extension icons (16, 32, 48, 128px)
├── dist/                      # Build output (generated)
├── package.json               # Node.js dependencies
├── tsconfig.json              # TypeScript configuration
└── vite.config.ts             # Build configuration
```

### Making Changes

1. **Edit source files** in `src/` folder
2. **If running `npm run dev`**: Changes are auto-detected and rebuilt
3. **If not running dev mode**: Run `npm run build` after changes
4. **Reload extension** in Chrome:
   - Go to `chrome://extensions/`
   - Find the extension card
   - Click the refresh icon (↻)

### Available Scripts

```bash
# Development build with auto-reload
npm run dev

# Production build (optimized)
npm run build

# Type check only (no build)
npm run type-check

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

## Configuration

### 1. Extension Settings

1. Click the extension icon in Chrome toolbar
2. Click **"Settings"** link at the bottom
3. Configure:
   - **Server URL**: `http://localhost:8000` (default)
   - **Human-like behavior**: Enable for realistic delays
   - **Delay settings**: Adjust wait times between pages

### 2. First-Time Setup

1. **Navigate to Idealista** and log into your account
2. **Go to your saved searches**: `https://www.idealista.com/usuario/tus-alertas`
3. **Open the extension popup** - it should detect your searches
4. **Select searches** you want to crawl
5. **Click "Start Crawl"**

## How It Works

### Crawl Process

1. **Detection**: Extension detects saved searches on Idealista page
2. **Selection**: You select which searches to crawl
3. **Navigation**: Extension automatically navigates through search result pages
4. **Extraction**: Property data is extracted from each page
5. **Batching**: Data is collected and sent to backend in batches
6. **Tracking**: Backend tracks new properties, price changes, and missing properties

### Data Flow

```
Chrome Extension              Backend API
     │                             │
     ├── Detect Searches ─────────>│
     │                             │
     ├── Extract Listings ────────>│
     │                             │
     ├── Send Batches ───────────>│
     │                             │
     │<────────── Store ──────────│
     │         in SQLite          │
```

## Troubleshooting

### Extension Not Loading

**Problem**: Extension doesn't appear in Chrome

**Solutions**:
- Check that `dist/manifest.json` exists
- Verify manifest.json is valid JSON (no syntax errors)
- Check Chrome console for errors: `chrome://extensions/` → click "Errors" button

### Build Errors

**Problem**: `npm run build` fails

**Solutions**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Check TypeScript errors
npm run type-check
```

### TypeScript Errors

**Problem**: Type checking fails

**Solutions**:
```bash
# Run type check to see specific errors
npm run type-check

# Check if all dependencies are installed
npm install
```

### API Connection Errors

**Problem**: Extension can't connect to backend

**Solutions**:
1. **Verify backend is running**:
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status": "healthy", ...}`

2. **Check CORS settings** in backend (`src/main.py`):
   ```python
   allow_origins=["*"]  # Should allow extension origin
   ```

3. **Verify host_permissions** in `manifest.json`:
   ```json
   "host_permissions": [
     "https://www.idealista.com/*",
     "http://localhost:8000/*"
   ]
   ```

### Content Script Not Injecting

**Problem**: Extension doesn't detect page content

**Solutions**:
- Check URL pattern in `manifest.json` matches the page
- Refresh the page after loading extension
- Check browser console for CSP errors

### Extension Icon Missing

**Problem**: No icon appears in toolbar

**Solutions**:
- Click puzzle piece icon in Chrome toolbar
- Find "Idalista Property Crawler"
- Click pin icon to keep it visible

## Development Tips

### Debugging

1. **Background Script**:
   - Go to `chrome://extensions/`
   - Find extension → Click "service worker" link
   - View console logs

2. **Content Script**:
   - Right-click on page → Inspect
   - Go to Console tab
   - Look for messages from content script

3. **Popup**:
   - Right-click extension icon → Inspect popup
   - View console for popup-specific errors

### Testing Changes

After making code changes:
1. Build: `npm run build` (or let dev watcher do it)
2. Reload extension in `chrome://extensions/`
3. Test the feature

### Common Issues

**"Cannot find module" errors**:
- Run `npm install` again
- Check imports use correct relative paths (`./` or `../`)

**Changes not reflecting**:
- Make sure you reloaded the extension
- Clear browser cache: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

## Building for Distribution

To create a package for the Chrome Web Store:

```bash
# Create production build
npm run build

# Zip the dist folder
zip -r idalista-extension.zip dist/
```

Upload `idalista-extension.zip` to Chrome Web Store Developer Dashboard.

## Next Steps

See the main project documentation:
- [specs/003-chrome-extension-crawler/quickstart.md](../specs/003-chrome-extension-crawler/quickstart.md) - Detailed setup guide
- [specs/003-chrome-extension-crawler/contracts/api.md](../specs/003-chrome-extension-crawler/contracts/api.md) - API documentation

## Support

If you encounter issues:
1. Check this README's troubleshooting section
2. Review browser console for error messages
3. Verify backend is running and accessible
4. Check the main project README for backend setup

## License

MIT License - See main project LICENSE file
