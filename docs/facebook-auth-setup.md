# Setting Up Facebook Authentication for CateringHub

This guide walks you through setting up Facebook authentication for your CateringHub project using Supabase.

## Step 1: Create a Facebook App

1. Go to the [Facebook Developers Portal](https://developers.facebook.com/)
2. Click "My Apps" in the top-right corner
3. Click "Create App"
4. Select "Consumer" as the app type
5. Enter your app name (e.g., "CateringHub")
6. Enter your contact email
7. Click "Create App"

## Step 2: Configure Facebook Login

1. In your Facebook app dashboard, click "Add Product" in the left sidebar
2. Find "Facebook Login" and click "Set Up"
3. Select "Web" as the platform
4. Enter your website URL (e.g., `http://localhost:3000` for development or your production URL)
5. Click "Save"
6. Navigate to "Facebook Login" > "Settings" in the left sidebar
7. Add the following OAuth Redirect URIs:
   - For development: `https://[YOUR-SUPABASE-PROJECT-REF].supabase.co/auth/v1/callback`
   - For production: `https://[YOUR-PRODUCTION-DOMAIN]/auth/v1/callback`
8. Save the changes

## Step 3: Get Your App ID and Secret

1. Go to "Settings" > "Basic" in the left sidebar
2. Note your App ID and App Secret (you'll need these for Supabase configuration)

## Step 4: Configure Facebook Auth in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to "Authentication" > "Providers"
4. Find "Facebook" in the list of providers and click "Edit"
5. Toggle the "Enabled" switch to ON
6. Enter your Facebook App ID and App Secret from Step 3
7. Save the changes

## Step 5: Test Facebook Authentication

1. Start your development server with `pnpm dev`
2. Navigate to the login page at http://localhost:3000/login
3. Click the "Sign in with Facebook" button
4. Complete the Facebook authentication flow
5. Verify that you are redirected to the dashboard after successful authentication

## Troubleshooting

If you encounter issues with Facebook authentication:

1. Verify that your Facebook App ID and Secret are correct in Supabase
2. Check that the redirect URIs are properly configured in your Facebook app
3. Ensure that your Supabase project has Facebook authentication enabled
4. Check the browser console for any error messages
5. Verify that your application is correctly handling the authentication flow

## Next Steps

After setting up Facebook authentication:

1. Consider adding other social login providers (GitHub, Twitter, etc.)
2. Implement user profile management to handle information from social providers
3. Add role assignment for users who sign up with Facebook
