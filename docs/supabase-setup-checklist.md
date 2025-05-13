# Supabase Setup Checklist for CateringHub

**Status: Core Setup Complete** (Last updated: May 10, 2025)

Use this checklist to track your progress in setting up Supabase for the CateringHub project. The core setup has been completed, including database schema, authentication, and role-based access control.

## Initial Setup

- [x] Install required Supabase packages
- [x] Set up Supabase client configuration
- [x] Create database schema SQL file
- [x] Implement authentication components
- [x] Set up protected routes and dashboard layout

## Supabase Dashboard Configuration

- [x] Run the database schema SQL in Supabase SQL Editor
  - Go to Supabase Dashboard > SQL Editor
  - Create a new query
  - Paste the contents of `supabase/schema.sql`
  - Run the query

- [x] Configure Authentication Settings
  - [x] Go to Authentication > Settings
  - [x] Set Site URL to your production URL (or http://localhost:3000 for development)
  - [x] Configure redirect URLs (add http://localhost:3000/auth/callback)
  - [x] Enable Email provider if not already enabled

- [x] Update Email Templates
  - [x] Go to Authentication > Email Templates
  - [x] Edit the "Confirm signup" template
  - [x] Change `{{ .ConfirmationURL }}` to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`

- [x] Set Up Auth Hooks for Custom Claims
  - [x] Go to Authentication > Hooks
  - [x] For "Custom Access Token", select the function `custom_access_token_hook`

## User Management

- [x] Create Admin User
  ```sql
  -- First, find the user's UUID
  SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com';

  -- Then, make them an admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES ('user-uuid-here', 'admin');
  ```

- [x] Create Superadmin User
  ```sql
  -- First, find the user's UUID
  SELECT id FROM auth.users WHERE email = 'your-superadmin-email@example.com';

  -- Then, make them a superadmin
  INSERT INTO public.user_roles (user_id, role)
  VALUES ('user-uuid-here', 'superadmin');
  ```

  Note: A superadmin user (brentagetrophil@gmail.com) has been created successfully.

## Testing

- [ ] Test Signup Flow
  - [ ] Register a new user
  - [ ] Confirm email
  - [ ] Verify user is created in the database

- [ ] Test Login Flow
  - [ ] Log in with created user
  - [ ] Verify redirect to dashboard
  - [ ] Check that user information is displayed correctly

- [ ] Test Role-Based Access
  - [ ] Verify regular users can't access admin pages
  - [ ] Verify admins can access user management
  - [ ] Verify superadmins can access all features

## Additional Configuration

- [ ] Set Up Storage Buckets (if needed)
  - [ ] Go to Storage in Supabase dashboard
  - [ ] Create a new bucket for user avatars
  - [ ] Configure bucket permissions

- [ ] Configure Row Level Security for Storage
  - [ ] Set appropriate policies for avatar uploads

- [ ] Set Up Database Webhooks (if needed)
  - [ ] Configure webhooks for important database events

## Deployment

- [x] Update Environment Variables in Development
  - [x] Set `NEXT_PUBLIC_SUPABASE_URL`
  - [x] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [x] Set `NEXT_PUBLIC_SITE_URL`

- [ ] Update Environment Variables in Production
  - [ ] Set `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] Set `NEXT_PUBLIC_SITE_URL`

- [ ] Update Site URL in Supabase Auth Settings
  - [ ] Change from localhost to production URL

- [ ] Test Authentication in Production
  - [ ] Verify signup, login, and role-based access

## Future Enhancements

- [ ] Implement password reset functionality
- [x] Add social login providers
  - [x] Google authentication
  - [x] Facebook authentication
  - [ ] GitHub authentication (if needed)
- [ ] Create user profile management page
- [ ] Implement role management UI for superadmins
- [ ] Set up audit logging for important actions

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Authentication Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
