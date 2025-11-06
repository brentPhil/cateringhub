# Role System Migration Checklist

Single source of truth for roles: `lib/roles.ts`

- [x] Add `lib/roles.ts` with ProviderRole type, values, Zod schemas, hierarchy, and legacy mapping.

## Server APIs

- [x] app/api/providers/[providerId]/members/[memberId]/role/route.ts — Use schema/ROLE_HIERARCHY and allow 'supervisor'.
- [x] app/api/providers/[providerId]/members/[memberId]/status/route.ts — Align type imports and hierarchy.
- [x] app/api/providers/[providerId]/members/[memberId]/route.ts — Replace manager hierarchy, keep safeguards.
- [x] app/api/providers/[providerId]/teams/route.ts — Restrict create to owner/admin.
- [x] app/api/providers/[providerId]/teams/[teamId]/route.ts — Restrict update/delete to owner/admin; add permanent delete path.
- [x] app/api/providers/[providerId]/bookings/[bookingId]/team/route.ts — Update comment to owner/admin; (logic uses capabilities).
- [x] app/api/providers/[providerId]/bookings/route.ts — Update comments referencing manager.
- [x] app/api/providers/[providerId]/invitations/route.ts — Update hierarchy to include supervisor.

## Server libs

- [x] lib/api/membership.ts — Replace inline roleHierarchy and capability math with imports from `lib/roles.ts` (ROLE_HIERARCHY, ProviderRole).
- [x] lib/api/validation.ts — Use ProviderRoleSchema / mapLegacyProviderRole for role validation.

## Client: Team management

- [x] app/(provider)/dashboard/team/components/invite-member-modal.tsx — Zod role enum from values (now includes supervisor).
- [x] app/(provider)/dashboard/team/components/add-staff-modal.tsx — Zod role enum from values (now includes supervisor).
- [x] app/(provider)/dashboard/team/components/edit-role-drawer.tsx — Zod role enum from values (now includes supervisor).
- [x] app/(provider)/dashboard/team/lib/team-utils.ts — Replace manager with supervisor, update available roles and permissions.
- [x] app/(provider)/dashboard/team/page.tsx — Filter options use supervisor.

## Client: Teams

- [x] app/(provider)/dashboard/teams/components/create-team-dialog.tsx — Replace local union role types with `ProviderRole`; remove references to 'manager' in types.
- [x] app/(provider)/dashboard/teams/components/view-team-members-drawer.tsx — Replace local union role types with `ProviderRole`.
- [x] app/(provider)/dashboard/teams/components/team-members-inline.tsx — Replace local union role types with `ProviderRole`.

## Client: Bookings & Shifts

- [x] app/(provider)/dashboard/bookings/actions/shifts.ts — Replace remaining roleHierarchy blocks and texts to owner/admin/supervisor; import ROLE_HIERARCHY.
- [x] app/(provider)/dashboard/bookings/[bookingId]/components/notes-activity-card.tsx — Update any hard-coded "Manager" labels.

## Client: Profile & Social Links

- [x] app/(provider)/dashboard/profile/actions/service-locations.ts — Replace manager checks with ROLE_HIERARCHY and admin-only gates aligned with RLS.
- [x] app/(provider)/dashboard/profile/actions/social-links.ts — Replace manager checks with admin-only gates.

## Types & Generation

- [ ] types/supabase.ts — Regenerate after DB changes (requires `supabase login`).
  - macOS/Linux: `npx supabase gen types typescript --project-id ghfnyprmnluutpcacdjp > types/supabase.ts`
  - Windows PowerShell: `npx supabase gen types typescript --project-id ghfnyprmnluutpcacdjp | Out-File -Encoding utf8 -FilePath types/supabase.ts`

## Notes

- The runtime role values and Zod enums are centralized in `lib/roles.ts` to avoid duplication across client/server.
- Legacy 'manager' input is temporarily mapped to 'supervisor' by `mapLegacyProviderRole()`.
- Server-side RLS has been updated to make provider-wide permissions admin+; supervisors are team-scoped.

## Seeds & Docs

- [x] supabase/seed.sql — Replace manager user/role with additional admin to match current role model.
- [x] AUDIT_EXECUTIVE_SUMMARY.md — Update role hierarchy text to use supervisor.
- [ ] Other migration/docs mentioning manager kept for historical context; update on demand.
