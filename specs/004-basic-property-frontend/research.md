# Research: Frontend Technology Stack

**Feature**: Basic Property Frontend  
**Date**: 2026-05-17

## Research Tasks

### Task 1: Best Graph Library for React/Next.js

**Options Evaluated**:

| Library | Pros | Cons | Best For |
|---------|------|------|----------|
| **Recharts** | React-native, composable, good docs, lightweight | Fewer chart types than D3 | Standard charts (bar, line, pie) |
| Chart.js + react-chartjs-2 | Mature, many plugins | Canvas-based, less React-idiomatic | Complex custom visualizations |
| D3.js | Ultimate flexibility | Steep learning curve, verbose code | Custom data viz, complex interactivity |
| Victory | React-native, animations | Larger bundle size | Animated charts, cross-platform |

**Decision**: Recharts

**Rationale**:
- Built specifically for React with declarative API
- Composable component architecture matches React patterns
- Simple bar/histogram chart needed - no complex custom visualization required
- Good TypeScript support
- Smaller bundle size than alternatives
- Well-documented and actively maintained
- Price distribution histogram is straightforward with Recharts BarChart

**Alternatives Rejected**:
- Chart.js: Not as React-idiomatic, requires wrapper
- D3.js: Overkill for a simple histogram
- Victory: Larger bundle, unnecessary animations for this use case

---

### Task 2: Next.js vs Simple Static HTML

**Decision**: Next.js 14 with App Router

**Rationale**:
- React Server Components allow direct database queries without API layer
- Built-in TypeScript support
- Static export compatible for simple deployment
- Built-in loading.tsx and error.tsx for UX requirements
- File-based routing is simple
- Good developer experience with fast refresh
- Can easily extend to API routes if needed later

**Alternatives Rejected**:
- Plain HTML/JS: Would need manual build setup, no TypeScript
- Vite + React: Good but Next.js offers more built-in features (routing, SSG)
- Create React App: Deprecated, Next.js is the standard

---

### Task 3: Styling Approach

**Decision**: Tailwind CSS

**Rationale**:
- Utility-first approach enables rapid UI development
- No runtime CSS-in-JS overhead
- Excellent responsive design utilities
- Consistent spacing and color scales
- Built-in with Next.js setup
- Small bundle size (purges unused styles)

**Alternatives Rejected**:
- CSS Modules: More verbose for simple components
- Styled-components: Runtime overhead, not needed for this simple UI
- Plain CSS: Harder to maintain consistent design system

---

### Task 4: Data Fetching Strategy

**Decision**: React Server Components with SQLite

**Rationale**:
- Next.js App Router supports async Server Components
- Can query SQLite directly without REST API layer
- Pagination handled server-side for performance
- Price aggregation computed in SQL for efficiency
- Simpler architecture than separate backend API

**Implementation**:
- Use `better-sqlite3` for synchronous SQLite queries
- Server Component fetches paginated data
- Separate query for price distribution buckets

---

### Task 5: Pagination Approach

**Decision**: Server-side pagination with URL query params

**Rationale**:
- Keeps page load fast with large datasets
- URL params allow bookmarking/sharing specific pages
- Server Component re-renders with new params
- Simple UI: Previous/Next buttons + page numbers

**Page Size**: 20 properties per page (good balance for UX and performance)

---

## Summary of Decisions

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Framework | Next.js 14 | RSC, built-in features, TypeScript |
| Styling | Tailwind CSS | Utility-first, responsive, fast |
| Charts | Recharts | React-native, simple API, lightweight |
| Database | SQLite (existing) | No migration needed, direct access |
| Data Fetching | Server Components | Simpler than API layer |
| Pagination | Server-side, 20/page | Performance, UX |

## Dependencies to Install

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "recharts": "^2.x",
    "better-sqlite3": "^9.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "@types/better-sqlite3": "^7.x"
  }
}
```
