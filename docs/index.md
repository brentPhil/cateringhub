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

The application supports a comprehensive role-based access control (RBAC) system with three main user roles:

1. **User** (default role)
   - Can access the dashboard
   - Can view and edit their own profile
   - **Permissions**: `dashboard.access`

2. **Admin**
   - Full administrative access to the system
   - Can view and manage all users
   - Can read and modify system settings
   - Can delete users and manage user roles
   - **Permissions**: `dashboard.access`, `users.read`, `users.write`, `users.delete`, `settings.read`, `settings.write`

3. **Catering Provider** (with sub-roles)
   The catering provider role includes a hierarchical sub-role system:

   - **Owner** sub-role:
     - Full access to all catering provider features
     - Can create, read, update, and delete services
     - Can read and update bookings
     - Can access calendar, messages, reviews, and analytics
     - **Permissions**: `dashboard.access`, `services.create`, `services.read`, `services.update`, `services.delete`, `bookings.read`, `bookings.update`, `calendar.read`, `messages.read`, `messages.create`, `reviews.read`, `reviews.respond`, `analytics.basic`

   - **Staff** sub-role:
     - Limited access to catering provider features
     - Can only read bookings, calendar, and messages
     - Cannot manage services or respond to reviews
     - **Permissions**: `dashboard.access`, `bookings.read`, `calendar.read`, `messages.read`

## Permission System

The application uses a granular permission system where:
- **Role permissions** define what each main role can do
- **Provider role permissions** define what each catering provider sub-role can do
- The UI dynamically shows/hides features based on user permissions
- Navigation items are filtered based on user permissions
- Database access is controlled through Row Level Security (RLS) policies
