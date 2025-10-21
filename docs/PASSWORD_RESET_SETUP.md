# Password Reset Setup Guide

This guide explains how to configure the password reset functionality in CateringHub.

## 📋 Overview

The password reset flow uses **Supabase Auth's built-in password recovery** with the **PKCE flow** for enhanced security.

### Flow Diagram

```
User                    Frontend                 Supabase Auth           Email
  |                        |                          |                    |
  |--[Forgot password?]--->|                          |                    |
  |                        |                          |                    |
  |<--[Enter email]--------|                          |                    |
  |                        |                          |                    |
  |--[Submit email]------->|                          |                    |
  |                        |--[resetPasswordForEmail]->|                    |
  |                        |                          |--[Send email]----->|
  |                        |<--[Success]--------------|                    |
  |<--[Check email msg]----|                          |                    |
  |                                                    |                    |
  |<--[Reset link email]--------------------------------|<-------------------|
  |                                                                         |
  |--[Click reset link]---------------------------------------------------->|
  |                                                                         |
  |                        |<--[/auth/reset-password?token_hash=xxx]--------|
  |                        |                          |                    |
  |                        |--[verifyOtp]------------>|                    |
  |                        |<--[Session created]------|                    |
  |                        |                          |                    |
  |<--[/reset-password]----|                          |                    |
  |                        |                          |                    |
  |--[Enter new password]->|                          |                    |
  |                        |--[updateUser]----------->|                    |
  |                        |<--[Success]--------------|                    |
  |<--[Redirect to login]--|                          |                    |
```

## 🔧 Configuration Steps

### 1. Configure Redirect URLs in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ghfnyprmnluutpcacdjp/auth/url-configuration)
2. Navigate to **Authentication > URL Configuration**
3. Add the following URLs to **Redirect URLs**:

   **For Local Development:**
   ```
   http://localhost:3000/auth/reset-password
   http://localhost:3000/reset-password
   http://localhost:3000/**
   ```

   **For Production:**
   ```
   https://yourdomain.com/auth/reset-password
   https://yourdomain.com/reset-password
   https://yourdomain.com/**
   ```

4. Set **Site URL**:
   - **Local Development:** `http://localhost:3000`
   - **Production:** `https://yourdomain.com`

5. Click **Save**

### 2. Configure Email Template

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ghfnyprmnluutpcacdjp/auth/templates)
2. Navigate to **Authentication > Email Templates**
3. Select **Reset Password** template
4. Copy the content from `docs/password-reset-email-template.html`
5. Paste it into the template editor
6. Update the subject line to: `Reset Your Password - CateringHub`
7. Click **Save**

### 3. Environment Variables

Ensure your `.env.local` file has the following:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ghfnyprmnluutpcacdjp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site URL (optional for local dev, required for production)
# NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Local dev (optional)
# NEXT_PUBLIC_SITE_URL=https://yourdomain.com  # Production (required)
```

**Note:** If `NEXT_PUBLIC_SITE_URL` is not set, it defaults to `http://localhost:3000` in the code.

## 🎯 Features

### ✅ Implemented Features

1. **Forgot Password Page** (`/forgot-password`)
   - Email input with validation
   - Loading states
   - Success/error messages
   - Link back to login

2. **Password Reset Callback** (`/auth/reset-password`)
   - PKCE token verification
   - Session creation
   - Error handling for expired/invalid tokens
   - Redirect to reset password form

3. **Reset Password Page** (`/reset-password`)
   - Session validation
   - New password input with strength requirements
   - Confirm password field
   - Real-time password validation feedback
   - Auto-redirect to login after success

4. **Email Template**
   - Professional design matching CateringHub branding
   - PKCE flow support
   - Localhost development button (auto-hidden in production)
   - Security tips
   - 1-hour expiration notice

5. **Security Features**
   - PKCE flow (more secure than implicit flow)
   - Token hash verification
   - Session-based authentication
   - Password strength requirements:
     - Minimum 8 characters
     - At least one uppercase letter
     - At least one lowercase letter
     - At least one number
     - At least one special character
   - Rate limiting (60 second window between requests)

### 🔒 Security Considerations

1. **PKCE Flow**: Uses token exchange instead of direct token in URL
2. **Session Validation**: Verifies user has valid session before allowing password reset
3. **Token Expiration**: Reset links expire after 1 hour
4. **Rate Limiting**: Prevents abuse with 60-second cooldown between requests
5. **Password Requirements**: Enforces strong password policy
6. **Auto Sign Out**: Signs user out after password reset to ensure fresh login

## 📝 Usage

### For Users

1. **Forgot Password:**
   - Go to login page
   - Click "Forgot password?"
   - Enter email address
   - Check email for reset link

2. **Reset Password:**
   - Click link in email
   - Enter new password (must meet requirements)
   - Confirm new password
   - Click "Reset password"
   - Redirected to login with new password

### For Developers

**Testing Locally:**

1. Start dev server: `pnpm dev`
2. Navigate to `http://localhost:3000/forgot-password`
3. Enter a test user's email
4. Check email inbox
5. Click the **"Reset Password (Local Dev)"** button (gray button in yellow box)
6. Enter new password
7. Verify redirect to login

**Testing in Production:**

1. Deploy application
2. Set `NEXT_PUBLIC_SITE_URL` to production domain
3. Update Supabase redirect URLs
4. Test with real email
5. Click the blue "Reset Password" button
6. Complete password reset

## 🐛 Troubleshooting

### Issue: "Invalid or expired password reset link"

**Causes:**
- Link is older than 1 hour
- Link has already been used
- Token is invalid

**Solution:**
- Request a new password reset link from `/forgot-password`

### Issue: Email not received

**Causes:**
- Email in spam folder
- Rate limiting (requested too many resets)
- Invalid email address

**Solution:**
- Check spam folder
- Wait 60 seconds before requesting again
- Verify email address is correct

### Issue: Localhost button not working

**Causes:**
- Dev server not running on port 3000
- `NEXT_PUBLIC_SITE_URL` is set to production URL

**Solution:**
- Ensure dev server is running: `pnpm dev`
- Remove or comment out `NEXT_PUBLIC_SITE_URL` in `.env.local` for local dev

### Issue: Password doesn't meet requirements

**Solution:**
- Ensure password has:
  - At least 8 characters
  - One uppercase letter (A-Z)
  - One lowercase letter (a-z)
  - One number (0-9)
  - One special character (!@#$%^&*, etc.)

## 📚 Technical Details

### API Endpoints

1. **POST** `/forgot-password` (Client-side)
   - Calls `supabase.auth.resetPasswordForEmail()`
   - Sends password reset email

2. **GET** `/auth/reset-password` (Server-side)
   - Receives `token_hash` and `type=recovery`
   - Calls `supabase.auth.verifyOtp()`
   - Creates session
   - Redirects to `/reset-password`

3. **POST** `/reset-password` (Client-side)
   - Calls `supabase.auth.updateUser({ password })`
   - Updates user password
   - Signs out user
   - Redirects to login

### Database Tables

No custom tables required. Uses Supabase Auth's built-in tables:
- `auth.users` - User accounts
- `auth.sessions` - Active sessions

### Rate Limiting

Supabase enforces rate limiting on password reset requests:
- **Limit:** 1 request per 60 seconds per email
- **Scope:** Per email address
- **Error:** "For security purposes, you can only request this once every 60 seconds"

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Set `NEXT_PUBLIC_SITE_URL` to production domain
- [ ] Update Supabase redirect URLs with production domain
- [ ] Update email template if needed (localhost button will auto-hide)
- [ ] Test password reset flow in production
- [ ] Verify emails are being delivered
- [ ] Check spam folder settings
- [ ] Monitor error logs

## 📞 Support

For issues or questions:
- Email: support@cateringhubph.com
- Documentation: This file
- Supabase Docs: https://supabase.com/docs/guides/auth/passwords

