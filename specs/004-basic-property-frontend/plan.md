# Implementation Plan: Basic Property Frontend

**Branch**: `[004-basic-property-frontend]` | **Date**: 2026-05-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-basic-property-frontend/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a Next.js frontend with Tailwind CSS that displays a paginated list of properties from the SQLite database and includes a price distribution histogram using Recharts. The frontend provides a clean, responsive homepage for the property crawler with minimal complexity.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+  
**Primary Dependencies**: Next.js 14 (App Router), Tailwind CSS, Recharts  
**Storage**: SQLite (existing database from crawler)  
**Testing**: Jest, React Testing Library, Playwright  
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge)  
**Project Type**: Web application (Next.js frontend)  
**Performance Goals**: Initial page load < 3 seconds, Time to Interactive < 4 seconds  
**Constraints**: Must work with existing SQLite schema, no authentication required, static export compatible  
**Scale/Scope**: Single-user local deployment, < 10,000 properties

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Code Quality (I)
- ✅ Use TypeScript for type safety
- ✅ ESLint + Prettier configuration for Next.js
- ✅ Simple component structure with clear naming

### Testing Standards (II)
- ✅ Unit tests for data transformation logic
- ✅ Component tests for UI elements
- ⚠️ Justification: E2E tests may be minimal given simple read-only functionality

### UX Consistency (III)
- ✅ Tailwind CSS for consistent styling
- ✅ Loading and error states per spec requirements
- ✅ Responsive design for mobile/desktop

### Performance (IV)
- ✅ Next.js static generation for fast initial load
- ✅ Pagination to limit data per request
- ✅ Client-side data fetching for price distribution

### Simplicity (V)
- ✅ Minimal dependencies: Next.js + Tailwind + Recharts
- ✅ Simple page structure: list + graph
- ✅ No complex state management needed

**Constitution Check**: ✅ PASSED - All principles can be met with simple, standard Next.js patterns.

## Project Structure

### Documentation (this feature)

```text
specs/004-basic-property-frontend/
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
│   ├── page.tsx            # Main page with property list + graph
│   ├── layout.tsx          # Root layout with providers
│   ├── loading.tsx         # Loading state
│   └── error.tsx           # Error boundary
├── components/
│   ├── PropertyList.tsx    # Paginated property list component
│   ├── PropertyCard.tsx    # Individual property card
│   ├── PriceChart.tsx      # Price distribution histogram
│   └── Pagination.tsx      # Pagination controls
├── lib/
│   ├── db.ts               # SQLite database connection
│   └── utils.ts            # Utility functions
├── types/
│   └── property.ts         # TypeScript interfaces
├── tests/
│   ├── unit/
│   │   ├── PropertyList.test.tsx
│   │   └── PriceChart.test.tsx
│   └── integration/
│       └── page.test.tsx
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Structure Decision**: Using Next.js 14 with App Router in a dedicated `frontend/` directory. This separates the frontend from existing crawler code while keeping it in the same repository.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. The solution adheres to all Constitution principles with minimal complexity:
- Single frontend application (Next.js)
- Standard patterns (React Server Components for data fetching)
- Minimal external dependencies
- Simple feature set (list + graph)
