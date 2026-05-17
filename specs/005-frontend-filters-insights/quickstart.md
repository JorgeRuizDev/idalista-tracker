# Quickstart: Frontend Filters, Sorting & Insights

**Feature**: Frontend Filters, Sorting & Insights  
**Date**: 2026-05-17  
**Prerequisites**: Node.js 18+, existing SQLite database with properties

---

## Development Setup

### 1. Navigate to Frontend Directory

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Ensure Database Connection

The frontend expects the SQLite database at `../data/properties.db` (relative to frontend directory).

Verify the database exists:
```bash
ls -la ../data/properties.db
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

---

## Feature-Specific Development Guide

### Testing Filters

1. Open `http://localhost:3000`
2. Click "Filters" button to open filter panel
3. Test combinations:
   - Set price range: 100000 - 200000
   - Select location: "Madrid"
   - Set bedrooms: 2 - 3
4. Verify URL updates with query params (e.g., `?priceMin=100000&priceMax=200000&location=Madrid`)
5. Copy URL and open in new tab - filters should persist

### Testing Sort

1. With properties displayed, click "Sort" dropdown
2. Select different options:
   - Price: Low to High
   - Price: High to Low
   - Newest First
   - Price Change
3. Verify list reorders correctly

### Testing Price Change Indicators

1. Properties with price history show colored indicators:
   - Green ↓ 5% = Price dropped
   - Red ↑ 3% = Price increased
2. Verify indicator appears smaller than price text
3. Hover shows tooltip with change date

### Testing Insights Page

1. Apply some filters on main page
2. Click "View Insights" button
3. Verify stats reflect filtered subset:
   - Average price updates
   - Price range matches filters
   - Property count matches list
4. Modify filters from insights page
5. Stats should update automatically

---

## File Structure for This Feature

```
frontend/
├── app/
│   ├── page.tsx              # Updated with FilterPanel + SortDropdown
│   ├── insights/
│   │   └── page.tsx          # New insights dashboard
│   └── layout.tsx            # Unchanged
├── components/
│   ├── FilterPanel.tsx       # NEW: Filter controls UI
│   ├── SortDropdown.tsx      # NEW: Sort selector UI
│   ├── PropertyCard.tsx      # UPDATED: Add image + price change
│   ├── PriceChange.tsx       # NEW: Price change indicator
│   ├── ImageThumbnail.tsx    # NEW: Lazy-loaded image
│   ├── InsightsChart.tsx     # NEW: Stats chart component
│   └── StatsCard.tsx         # NEW: Stat display component
├── lib/
│   ├── filters.ts            # NEW: Filter logic utilities
│   ├── sorting.ts            # NEW: Sort logic utilities
│   └── stats.ts              # NEW: Statistics calculations
├── hooks/
│   ├── useFilters.ts         # NEW: URL-based filter state
│   └── useProperties.ts      # UPDATED: Filter/sort integration
└── types/
    └── property.ts           # UPDATED: Add new type definitions
```

---

## Common Tasks

### Add New Filter Type

1. Update `FilterState` interface in `types/property.ts`
2. Add UI control in `FilterPanel.tsx`
3. Update filter logic in `lib/filters.ts`
4. Add URL param handling in `hooks/useFilters.ts`

### Add New Sort Option

1. Update `SortOption` interface in `types/property.ts`
2. Add option to `SortDropdown.tsx`
3. Update sort logic in `lib/sorting.ts`

### Modify Insights Stats

1. Update `InsightStats` interface in `types/property.ts`
2. Add calculation in `lib/stats.ts`
3. Add display component in insights page

---

## Testing

### Run Unit Tests

```bash
npm test
```

### Run Component Tests

```bash
npm test -- --testPathPattern="components"
```

### Run Integration Tests

```bash
npm test -- --testPathPattern="integration"
```

---

## Troubleshooting

### Filters not persisting across navigation
- Check that URL query params are being updated
- Verify `useFilters` hook is being used on both pages

### Images not loading
- Check `imageUrl` field exists in database
- Verify image URLs are publicly accessible
- Check browser console for CORS errors

### Insights stats not updating
- Verify `useProperties` hook returns filtered data
- Check that insights page receives same filter state
- Ensure stats calculation functions are being called

### Price change indicators not showing
- Verify `price_history` table has data
- Check that most recent change is being fetched
- Ensure `PriceChange` component is receiving correct props
