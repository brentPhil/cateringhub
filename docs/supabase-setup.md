# Supabase Setup Guide for CateringHub

This guide provides step-by-step instructions for setting up Supabase with role-based authentication for the CateringHub project.

## Prerequisites

- Supabase account (https://supabase.com)
- Node.js and pnpm installed

## Step 1: Create a Supabase Project

1. Log in to your Supabase account
2. Click "New Project"
3. Enter a name for your project (e.g., "CateringHub")
4. Set a secure database password
5. Choose a region closest to your users
6. Click "Create new project"

## Step 2: Set Up Environment Variables

1. In your Supabase project dashboard, go to "Settings" > "API"
2. Copy the "Project URL" and "anon/public" key
3. Create or update the `.env.local` file in your project root with:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Step 3: Set Up Database Schema

1. In your Supabase dashboard, go to "SQL Editor"
2. Create a new query
3. Copy and paste the contents of the `supabase/schema.sql` file
4. Run the query to set up the database schema

## Step 4: Configure Auth Settings

1. In your Supabase dashboard, go to "Authentication" > "Providers"
2. Make sure "Email" provider is enabled
3. Configure "Site URL" to match your production URL (for local development, use http://localhost:3000)
4. Go to "Email Templates" and update the confirmation email template:
   - Change `{{ .ConfirmationURL }}` to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`

## Step 5: Set Up Auth Hooks for Custom Claims

1. In your Supabase dashboard, go to "Authentication" > "Hooks"
2. For "Custom Access Token", select the function `custom_access_token_hook`

## Step 6: Create Admin Users

To create admin users:

1. First, create regular users through the signup process
2. Then, use the SQL Editor to update their roles:

```sql
-- Make a user an admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('user-uuid-here', 'admin');
```

Replace `user-uuid-here` with the actual UUID of the user you want to promote.

## Step 7: Run the Application

1. Install dependencies:
```
pnpm install
```

2. Start the development server:
```
pnpm dev
```

3. Open http://localhost:3000 in your browser

## Role-Based Access Control (RBAC)

The application has two user roles with different permissions:

1. **User** (default role)
   - Can access the dashboard
   - Can view and edit their own profile

2. **Admin**
   - All user permissions
   - Can view all users
   - Can read and modify settings
   - Can delete users
   - Can manage user roles

## Troubleshooting

### Authentication Issues

- Make sure your site URL is correctly set in Supabase Auth settings
- Check that email templates are properly configured
- Verify that the Auth Hooks are set up correctly

### Database Issues

- Check that all tables and functions were created successfully
- Verify that Row Level Security (RLS) policies are in place
- Make sure the custom access token hook is working properly

### Permission Issues

- Verify that the role permissions are correctly set up in the `role_permissions` table
- Check that users have the correct roles assigned in the `user_roles` table
- If you see "permission denied for table user_roles" as an admin,
  ensure `custom_access_token_hook` is enabled under **Auth → Hooks** and
  refresh your session or sign in again so the JWT includes the `user_role`
  claim.
