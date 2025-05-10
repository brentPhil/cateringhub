# CateringHub Documentation

Welcome to the CateringHub documentation. This index provides links to all the documentation files for the project.

## Setup Guides

- [Supabase Setup Guide](./supabase-setup.md) - Comprehensive guide for setting up Supabase with role-based authentication
- [Supabase Setup Checklist](./supabase-setup-checklist.md) - Checklist for tracking progress on Supabase setup
- [Google Authentication Setup](./google-auth-setup.md) - Guide for setting up Google authentication with Supabase
- [Facebook Authentication Setup](./facebook-auth-setup.md) - Guide for setting up Facebook authentication with Supabase

## Project Documentation

- [Project README](./project-readme.md) - Main project README with general information

## Authentication

The project uses Supabase for authentication with the following features:

- Email/password authentication
- Google OAuth authentication
- Facebook OAuth authentication
- Role-based access control (RBAC)
- Custom claims for user roles

## User Roles

The application supports three user roles:

1. **User** (default role)
   - Can access the dashboard
   - Can view and edit their own profile

2. **Admin**
   - All user permissions
   - Can view all users
   - Can read settings

3. **Superadmin**
   - All admin permissions
   - Can delete users
   - Can modify settings
   - Can manage user roles
