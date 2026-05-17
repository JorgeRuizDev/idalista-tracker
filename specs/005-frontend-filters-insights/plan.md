# Implementation Plan: Frontend Filters, Sorting & Insights

**Branch**: `005-frontend-filters-insights` | **Date**: 2026-05-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-frontend-filters-insights/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Extend the existing Next.js property frontend with advanced filtering, sorting, and insights capabilities. Add property thumbnail images to list view, display price change indicators (green ↓ for drops, red ↑ for increases), and create an insights dashboard showing statistics for the currently filtered property set. Build on the existing Tailwind CSS + Recharts foundation with React state management for filter/sort persistence.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+  
**Primary Dependencies**: Next.js 14 (App Router), Tailwind CSS, Recharts, clsx, tailwind-merge  
**Storage**: SQLite (existing database from crawler)  
**Testing**: Jest, React Testing Library, Playwright  
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge), mobile-responsive  
**Project Type**: Web application (Next.js frontend)  
**Performance Goals**: Filter/sort response < 500ms, image loading < 2s, insights calculation < 1s for up to 1000 properties  
**Constraints**: Client-side filtering for datasets < 1000 properties, URL-based filter persistence for shareable links, static export compatible  
**Scale/Scope**: Single-user local deployment, < 10,000 properties, up to 50 images displayed simultaneously

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Code Quality (I)
- ✅ TypeScript for type safety with strict mode
- ✅ ESLint + Prettier configuration maintained
- ✅ Reusable filter/sort components with clear interfaces
- ✅ Utility functions for price calculations extracted and tested

### Testing Standards (II)
- ✅ Unit tests for filter/sort logic
- ✅ Component tests for FilterPanel and SortDropdown
- ✅ Integration tests for filter → insights data flow
- ⚠️ Justification: E2E tests focus on primary user journeys (filter → view insights)

### UX Consistency (III)
- ✅ Tailwind CSS design system maintained
- ✅ Consistent filter controls (dropdowns, range sliders)
- ✅ Clear visual indicators for active filters
- ✅ Accessible: keyboard navigation, ARIA labels on filters
- ✅ Loading states for images and insights calculations
- ✅ Empty states for no-filter-results scenarios

### Performance (IV)
- ✅ Client-side filtering for instant feedback (< 500ms)
- ✅ Image lazy loading for property thumbnails
- ✅ URL state persistence for shareable filtered views
- ✅ Optimistic UI updates for filter/sort changes

### Simplicity (V)
- ✅ URL query params for filter state (no complex state library)
- ✅ Simple component hierarchy: FilterBar → PropertyList → PropertyCard
- ✅ Reuse existing Recharts for insights visualizations
- ✅ No additional dependencies beyond existing stack

**Constitution Check**: ✅ PASSED - All principles can be met with existing Next.js patterns and minimal complexity.

## Project Structure

### Documentation (this feature)

```text
specs/005-frontend-filters-insights/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/                    # Next.js application
├── app/
│   ├── page.tsx            # Main page with filters + property list
│   ├── insights/
│   │   └── page.tsx        # Insights dashboard page
│   ├── layout.tsx          # Root layout with providers
│   ├── loading.tsx         # Loading state
│   └── error.tsx           # Error boundary
├── components/
│   ├── FilterPanel.tsx     # Filter controls (price, location, beds)
│   ├── SortDropdown.tsx    # Sort option selector
│   ├── PropertyList.tsx    # Filtered/sorted property list
│   ├── PropertyCard.tsx    # Property card with image + price change
│   ├── PriceChange.tsx     # Price change indicator component
│   ├── ImageThumbnail.tsx  # Lazy-loaded property image
│   ├── InsightsChart.tsx   # Stats visualization for insights page
│   └── StatsCard.tsx       # Individual stat display component
├── lib/
│   ├── db.ts               # SQLite database connection
│   ├── filters.ts          # Filter logic utilities
│   ├── sorting.ts          # Sort logic utilities
│   ├── stats.ts            # Statistics calculation utilities
│   └── utils.ts            # General utility functions
├── hooks/
│   ├── useFilters.ts       # URL-based filter state management
│   └── useProperties.ts    # Property data fetching with filter/sort
├── types/
│   └── property.ts         # TypeScript interfaces
├── tests/
│   ├── unit/
│   │   ├── filters.test.ts
│   │   ├── sorting.test.ts
│   │   └── stats.test.ts
│   ├── components/
│   │   ├── FilterPanel.test.tsx
│   │   └── PropertyCard.test.tsx
│   └── integration/
│       └── insights.test.tsx
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Structure Decision**: Extending the existing Next.js 14 frontend structure in `frontend/`. Adding a new `hooks/` directory for state management and expanding `lib/` with filter/sort/stats utilities. Insights page uses Next.js App Router nested routing at `/insights`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. The solution adheres to all Constitution principles with minimal complexity:
- Extends existing single frontend application
- Uses standard React patterns (hooks for state, URL for persistence)
- No new dependencies required
- Simple feature set building on existing property list
