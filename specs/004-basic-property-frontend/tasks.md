# Tasks: Basic Property Frontend

**Input**: Design documents from `/specs/004-basic-property-frontend/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/data-contracts.md, research.md

**Tests**: Test tasks are NOT included as they were not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app structure**: `frontend/` directory with Next.js App Router
- All paths relative to `frontend/` unless otherwise specified

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Next.js setup

- [X] T001 Create `frontend/` directory and initialize Next.js 14 project with TypeScript
- [X] T002 [P] Install core dependencies: `recharts`, `better-sqlite3`
- [X] T003 [P] Install dev dependencies: `@types/better-sqlite3`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`
- [X] T004 [P] Configure Tailwind CSS with `tailwind.config.ts` and `postcss.config.js`
- [X] T005 Configure `next.config.js` for static export and database path
- [X] T006 Create `tsconfig.json` with strict TypeScript settings

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create `frontend/types/property.ts` with TypeScript interfaces (Property, PriceBucket, PriceDistribution, PaginatedProperties, PaginationInfo)
- [X] T008 Implement `frontend/lib/db.ts` with database connection singleton using better-sqlite3
- [X] T009 Implement `getPaginatedProperties()` function in `frontend/lib/db.ts` with SQL query and pagination logic
- [X] T010 Implement `getPriceDistribution()` function in `frontend/lib/db.ts` with bucket aggregation SQL
- [X] T011 Create `frontend/lib/utils.ts` with helper functions (currency formatter, price bucket formatter)
- [X] T012 Create root layout `frontend/app/layout.tsx` with HTML structure and metadata
- [X] T013 Create global styles `frontend/app/globals.css` with Tailwind directives

**Checkpoint**: Foundation ready - database connection works, types defined, utilities available. User story implementation can now begin.

---

## Phase 3: User Story 1 - View Property List (Priority: P1) 🎯 MVP

**Goal**: Display a paginated list of all properties from the database with title, price, and location

**Independent Test**: Load `http://localhost:3000` and verify properties are displayed in a scrollable list with pagination controls. Navigate to page 2 and verify different properties load.

### Implementation for User Story 1

- [X] T014 [US1] Create `frontend/components/PropertyCard.tsx` to display individual property (title, price, location, property type, size, bedrooms, status badge)
- [X] T015 [US1] Create `frontend/components/Pagination.tsx` with previous/next buttons and page numbers
- [X] T016 [US1] Create `frontend/components/PropertyList.tsx` that composes PropertyCard and Pagination
- [X] T017 [US1] Implement `frontend/app/page.tsx` Server Component that fetches paginated properties and renders PropertyList + empty state handling
- [X] T018 [US1] Create `frontend/app/loading.tsx` with loading spinner/skeleton for property list
- [X] T019 [US1] Create `frontend/app/error.tsx` with Error Boundary for database connection failures
- [X] T020 [US1] Add URL query param handling for `?page=N` in page.tsx
- [X] T021 [US1] Style PropertyCard with Tailwind (card layout, responsive grid, hover effects)
- [X] T022 [US1] Style Pagination with Tailwind (button states, current page indicator)

**Checkpoint**: User Story 1 complete - paginated property list works independently. Properties display with all required fields, pagination navigates correctly, loading and error states function.

---

## Phase 4: User Story 2 - View Price Distribution Graph (Priority: P1)

**Goal**: Display a price distribution histogram showing the spread of property prices using Recharts

**Independent Test**: Load `http://localhost:3000` and verify a bar chart appears showing price buckets. Hover over bars to see price ranges and counts. Chart should update when new properties are added to the database.

### Implementation for User Story 2

- [X] T023 [P] [US2] Create `frontend/components/PriceChart.tsx` with Recharts BarChart for price distribution histogram
- [X] T024 [US2] Update `frontend/app/page.tsx` to fetch price distribution data alongside paginated properties
- [X] T025 [US2] Integrate PriceChart into page layout alongside PropertyList (responsive two-column or stacked layout)
- [X] T026 [US2] Add chart customization: tooltip showing price range and count, axis labels, chart title
- [X] T027 [US2] Handle edge cases in PriceChart: single property, identical prices, empty database
- [X] T028 [US2] Style PriceChart container with Tailwind (card wrapper, responsive sizing)
- [X] T029 [US2] Ensure chart re-renders when page data refreshes (Server Component re-fetch on navigation)

**Checkpoint**: User Story 2 complete - price distribution graph displays alongside property list. Both features work independently. Chart handles all edge cases.

---

## Phase 5: User Story 3 - Responsive Layout (Priority: P2)

**Goal**: Ensure the frontend displays properly on all screen sizes from mobile to desktop

**Independent Test**: Open `http://localhost:3000` on desktop (1920px), tablet (768px), and mobile (375px). Verify both property list and chart are readable without horizontal scrolling. Test pagination usability on all sizes.

### Implementation for User Story 3

- [X] T030 [P] [US3] Add responsive breakpoints to `frontend/app/page.tsx` layout (grid changes: 1 column mobile, 2 columns desktop)
- [X] T031 [P] [US3] Update `frontend/components/PropertyCard.tsx` with responsive sizing (stack vs side-by-side layout)
- [X] T032 [P] [US3] Update `frontend/components/PriceChart.tsx` with responsive container (Recharts ResponsiveContainer)
- [X] T033 [P] [US3] Update `frontend/components/Pagination.tsx` with mobile-friendly sizing (larger touch targets, simplified on small screens)
- [X] T034 [P] [US3] Test and adjust spacing, font sizes, and padding across all breakpoints in `globals.css`
- [X] T035 [P] [US3] Verify empty and error states display correctly on all screen sizes

**Checkpoint**: User Story 3 complete - frontend is fully responsive. Property list, chart, and pagination work on all screen sizes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and validation

- [X] T036 [P] Run `npm run build` to verify static export works without errors
- [X] T037 [P] Test with empty database - verify empty state message displays correctly
- [X] T038 [P] Test error handling - verify error boundary catches database failures gracefully
- [X] T039 [P] Verify all edge cases from spec: single property, identical prices, extreme price variations
- [X] T040 [P] Run quickstart.md validation steps
- [X] T041 [P] Final code review: ensure all TypeScript types are correct, no `any` types
- [X] T042 [P] Verify loading states display correctly (throttle network if needed)
- [X] T043 [P] Add `.gitignore` for `frontend/` (node_modules, .next, dist, .env.local)
- [X] T044 Update `specs/004-basic-property-frontend/quickstart.md` if any setup steps changed during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
  - T007-T013 must complete before any user story tasks
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1) and User Story 2 (P1) can be developed in parallel after Foundational
  - User Story 3 (P2) can start after US1/US2 are functional (needs components to style)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Creates PropertyCard, Pagination, PropertyList components
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Creates PriceChart component, integrates with page layout
  - Can run in parallel with US1 (different components)
  - T024 (page.tsx update) depends on both US1 and US2 components existing
- **User Story 3 (P2)**: Should start after US1 and US2 are functionally complete
  - Needs components to exist before applying responsive styles

### Within Each User Story

- Models/Types before components (already in Foundational phase)
- Presentational components (PropertyCard, Pagination) before container components (PropertyList, page.tsx)
- Core implementation (T014-T022) before styling refinements
- Each story should be testable independently after its tasks complete

### Parallel Opportunities

- All Setup tasks (T001-T006) can run in parallel
- All Foundational tasks (T007-T013) can run in parallel
- Once Foundational is done:
  - US1 and US2 can proceed in parallel (different components/files)
  - Within US1: T014, T015, T018, T019 can run in parallel
  - Within US2: T023, T026, T027, T028 can run in parallel
- All Polish tasks (T036-T044) can run in parallel at the end

---

## Parallel Example: User Story 1 + User Story 2

```bash
# After Foundational phase completes, launch US1 and US2 in parallel:

# Developer A - User Story 1 (Property List):
Task: "Create PropertyCard.tsx component"
Task: "Create Pagination.tsx component"
Task: "Create PropertyList.tsx container"
Task: "Implement page.tsx with data fetching"

# Developer B - User Story 2 (Price Chart) - Parallel:
Task: "Create PriceChart.tsx with Recharts"
Task: "Add chart styling and tooltips"
Task: "Handle edge cases in chart"

# Then integrate:
Task: "Update page.tsx to include PriceChart alongside PropertyList"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T013) - CRITICAL
3. Complete Phase 3: User Story 1 (T014-T022) - Property List
4. Complete Phase 4: User Story 2 (T023-T029) - Price Chart
5. **STOP and VALIDATE**: Test both P1 stories independently
6. Deploy/demo if ready

**MVP Deliverables**:
- Working paginated property list
- Price distribution histogram
- Loading and error states
- Basic responsive layout (can improve in P2)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Core list functionality)
3. Add User Story 2 → Test independently → Deploy/Demo (Adds analytics visualization)
4. Add User Story 3 → Test independently → Deploy/Demo (Polish - responsive improvements)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (Phase 1-2)
2. Once Foundational is done:
   - Developer A: User Story 1 (Property List components)
   - Developer B: User Story 2 (Price Chart component)
3. When both P1 stories complete:
   - Developer A or C: User Story 3 (Responsive styling)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies - safe to run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- No tests included per spec (not explicitly requested)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Database is read-only for frontend (no mutation tasks needed)
- All SQL queries use better-sqlite3 synchronous API
- Page size is 20 properties (configurable via constant)
