# Research Report: Chrome Extension Property Crawler

**Date**: 2026-05-10  
**Feature**: Chrome Extension Property Crawler  
**Branch**: 003-chrome-extension-crawler

---

## Summary

This research document analyzes the Idealista website structure to inform the Chrome extension crawler implementation. It covers the saved searches page (busquedas), property listings page, pagination patterns, and technical requirements for the browser extension.

---

## Phase 0: HTML Structure Analysis

### 1. Saved Searches Page (Tus búsquedas)

**URL Pattern**: `https://www.idealista.com/usuario/tus-alertas`

#### Search Card Structure
Each saved search is contained in an `<article>` element:

```html
<article class="your-searches__card" 
         data-searchid="115265817" 
         data-searchname="Viviendas en Briviesca" 
         data-searchurl="/venta-viviendas/briviesca-burgos/">
  <div class="your-searches__info">
    <h2 class="search-number">
      <a class="your-searches__name" href="https://www.idealista.com/venta-viviendas/briviesca-burgos/">
        <div class="search-name-container">
          79
          <span class="search-name">Viviendas en Briviesca</span>
        </div>
      </a>
    </h2>
    <p class="your-searches__description">Comprar viviendas en Briviesca, Burgos</p>
  </div>
</article>
```

#### Key Extraction Points

| Field | Selector | Example Value |
|-------|----------|---------------|
| Search ID | `article[data-searchid]` | `115265817` |
| Search Name | `article[data-searchname]` | `Viviendas en Briviesca` |
| Search URL | `article[data-searchurl]` | `/venta-viviendas/briviesca-burgos/` |
| Result Count | `.search-name-container` first text node | `79` |
| Description | `.your-searches__description` | `Comprar viviendas en Briviesca, Burgos` |

#### Container Structure
```
#searches
└── .your-searches__card-container
    └── article.your-searches__card (one per saved search)
```

---

### 2. Property Listings Page (Search Results)

**URL Pattern**: `https://www.idealista.com/venta-viviendas/{location}/pagina-{n}.htm`

#### Property Item Structure
Each property listing is an `<article>` element:

```html
<article class="item extended-item item-multimedia-container" 
         data-element-id="109363171" 
         data-online-booking="false">
  
  <!-- Gallery/Photos -->
  <picture class="item-multimedia">
    <div class="item-gallery">
      <img src="https://img4.idealista.com/.../1372367799.jpg" alt="Foto">
    </div>
  </picture>
  
  <!-- Property Info -->
  <div class="item-info-container">
    <a href="https://www.idealista.com/inmueble/109363171/" 
       class="item-link" 
       title="Piso en Calle Mayor, Briviesca">
      Piso en Calle Mayor, Briviesca
    </a>
    
    <div class="price-row">
      <span class="item-price h2-simulated">150.000<span class="txt-big">€</span></span>
    </div>
    
    <div class="item-detail-char">
      <span class="item-detail">3 hab.</span>
      <span class="item-detail">134 m²</span>
      <span class="item-detail">Planta 2ª exterior sin ascensor</span>
    </div>
    
    <div class="item-description description">
      <p class="ellipsis">Se vende este magnífico piso...</p>
    </div>
  </div>
</article>
```

#### Key Extraction Points

| Field | Selector | Notes |
|-------|----------|-------|
| Property ID | `article[data-element-id]` | Unique numeric ID |
| Title | `.item-link` text | "Piso en Calle Mayor, Briviesca" |
| URL | `.item-link[href]` | Full URL to property detail |
| Price | `.item-price` | "150.000€" - needs parsing |
| Bedrooms | `.item-detail-char .item-detail:nth-child(1)` | "3 hab." |
| Square Meters | `.item-detail-char .item-detail:nth-child(2)` | "134 m²" |
| Floor/Elevator | `.item-detail-char .item-detail:nth-child(3)` | "Planta 2ª exterior sin ascensor" |
| Description | `.item-description .ellipsis` | Truncated description |
| Photos | `.item-gallery img[src]` | Multiple images in gallery |

#### Location Parsing
The title contains location information after "en":
- Pattern: `{Type} en {Location}`
- Example: `Piso en Calle Mayor, Briviesca`
- Location: `Calle Mayor, Briviesca`

#### Price Parsing
Price format: `{amount}.{decimals}€`
- Example: `150.000€` → 150000
- Example: `1.250.000€` → 1250000
- Regex: `/[\d.]+/` then remove dots

#### Square Meters Parsing
Format: `{number} m²`
- Example: `134 m²` → 134
- Regex: `/(\d+)\s*m²/`

---

### 3. Pagination Structure

**Container**: `.pagination`

```html
<div class="pagination">
  <ul>
    <li class="selected"><span>1</span></li>
    <li><a href="/venta-viviendas/briviesca-burgos/pagina-2.htm">2</a></li>
    <li><a href="/venta-viviendas/briviesca-burgos/pagina-3.htm">3</a></li>
    <li class="next">
      <a href="/venta-viviendas/briviesca-burgos/pagina-2.htm">
        <span>Siguiente</span>
      </a>
    </li>
  </ul>
</div>
```

#### Key Extraction Points

| Field | Selector | Notes |
|-------|----------|-------|
| Current Page | `.pagination li.selected span` | "1" |
| Next Page URL | `.pagination li.next a[href]` | Relative URL |
| Page Numbers | `.pagination li a` | All page links |

#### Pagination URL Pattern
- First page: `/venta-viviendas/{location}/`
- Subsequent pages: `/venta-viviendas/{location}/pagina-{n}.htm`

---

## Technical Decisions

### Chrome Extension Architecture

**Decision**: Use Manifest V3 with TypeScript

**Rationale**:
- Manifest V3 is the modern standard (required for Chrome Web Store submissions)
- Service workers for background tasks (replaces background pages)
- Improved security model with CSP
- Better performance through non-persistent background pages

**Structure**:
```
extension/
├── manifest.json           # Extension manifest (V3)
├── src/
│   ├── background.ts       # Service worker for crawl orchestration
│   ├── content/
│   │   ├── index.ts        # Content script entry
│   │   ├── searches.ts     # Saved searches extraction
│   │   └── listings.ts     # Property listings extraction
│   ├── popup/
│   │   ├── index.html      # Popup UI
│   │   ├── index.ts        # Popup logic
│   │   └── styles.css      # Popup styles
│   ├── options/
│   │   ├── index.html      # Options page
│   │   ├── index.ts        # Options logic
│   │   └── styles.css      # Options styles
│   ├── services/
│   │   ├── api.ts          # API communication
│   │   ├── crawler.ts      # Crawl orchestration
│   │   └── storage.ts      # Chrome storage wrapper
│   ├── utils/
│   │   ├── dom.ts          # DOM extraction utilities
│   │   ├── human-like.ts   # Human behavior simulation
│   │   └── parsers.ts      # Data parsing utilities
│   └── types/
│       └── index.ts        # TypeScript interfaces
├── dist/                   # Compiled output
└── package.json
```

---

### TypeScript Configuration

**Decision**: Use strict TypeScript with modern ES2020 target

**Rationale**:
- Type safety for complex data extraction
- Better IDE support and refactoring
- Future-proof for upcoming TypeScript frontend
- Can share types between extension and future frontend

**Key tsconfig settings**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  }
}
```

---

### Human-Like Behavior Implementation

**Decision**: Implement randomized delays and scroll simulation

**Rationale**:
- Reduces detection risk
- Mimics actual user browsing patterns
- Configurable parameters for different risk tolerances

**Implementation**:

| Behavior | Min Delay | Max Delay | Implementation |
|----------|-----------|-----------|----------------|
| Page load wait | 2000ms | 8000ms | `setTimeout` with random |
| Scroll simulation | 500ms | 2000ms | Smooth scroll with random steps |
| Between pages | 5000ms | 15000ms | Navigation delay |
| Between listings | 500ms | 1500ms | Extraction delay |

---

### API Communication

**Decision**: RESTful JSON API with batch endpoint

**Rationale**:
- Simple and well-understood
- Efficient batch ingestion reduces API calls
- Easy to implement in Python (FastAPI) backend

**Endpoint**: `POST /api/v1/properties/batch`

**Request Format**:
```json
{
  "session_id": "uuid",
  "search_id": "115265817",
  "page": 1,
  "properties": [
    {
      "external_id": "109363171",
      "title": "Piso en Calle Mayor, Briviesca",
      "price": 150000,
      "currency": "EUR",
      "location": "Calle Mayor, Briviesca",
      "url": "https://www.idealista.com/inmueble/109363171/",
      "square_meters": 134,
      "bedrooms": 3,
      "description": "Se vende este magnífico piso...",
      "photos": ["https://..."]
    }
  ]
}
```

---

### State Management

**Decision**: Use Chrome Storage API with session persistence

**Rationale**:
- Survives browser restarts
- Sync capability across devices (if needed)
- Structured storage for complex state

**Storage Structure**:
```typescript
interface CrawlState {
  isRunning: boolean;
  currentSessionId: string | null;
  currentSearchId: string | null;
  currentPage: number;
  selectedSearchIds: string[];
  pendingSearches: string[];
  completedSearches: string[];
  stats: {
    totalProperties: number;
    pagesProcessed: number;
    errors: number;
  };
}

interface ExtensionConfig {
  serverUrl: string;
  humanLikeEnabled: boolean;
  minPageDelay: number;
  maxPageDelay: number;
  minNavigationDelay: number;
  maxNavigationDelay: number;
  maxRetries: number;
}
```

---

### Alternatives Considered

#### Alternative 1: Headless Browser (Puppeteer/Playwright)
- **Rejected**: Requires separate process, heavier resource usage, more complex deployment
- **Chosen approach**: Content scripts are lighter and integrate directly with the user's browsing session

#### Alternative 2: Direct HTTP Requests (Fetch/XHR)
- **Rejected**: Would need to handle authentication, cookies, and CSRF tokens manually; more fragile
- **Chosen approach**: Content scripts run in page context with existing authentication

#### Alternative 3: Web Workers for Background Tasks
- **Rejected**: Chrome extension service workers are the standard for Manifest V3
- **Chosen approach**: Service worker provides persistent background execution

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Idealista changes HTML structure | Medium | High | Selector abstraction layer, monitoring |
| Rate limiting / blocking | Medium | High | Human-like delays, exponential backoff |
| Browser extension store policies | Low | High | Follow Chrome Web Store guidelines |
| Large search results (100+ pages) | High | Medium | Session persistence, resume capability |
| User closes browser mid-crawl | Medium | Medium | State persistence, resume on restart |

---

## Dependencies

### Production Dependencies
- None (vanilla TypeScript for minimal bundle size)

### Development Dependencies
- `typescript` - TypeScript compiler
- `vite` or `rollup` - Module bundler
- `@types/chrome` - Chrome API types
- `eslint` - Linting
- `prettier` - Code formatting

---

## Conclusion

The HTML structure is well-defined and extractable. Key findings:

1. **Saved Searches**: Use `article[data-searchid]` with data attributes
2. **Property Listings**: Use `article[data-element-id]` for container, `.item-info-container` for details
3. **Pagination**: Use `.pagination li.next a[href]` for next page navigation
4. **Data Parsing**: Requires regex/string manipulation for price, square meters, and location
5. **TypeScript Setup**: Modern ES2020 target with strict type checking
6. **Architecture**: Manifest V3 with service worker, content scripts, and Chrome Storage

The implementation is feasible with the planned technical approach.
