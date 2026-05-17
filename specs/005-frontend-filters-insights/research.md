# Research: Frontend Filters, Sorting & Insights

**Feature**: Frontend Filters, Sorting & Insights  
**Date**: 2026-05-17  
**Purpose**: Resolve technical unknowns and document design decisions

---

## Research Area 1: Filter State Management

### Question
How should filter state be managed and persisted across page navigation?

### Decision
Use URL query parameters for filter state persistence.

### Rationale
- **Shareability**: Users can share filtered views via URL
- **Browser integration**: Back/forward buttons work naturally
- **Simplicity**: No additional state management library needed
- **SSR compatibility**: Works with Next.js App Router server components

### Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| React Context | Simple, no URL parsing | Lost on refresh, not shareable | ❌ Rejected |
| Zustand/Redux | Powerful state management | Overkill for this scope, adds dependency | ❌ Rejected |
| LocalStorage | Persists across sessions | Not shareable, SSR issues | ❌ Rejected |
| URL Query Params | Shareable, SSR-friendly, simple | URL can get long | ✅ Selected |

---

## Research Area 2: Client-Side vs Server-Side Filtering

### Question
Should filtering be done client-side or server-side?

### Decision
Client-side filtering for current dataset size (< 10,000 properties).

### Rationale
- **Performance**: Sub-500ms filtering for < 1000 properties in JavaScript
- **Responsiveness**: No network round-trip for filter changes
- **Offline capability**: Works without server after initial load
- **Simplicity**: No API endpoints needed, reduces complexity

### Threshold for Change
If property dataset exceeds 10,000 properties, evaluate server-side filtering with pagination.

---

## Research Area 3: Image Loading Strategy

### Question
How should property images be loaded efficiently?

### Decision
Use Next.js Image component with lazy loading and blur placeholder.

### Rationale
- **Optimization**: Automatic WebP/AVIF conversion, responsive sizes
- **Performance**: Lazy loading prevents initial page bloat
- **UX**: Blur placeholder improves perceived performance
- **Built-in**: No additional dependencies required

### Implementation Notes
- Store image URLs in database as strings
- Use placeholder SVG for properties without images
- Implement error fallback for broken image URLs

---

## Research Area 4: Price Change Calculation

### Question
How should price changes be calculated and displayed?

### Decision
Calculate percentage change from most recent price history entry to current price.

### Rationale
- **Clarity**: Percentage is more meaningful than absolute for comparison
- **Recency**: Most recent change matters most to users
- **Visual priority**: Only show indicator if change > 0

### Edge Case Handling
- If property has no price history → No indicator shown
- If property has multiple changes → Show most recent only
- If price decreased then increased → Show the most recent change direction

---

## Research Area 5: Insights Statistics Calculation

### Question
What statistics should be calculated and how?

### Decision
Calculate on-the-fly in browser for filtered dataset.

### Rationale
- **Freshness**: Always reflects current filter state
- **Performance**: JavaScript can handle stats for < 1000 items instantly
- **No caching complexity**: No invalidation logic needed

### Statistics to Display
1. **Average Price**: Mean of all filtered properties
2. **Price Range**: Min/Max values
3. **Property Count**: Total filtered items
4. **Average Price Change**: Mean of recent price changes (for properties with history)
5. **Price Distribution**: Histogram buckets for visual chart

---

## Research Area 6: Mobile Responsiveness

### Question
How should filters behave on mobile devices?

### Decision
Collapsible filter panel with overlay on mobile, sidebar on desktop.

### Rationale
- **Screen real estate**: Filters take significant space
- **Touch friendly**: Larger tap targets in overlay mode
- **Progressive disclosure**: Show filters only when needed
- **Consistency**: Common mobile UI pattern

### Implementation
- Use CSS breakpoints (Tailwind `md:` prefix)
- Filter button toggles overlay on mobile
- Horizontal scroll for filter chips on small screens

---

## Summary of Decisions

| Area | Decision | Key Benefit |
|------|----------|-------------|
| State Management | URL Query Params | Shareable, SSR-compatible |
| Filtering | Client-side | Instant feedback, no API needed |
| Images | Next.js Image + lazy | Optimized, performant |
| Price Changes | Recent change % | Meaningful, clear indicator |
| Insights | On-the-fly calc | Always fresh, simple |
| Mobile | Collapsible panel | UX-optimized for small screens |
