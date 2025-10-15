# Provider Team Management - Quick Reference Guide

## Role Hierarchy

```
owner > admin > manager > staff > viewer
  1       2        3        4       5
```

### Role Permissions

| Action | Owner | Admin | Manager | Staff | Viewer |
|--------|-------|-------|---------|-------|--------|
| View provider details | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update provider details | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete provider | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add team members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove team members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Send invitations | ✅ | ✅ | ❌ | ❌ | ❌ |
| View all bookings | ✅ | ✅ | ✅ | ❌ | ❌ |
| View assigned bookings | ✅ | ✅ | ✅ | ✅ | ❌ |
| Assign bookings | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update any booking | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update assigned booking | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete bookings | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Database Schema

### Tables

```
providers
├── provider_members (team membership)
├── provider_invitations (pending invites)
└── bookings (with assigned_to field)
```

### Key Relationships

```sql
-- One provider can have many members
providers (1) ──< (N) provider_members

-- One provider can have many invitations
providers (1) ──< (N) provider_invitations

-- One provider can have many bookings
providers (1) ──< (N) bookings

-- One user can be assigned to many bookings
auth.users (1) ──< (N) bookings.assigned_to
```

---

## Common Queries

### Get User's Providers
```sql
SELECT p.*
FROM providers p
JOIN provider_members pm ON p.id = pm.provider_id
WHERE pm.user_id = auth.uid()
  AND pm.status = 'active';
```

### Get Team Members
```sql
SELECT 
  u.email,
  pm.role,
  pm.status,
  pm.joined_at
FROM provider_members pm
JOIN auth.users u ON pm.user_id = u.id
WHERE pm.provider_id = :provider_id
ORDER BY 
  CASE pm.role
    WHEN 'owner' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'manager' THEN 3
    WHEN 'staff' THEN 4
    WHEN 'viewer' THEN 5
  END;
```

### Get Staff Member's Assigned Bookings
```sql
SELECT *
FROM bookings
WHERE provider_id = :provider_id
  AND assigned_to = auth.uid()
  AND status IN ('pending', 'confirmed', 'in_progress')
ORDER BY event_date;
```

### Get Unassigned Bookings
```sql
SELECT *
FROM bookings
WHERE provider_id = :provider_id
  AND assigned_to IS NULL
  AND status = 'pending'
ORDER BY created_at;
```

### Check User's Role in Provider
```sql
SELECT role
FROM provider_members
WHERE provider_id = :provider_id
  AND user_id = auth.uid()
  AND status = 'active';
```

### Check if User Has Minimum Role
```sql
SELECT is_provider_member(
  :provider_id,
  auth.uid(),
  'manager'  -- minimum required role
);
```

---

## API Patterns (for Phase 2)

### Create Provider
```typescript
const { data, error } = await supabase
  .from('providers')
  .insert({
    name: 'My Catering Business',
    description: 'Professional catering services',
    catering_provider_id: cateringProviderId
  })
  .select()
  .single();

// Creator is automatically added as owner via trigger
```

### Invite Team Member
```typescript
const token = crypto.randomUUID(); // or use crypto.randomBytes(32).toString('hex')

const { data, error } = await supabase
  .from('provider_invitations')
  .insert({
    provider_id: providerId,
    email: 'newmember@example.com',
    role: 'staff',
    invited_by: currentUserId,
    token: token,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });

// Send invitation email with token
```

### Accept Invitation
```typescript
// 1. Verify token and get invitation
const { data: invitation } = await supabase
  .from('provider_invitations')
  .select('*')
  .eq('token', token)
  .eq('email', userEmail)
  .is('accepted_at', null)
  .gt('expires_at', new Date().toISOString())
  .single();

// 2. Create membership
const { data: member } = await supabase
  .from('provider_members')
  .insert({
    provider_id: invitation.provider_id,
    user_id: currentUserId,
    role: invitation.role,
    status: 'active',
    invited_by: invitation.invited_by,
    invited_at: invitation.created_at,
    joined_at: new Date().toISOString()
  });

// 3. Mark invitation as accepted
await supabase
  .from('provider_invitations')
  .update({ accepted_at: new Date().toISOString() })
  .eq('id', invitation.id);
```

### Assign Booking to Staff
```typescript
const { data, error } = await supabase
  .from('bookings')
  .update({ assigned_to: staffUserId })
  .eq('id', bookingId)
  .eq('provider_id', providerId);
```

### Get Bookings (respects RLS)
```typescript
// Managers see all bookings
// Staff see only their assigned bookings
const { data: bookings } = await supabase
  .from('bookings')
  .select(`
    *,
    assigned_user:assigned_to(email, full_name)
  `)
  .eq('provider_id', providerId)
  .order('event_date');
```

---

## Helper Functions

### `is_provider_member(provider_id, user_id, min_role)`
Check if user has at least the specified role in a provider.

```sql
-- Check if user is at least a manager
SELECT is_provider_member(
  '123e4567-e89b-12d3-a456-426614174000',  -- provider_id
  auth.uid(),                               -- user_id (optional, defaults to auth.uid())
  'manager'                                 -- min_role (optional, defaults to 'viewer')
);
```

**Returns:** `BOOLEAN`

**Role Hierarchy:**
- `owner` (1) - highest privilege
- `admin` (2)
- `manager` (3)
- `staff` (4)
- `viewer` (5) - lowest privilege

---

## Enums

### `provider_role`
```sql
'owner' | 'admin' | 'manager' | 'staff' | 'viewer'
```

### `provider_member_status`
```sql
'pending' | 'active' | 'suspended'
```

### `booking_status`
```sql
'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
```

---

## Security Notes

### RLS is Enabled
All tables have Row Level Security enabled. Queries automatically filter based on:
- User's membership in the provider
- User's role level
- Booking assignment (for staff)

### Safe Operations
These operations are automatically secured by RLS:
- ✅ Viewing provider data (must be a member)
- ✅ Viewing team members (must be a member)
- ✅ Adding members (must be admin+)
- ✅ Viewing bookings (role-based access)
- ✅ Assigning bookings (must be manager+)

### Bypass RLS (Service Role Only)
```typescript
// Use service role key for admin operations
const supabaseAdmin = createClient(url, serviceRoleKey);

// This bypasses RLS - use with caution!
const { data } = await supabaseAdmin
  .from('provider_members')
  .select('*');
```

---

## Testing

### Test as Different Users
```sql
-- Simulate different users in SQL
SET request.jwt.claims.sub = 'user-uuid-here';

-- Now queries will run as that user
SELECT * FROM bookings;
```

### Verify RLS Policies
```sql
-- Should return only bookings visible to current user
SELECT * FROM bookings;

-- Should fail if user is not admin
INSERT INTO provider_members (provider_id, user_id, role, status)
VALUES (:provider_id, :new_user_id, 'staff', 'active');
```

---

## Migration Files

1. `20251015000001_create_provider_team_management_schema.sql`
2. `20251015000002_create_provider_team_rls_policies.sql`
3. `20251015000003_create_provider_auto_owner_trigger.sql`
4. `20251015000004_fix_provider_auto_owner_trigger.sql`
5. `20251015000005_create_bookings_with_assignment_tracking.sql`

---

## Seed Data

Run seed script to populate test data:
```bash
psql -f supabase/seed.sql
```

Or via Supabase SQL Editor:
```sql
-- Copy contents of supabase/seed.sql and execute
```

---

## Troubleshooting

### "Permission denied" errors
- Check user is a member: `SELECT * FROM provider_members WHERE user_id = auth.uid()`
- Check user's role: `SELECT role FROM provider_members WHERE provider_id = :id AND user_id = auth.uid()`
- Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'bookings'`

### Staff can't see bookings
- Verify booking is assigned: `SELECT assigned_to FROM bookings WHERE id = :id`
- Check staff membership: `SELECT * FROM provider_members WHERE user_id = :staff_id`

### Invitation not working
- Check expiration: `SELECT expires_at FROM provider_invitations WHERE token = :token`
- Verify email matches: `SELECT email FROM provider_invitations WHERE token = :token`
- Check not already accepted: `SELECT accepted_at FROM provider_invitations WHERE token = :token`

---

## Best Practices

1. **Always use RLS** - Don't bypass with service role unless absolutely necessary
2. **Check roles before UI actions** - Use `is_provider_member()` to show/hide features
3. **Validate on backend** - RLS is the final security layer, but validate in API too
4. **Use transactions** - When creating invitations + sending emails
5. **Clean up expired invitations** - Run periodic cleanup job
6. **Audit trail** - Log important actions (member added/removed, role changes)
7. **Test with different roles** - Verify each role sees appropriate data

---

## Resources

- [Full Documentation](./provider-team-management-phase1.md)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Enums](https://www.postgresql.org/docs/current/datatype-enum.html)

