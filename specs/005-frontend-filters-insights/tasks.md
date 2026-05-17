# Tasks: Frontend Filters, Sorting & Insights

**Input**: Design documents from `/specs/005-frontend-filters-insights/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Test tasks are included as this is a frontend feature with clear testing requirements from the spec.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/` directory for Next.js application
- Paths reference existing Feature 004 structure being extended

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for new components

- [ ] T001 [P] Create `frontend/hooks/` directory for custom React hooks
- [ ] T002 [P] Create `frontend/components/` subdirectories if not exist
- [ ] T003 [P] Verify existing TypeScript types file at `frontend/types/property.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Type Definitions (All Stories Depend On These)

- [ ] T004 Update `frontend/types/property.ts` - Add FilterState interface with priceMin, priceMax, location, bedroomsMin, bedroomsMax, hasPriceChange fields
- [ ] T005 [P] Update `frontend/types/property.ts` - Add SortOption interface with field and direction
- [ ] T006 [P] Update `frontend/types/property.ts` - Add PriceChangeInfo interface with amount, percentage, direction, changedAt
- [ ] T007 [P] Update `frontend/types/property.ts` - Add InsightStats and PriceBucket interfaces

### URL State Management Hook (All Stories Depend On This)

- [ ] T008 Implement `frontend/hooks/useFilters.ts` - Custom hook for URL query param synchronization with FilterState

### Database Query Update

- [ ] T009 Update `frontend/lib/db.ts` - Modify property query to JOIN with latest price_history record for each property

**Checkpoint**: Foundation ready - type definitions, URL state hook, and database query updated. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Filter Properties by Criteria (Priority: P1) 🎯 MVP

**Goal**: Allow users to filter property list by price range, location, bedrooms, and price change status

**Independent Test**: Navigate to property list, apply price filter (100k-200k), verify only matching properties display. Clear filters, verify all properties return. Test multiple filters together with AND logic.

### Implementation for User Story 1

- [ ] T010 [P] Create `frontend/lib/filters.ts` - Implement filter logic utilities (matchesPriceRange, matchesLocation, matchesBedrooms, hasPriceChange)
- [ ] T011 [US1] Create `frontend/components/FilterPanel.tsx` - Filter UI with price range inputs, location multi-select, bedroom range inputs, price change checkbox
- [ ] T012 [US1] Update `frontend/app/page.tsx` - Integrate FilterPanel with useFilters hook and filter application logic
- [ ] T013 [US1] Create empty state component for `frontend/components/EmptyState.tsx` - Display when no properties match filters
- [ ] T014 [US1] Add "Clear All" button to FilterPanel component in `frontend/components/FilterPanel.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Filters work, clear button works, empty state displays correctly.

---

## Phase 4: User Story 2 - Sort Properties by Different Criteria (Priority: P1)

**Goal**: Allow users to sort property list by price, date added, and price change

**Independent Test**: With properties displayed, select "Price: Low to High" - verify list reorders. Switch to "Newest First" - verify ordering changes. Apply filters then change sort - verify sort works on filtered subset.

### Implementation for User Story 2

- [ ] T015 [P] Create `frontend/lib/sorting.ts` - Implement sort utilities (byPriceAsc, byPriceDesc, byDateDesc, byPriceChange)
- [ ] T016 [US2] Create `frontend/components/SortDropdown.tsx` - Dropdown UI for sort options with labels
- [ ] T017 [US2] Update `frontend/app/page.tsx` - Integrate SortDropdown with sorting logic and combine with existing filters
- [ ] T018 [US2] Ensure sort state persists in URL via useFilters hook extension in `frontend/hooks/useFilters.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can filter AND sort together.

---

## Phase 5: User Story 3 - View Property Images in List (Priority: P2)

**Goal**: Display thumbnail images for properties in the list view with placeholder fallback

**Independent Test**: View property list - properties with images show thumbnails, properties without images show placeholder. Resize browser window - images scale without breaking layout.

### Implementation for User Story 3

- [ ] T019 [P] Create `frontend/components/ImageThumbnail.tsx` - Lazy-loaded image component using Next.js Image with blur placeholder
- [ ] T020 [P] Create placeholder SVG or icon for missing images in `frontend/components/ImageThumbnail.tsx`
- [ ] T021 [US3] Update `frontend/components/PropertyCard.tsx` - Integrate ImageThumbnail component into property card layout
- [ ] T022 [US3] Add responsive image sizing with Tailwind classes in `frontend/components/PropertyCard.tsx`
- [ ] T023 [US3] Add error handling for broken image URLs in `frontend/components/ImageThumbnail.tsx`

**Checkpoint**: At this point, User Story 3 works independently. Property cards show images/placeholders responsively.

---

## Phase 6: User Story 4 - View Price Change Indicators (Priority: P2)

**Goal**: Display price change indicators (green ↓ for drops, red ↑ for increases) on property cards

**Independent Test**: View property list - properties with price decreases show green downward arrow, increases show red upward arrow, no indicator if no history. Indicator appears smaller than price text.

### Implementation for User Story 4

- [ ] T024 [P] Create `frontend/components/PriceChange.tsx` - Price change indicator component with color-coded arrows (green ↓, red ↑)
- [ ] T025 [P] Implement price change calculation logic in `frontend/lib/utils.ts` - Calculate percentage from current price and price history
- [ ] T026 [US4] Update `frontend/components/PropertyCard.tsx` - Integrate PriceChange component next to price display
- [ ] T027 [US4] Style PriceChange component smaller than price text using Tailwind in `frontend/components/PriceChange.tsx`
- [ ] T028 [US4] Add tooltip showing change date on hover in `frontend/components/PriceChange.tsx`

**Checkpoint**: At this point, User Story 4 works independently. Price change indicators display correctly with proper colors and sizing.

---

## Phase 7: User Story 5 - View Insights Dashboard (Priority: P3)

**Goal**: Create insights page showing statistics for currently filtered property set

**Independent Test**: Apply filters on main page, click "View Insights", verify stats match filtered subset (count, avg price, range). Modify filters on insights page, stats update. Navigate back to list, filters persist.

### Implementation for User Story 5

- [ ] T029 [P] Create `frontend/lib/stats.ts` - Statistics calculation utilities (calculateAvgPrice, calculatePriceRange, calculateAvgPriceChange, generatePriceBuckets)
- [ ] T030 [P] Create `frontend/components/StatsCard.tsx` - Individual stat display component in `frontend/components/StatsCard.tsx`
- [ ] T031 [P] Create `frontend/components/InsightsChart.tsx` - Price distribution histogram using Recharts in `frontend/components/InsightsChart.tsx`
- [ ] T032 [US5] Create `frontend/app/insights/page.tsx` - Insights page with stats cards and chart
- [ ] T033 [US5] Add FilterPanel to insights page in `frontend/app/insights/page.tsx` for filter modification
- [ ] T034 [US5] Add "View Insights" button to main page in `frontend/app/page.tsx`
- [ ] T035 [US5] Ensure filter/sort state persists between list and insights pages via URL in `frontend/hooks/useFilters.ts`

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T036 [P] Update `frontend/app/layout.tsx` - Add any shared providers if needed
- [ ] T037 [P] Verify mobile responsiveness across all components with Tailwind breakpoints
- [ ] T038 [P] Add keyboard navigation and ARIA labels to FilterPanel and SortDropdown
- [ ] T039 [P] Code cleanup and remove any debug console.log statements
- [ ] T040 [P] Run quickstart.md validation - test all user flows
- [ ] T041 Update `AGENTS.md` reference if needed after implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
  - Type definitions must be complete before any component work
  - useFilters hook must work before filter/sort features
  - Database query must return price history before price change indicators
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Filters**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1) - Sort**: Can start after Foundational (Phase 2) - Integrates with US1 filters but can be tested independently
- **User Story 3 (P2) - Images**: Can start after Foundational (Phase 2) - No dependencies, purely visual enhancement
- **User Story 4 (P2) - Price Changes**: Can start after Foundational (Phase 2) - Depends on price history data from DB query, can integrate with US3 PropertyCard
- **User Story 5 (P3) - Insights**: Can start after Foundational (Phase 2) - Depends on filter state from US1, reuses stats logic

### Within Each User Story

- Models/utils before components
- Components before page integration
- Core implementation before polish (tooltips, error handling)
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (T001-T003) can run in parallel
- All type definition updates (T004-T007) can run in parallel
- Filter logic lib and Sort logic lib (T010, T015) can run in parallel
- ImageThumbnail and PriceChange components (T019, T024) can run in parallel
- Stats utilities and StatsCard (T029, T030) can run in parallel
- Once Foundational phase completes, US1 and US2 can be worked on in parallel (different concerns)
- US3 (images) and US4 (price changes) can be worked on in parallel after Foundational

---

## Parallel Example: User Story 1 (Filter Properties)

```bash
# Launch filter logic and FilterPanel in parallel:
Task: "Create frontend/lib/filters.ts - Implement filter logic utilities"
Task: "Create frontend/components/FilterPanel.tsx - Filter UI component"

# After both complete:
Task: "Update frontend/app/page.tsx - Integrate FilterPanel with useFilters hook"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Filters)
4. **STOP and VALIDATE**: Test filtering independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Filters) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Sort) → Test independently → Deploy/Demo
4. Add User Story 3 (Images) → Test independently → Deploy/Demo
5. Add User Story 4 (Price Changes) → Test independently → Deploy/Demo
6. Add User Story 5 (Insights) → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Filters) + User Story 2 (Sort)
   - Developer B: User Story 3 (Images) + User Story 4 (Price Changes)
   - Developer C: User Story 5 (Insights)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All file paths reference the existing `frontend/` directory structure from Feature 004
- URL-based state management enables shareable filtered views and cross-page persistence
- Client-side filtering provides instant feedback for datasets under 1000 properties
