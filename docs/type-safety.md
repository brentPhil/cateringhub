# Type-safety sources audit

This repository currently relies on a single generated source for backend → frontend types:

- `types/supabase.ts` is generated via the Supabase CLI (`pnpm gen:types`) and exposes the `Database`, `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, and related helper utilities for runtime clients.
- API routes, React hooks, and server utilities consistently import their database types from `@/types/supabase` (for example, booking-related hooks and table components, membership utilities, and auth handlers).

Other type definition files (`types/api.types.ts`, `types/form.types.ts`, `types/query.types.ts`, `types/ui.types.ts`, and the provincial/municipal ambient declaration) cover UI and helper concerns only and do not redefine Supabase table models. There are no alternate generators or duplicated database models present in the codebase at this time.

To keep `types/supabase.ts` authoritative going forward:

1. Continue generating it with `pnpm gen:types` after schema changes.
2. When new code needs database shapes, import from `@/types/supabase` rather than creating manual table interfaces.
3. Remove or refactor any future manual table-shaped types to reference the Supabase-generated helpers instead.
