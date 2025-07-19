# CateringHub Rebuild Plan

## Legacy Feature Map

**Pages & Routes**
- `/` (Landing page)
- `/home`
- `/login`
- `/signup`
- `/dashboard`
- `/dashboard/settings`
- `/dashboard/notifications`
- `/dashboard/users`
- `/dashboard/products`
- `/provider/dashboard`
- `/provider/dashboard/profile`
- `/onboarding/provider`
- `/onboarding/provider/flow`
- `/auth/error`
- API routes: `/auth/callback`, `/auth/confirm`

**Data-Fetching Hooks**
- `use-auth` suite (user, signOut, userRole)
- `use-supabase-query`
- `use-provider-onboarding`
- `use-onboarding-form`
- `use-notifications`
- `use-mobile`

**Supabase Integration**
- `lib/supabase/client.ts` & `server.ts`
- Middleware for session sync (`/middleware.ts`)
- SQL migrations under `supabase/migrations`

**UI Components & Patterns**
- Shadcn-based components in `components/ui`
- Reusable form steps under `components/onboarding`
- `LandingNavigation`, `ProviderHeader`, `RoleGuard`
- Admin utilities like `OnboardingMonitor`


## Phase 0 — Audit & Plan
**Objective:** Capture legacy functionality and identify technical debt.

### Task Checklist
1. Catalogue all pages and routes from the legacy repo.
2. Document hooks and utilities (auth, onboarding, notifications, query-state).
3. Map Supabase schema, migrations and RLS policies.
4. Note UI component library usage (Shadcn-based components).
5. Identify current folder layout and naming conventions.
6. Capture environment variables and middleware logic.
7. Outline missing or mock features (e.g. notifications, products list).

### Deliverables
- REBUILD_PLAN.md (this document)
- Summary of legacy features and tech stack.

### Risk / Dependency Notes
- Supabase schema must be accessible for new project.
- OAuth setup requires keys for Google and Facebook.

### Definition of Done
- Team confirms that the plan covers every feature listed in the legacy code.

## Phase 1 — Core Architecture
**Objective:** Establish baseline Next.js/TypeScript project with agreed conventions.**

### Task Checklist
1. Setup folder structure: `app/`, `components/`, `hooks/`, `lib/`, `types/`.
2. Configure ESLint and Prettier with strict TypeScript options (`noImplicitAny`, `strictNullChecks`).
3. Add global providers: QueryProvider (TanStack Query) and Theme provider.
4. Implement base layout with global styles (`globals.css`).
5. Configure Supabase environment variables in `.env.local`.
6. Add middleware for session sync (see `middleware.ts`).
7. Commit sample page and CI lint workflow.

### Deliverables
- Base Next.js app shell with linting.
- Documentation for environment setup.

### Risk / Dependency Notes
- Need design approval for global styles and theme.
- CI environment must have Supabase keys for integration tests.

### Definition of Done
- `pnpm lint` passes.
- App renders with QueryProvider and theme provider without errors.

## Phase 2 — Data Layer
**Objective:** Integrate Supabase and base data fetching utilities.**

### Task Checklist
1. Create `lib/supabase/client.ts` and `lib/supabase/server.ts` (use legacy implementation).
2. Port generic hooks from `use-supabase-query.ts` for CRUD operations.
3. Implement `use-auth` hook suite (user, role, signOut, refreshSession).
4. Add QueryProvider to `_app` and configure React Query Devtools in dev.
5. Define TypeScript types under `types/` using generated Supabase types.
6. Document how to extend hooks for new tables.

### Deliverables
- Supabase client utilities.
- Auth hooks with role decoding.
- README section on Supabase setup.

### Risk / Dependency Notes
- Requires Supabase project with same schema (see migrations).
- JWT claim logic must match RLS policies.

### Definition of Done
- Hooks compile under strict TS settings and basic auth flow works (login/logout).

## Phase 3 — Essential Pages
**Objective:** Rebuild public pages and authentication flows.**

### Task Checklist
1. Home and landing pages (`/` and `/home`).
2. Login & signup pages with OAuth buttons and error handling.
3. Auth callback & confirm routes using Next.js API routes.
4. Global navigation component (`LandingNavigation`).
5. Middleware redirect logic for authenticated vs public routes.
6. Basic dashboard shell displaying user info.

### Deliverables
- Working login/signup flow connected to Supabase.
- Initial dashboard accessible after sign in.
- Cypress/Playwright smoke tests for auth flow.

### Risk / Dependency Notes
- OAuth redirect URLs must be configured in Supabase.
- Accessibility audits required for forms.

### Definition of Done
- Users can sign up, confirm email and log in.
- Dashboard shows profile name and role from Supabase.

## Phase 4 — Feature Modules
**Objective:** Port advanced modules (onboarding, provider dashboard, admin tools).**

### Task Checklist
1. Provider onboarding multi‑step form with local storage recovery (`use-onboarding-form`).
2. Catering provider profile creation (`use-provider-onboarding` hooks).
3. Provider dashboard pages (`/provider/dashboard`, `/provider/dashboard/profile`).
4. User management table for admins (`/dashboard/users`).
5. Settings page with profile edit form and role permission tab.
6. Notifications list (placeholder data initially).
7. Products page demonstrating pagination & URL state hooks.
8. Reusable RoleGuard components for access control.

### Deliverables
- All major pages and components ported with strict TypeScript.
- Unit tests for hooks and forms.
- Storybook stories for UI components if time allows.

### Risk / Dependency Notes
- Supabase storage buckets needed for logo/menu uploads.
- Some features (notifications, products) rely on future backend tables.

### Definition of Done
- All legacy pages accessible with no functional regressions.
- Form validations and state persistence work as in legacy app.

## Phase 5 — Testing & Hardening
**Objective:** Ensure quality via automated tests and performance tuning.**

### Task Checklist
1. Add Jest + React Testing Library for unit tests.
2. Configure Playwright for end‑to‑end scenarios (auth, onboarding flow).
3. Write integration tests for Supabase CRUD operations using test database.
4. Set up GitHub Actions to run lint, type‑check and tests.
5. Measure bundle size and optimize code‑splitting (lazy loaded steps, etc.).
6. Audit accessibility with `axe-core` in tests.

### Deliverables
- Passing CI pipeline with lint, type‑check and test jobs.
- Test coverage report (target ≥80%).
- Performance metrics recorded (page load, lighthouse score).

### Risk / Dependency Notes
- Playwright tests require seeded Supabase project.
- Coverage may be lower until backend tables are fully implemented.

### Definition of Done
- CI green on main branch; lighthouse performance score ≥90 on key pages.

## Phase 6 — Docs & Handoff
**Objective:** Finalize documentation and onboarding materials.**

### Task Checklist
1. Update `README.md` with setup instructions and development commands.
2. Include diagrams of folder structure and data flow.
3. Document Supabase schema migrations and RLS policies.
4. Provide guide on URL state management (nuqs) and query hooks.
5. Prepare progress tracking table and success metrics for stakeholders.

### Deliverables
- Complete project README and docs in `docs/` folder.
- Architecture diagram (mermaid or image).
- Final demo link / deployment instructions.

### Risk / Dependency Notes
- Ensure secrets are excluded from repo before handoff.

### Definition of Done
- New developers can clone repo, run `pnpm dev` and follow docs to contribute.

## Recommended Design Patterns & Tech Choices
- **State Management:** TanStack Query for server data. React Hook Form for forms. Minimal use of React context.
- **Folder Structure:**
  - `app/` – Next.js route segments.
  - `components/` – shared components (`ui/`, `admin/`, etc.).
  - `hooks/` – custom hooks (auth, onboarding, query helpers).
  - `lib/` – utilities (supabase client, constants, providers).
  - `types/` – centralized TypeScript types.
- **Naming Conventions:** kebab‑case for files, PascalCase for React components.
- **Linting/Formatting:** ESLint with `eslint-config-next` and Prettier.
- **Testing Approach:** Unit tests for hooks/components, integration tests for Supabase queries, Playwright for E2E.

## Workload Estimate
| Phase | Task | Effort (points) | Resources |
|------|------|------|-----------|
|0|Audit legacy repo|3|dev
|1|Core architecture setup|5|dev, designer
|2|Data layer integration|8|dev
|3|Auth & essential pages|8|dev, QA
|4|Feature modules port|13|dev, designer
|5|Testing & hardening|8|dev, QA
|6|Docs & handoff|3|dev

*1 point ≈ 0.5 day of focused work*

## Progress Tracking
| Phase | Task | Owner | Status | ETA |
|------|------|------|------|------|
|0|Audit repo & create plan|TBD|Done|--|
|1|Set up architecture|TBD|Pending|--|
|2|Integrate data layer|TBD|Pending|--|
|3|Rebuild auth pages|TBD|Pending|--|
|4|Port feature modules|TBD|Pending|--|
|5|Implement tests|TBD|Pending|--|
|6|Finalize docs|TBD|Pending|--|

## Success Metrics
- **Performance:** Home and dashboard pages <1s TTI on broadband (90+ Lighthouse score).
- **Reliability:** <1% error rate on Supabase requests during tests.
- **Test Coverage:** ≥80% unit/integration coverage; 100% critical path E2E tests.
- **Accessibility:** No serious `axe-core` violations on pages.

