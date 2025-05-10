# Setting Up Google Authentication for CateringHub

This guide walks you through setting up Google authentication for your CateringHub project using Supabase.

## Step 1: Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" and select "OAuth client ID"
5. Select "Web application" as the application type
6. Add a name for your OAuth client (e.g., "CateringHub Auth")
7. Add authorized JavaScript origins:
   - For development: `http://localhost:3000`
   - For production: Your production URL
8. Add authorized redirect URIs:
   - For development: `https://ghfnyprmnluutpcacdjp.supabase.co/auth/v1/callback`
   - For production: `https://your-production-url.com/auth/v1/callback`
9. Click "Create" to generate your client ID and client secret
10. Save your client ID and client secret for the next step

## Step 2: Configure Google Auth in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to "Authentication" > "Providers"
4. Find "Google" in the list of providers and click "Edit"
5. Toggle the "Enabled" switch to ON
6. Enter your Google Client ID and Client Secret from Step 1
7. Save the changes

## Step 3: Update Your Application Code (✅ Completed)

We've updated our application to support Google authentication:

1. Added Google sign-in functionality to auth actions
2. Created Google login buttons on login and signup pages
3. Implemented the OAuth callback handler
4. Added the NEXT_PUBLIC_SITE_URL environment variable

## Step 4: Test Google Authentication

1. Start your development server with `pnpm dev`
2. Navigate to the login page at http://localhost:3000/login
3. Click the "Sign in with Google" button
4. Complete the Google authentication flow
5. Verify that you are redirected to the dashboard after successful authentication

## Troubleshooting

If you encounter issues with Google authentication:

1. Verify that your Google OAuth credentials are correct
2. Check that the redirect URIs are properly configured
3. Ensure that your Supabase project has Google authentication enabled
4. Check the browser console for any error messages
5. Verify that your application is correctly handling the authentication flow

## Next Steps

After setting up Google authentication:

1. Consider adding other social login providers (GitHub, Facebook, etc.)
2. Implement user profile management to handle information from social providers
3. Add role assignment for users who sign up with Google
