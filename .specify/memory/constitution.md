<!--
  # Sync Impact Report

  ## Version Change
  v0.0.0 → v1.0.0

  ## Modified Principles
  - No prior principles; all five are newly added.

  ## Added Sections
  - I. Code Quality
  - II. Testing Standards
  - III. User Experience (UX) Consistency
  - IV. Performance Requirements
  - V. Simplicity
  - Development Workflow

  ## Removed Sections
  - None

  ## Templates Requiring Updates
  - ✅ .specify/templates/constitution-template.md (aligned via direct review)
  - ✅ .specify/templates/plan-template.md (no outdated references to principles; "Constitution Check" gate wording preserved)
  - ✅ .specify/templates/spec-template.md (up to date; no stale principle references)
  - ✅ .specify/templates/tasks-template.md (task discipline/categorization already reflects testing and quality; no stale references)
  - ✅ AGENTS.md (reviewed; no principle references)

  ## Follow-up TODOs
  - RATIFICATION_DATE marked as 2025-05-08 derived from initial commit date. Confirm if that matches the intended project ratification date.
  - LAST_AMENDED_DATE set to 2026-05-10.
-->

# idalista-tracker Constitution

## Core Principles

### I. Code Quality

All source code MUST adhere to consistent linting and formatting rules enforced at build and pre-commit time. Code reviews MUST verify that linting passes and formatting is applied before approval. Complexity (cyclomatic or cognitive) MUST be justified and documented when it cannot be reasonably reduced. Dependency on third-party code must be actively maintained with automated supply-chain checks and updates.

**Rationale**: Consistent, clean code reduces cognitive load and defect rates. Enforced standards prevent style debates and tech-debt accumulation.

### II. Testing Standards

Every change that affects user-visible behavior MUST be accompanied by automated tests that fail before the change and pass after. Unit tests MUST run independently and deterministically. Integration tests MUST cover inter-service and data-contract boundaries. End-to-end tests MUST exercise the primary user journeys for each feature. Flaky tests MUST be treated as production defects and fixed immediately.

**Rationale**: Reliable test coverage prevents regressions, documents expected behavior, and enables safe refactoring.

### III. User Experience (UX) Consistency

All user-facing features MUST present consistent interaction patterns, visual structure, and terminology. Changes that alter UI/UX MUST include acceptance criteria that verify consistency against the existing design system. Error messages MUST be user-facing, clear, and actionable. Accessibility requirements (e.g., keyboard navigation, screen reader support, contrast) MUST be met by all new and changed UI.

**Rationale**: Consistency builds trust and reduces user learning cost. Inclusive design expands the user base and reduces support burden.

### IV. Performance Requirements

All features MUST meet the performance budget set in the implementation plan or nearest compatible benchmark. Response time: p95 server / UI initial load MUST stay under declared thresholds (e.g., 200ms for API calls, 3s for initial page load). Resource usage: memory and CPU utilization MUST remain within documented limits under expected load. Performance regression MUST be treated as a deploy blocker.

**Rationale**: Users expect responsiveness; performance is a feature. Introducing a budget early preserves user trust and simplifies optimization.

### V. Simplicity

Prefer simple, maintainable solutions over clever, complex ones. Every feature, library, or abstraction MUST have a clear, necessary purpose. If a simpler approach solves the same problem with less risk and maintenance burden, the simpler approach MUST be chosen unless explicitly justified in the implementation plan.

**Rationale**: Complexity is the enemy of correctness. Simplicity accelerates onboarding, testing, and future change.

## Development Workflow

All work follows the standard Speckit workflow:
1. Specification → Plan → Tasks → Implement → Validate.
2. The Constitution Check MUST pass before implementation begins and MUST be re-verified before delivery.
3. Every feature branch MUST have tests corresponding to the spec's user stories.
4. Complexity that exceeds a single service or module MUST be justified in the implementation plan and documented in the architecture decision record.

## Governance

- This constitution supersedes all other practices, style guides, and conventions within the project, including ad-hoc decisions captured in PR comments or chat tools. Exceptions MUST be proposed as amendments.
- Amending the constitution requires at least one explicit human reviewer approval; the reviewer MUST be trusted for the affected area.
- Amendments MUST include an updated version number, a change summary, and an assessment of whether a migration plan is needed.
- Compliance is reviewed at each feature boundary (plan, implement, validate). Features MUST NOT skip the Constitution Check.

**Version**: v1.0.0 | **Ratified**: 2025-05-08 | **Last Amended**: 2026-05-10