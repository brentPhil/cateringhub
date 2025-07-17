# Current Permission Mappings Documentation

## Overview

This document captures the current permission-based access control system before migration to simplified role-based system.

## Current Permission System

### Available Permissions

1. `dashboard.access` - Access to dashboard
2. `users.read` - View users
3. `users.write` - Modify users
4. `users.delete` - Delete users
5. `settings.read` - View settings
6. `settings.write` - Modify settings
7. `services.create` - Create catering services
8. `services.read` - View catering services
9. `services.update` - Update catering services
10. `services.delete` - Delete catering services
11. `bookings.read` - View bookings
12. `bookings.update` - Modify bookings
13. `calendar.read` - View calendar
14. `messages.read` - View messages
15. `messages.create` - Create messages
16. `reviews.read` - View reviews
17. `reviews.respond` - Respond to reviews
18. `analytics.basic` - View basic analytics

## Role-Based Permission Mappings

### Admin Role

**Current Permissions:**

- `dashboard.access`
- `users.read`
- `users.write`
- `users.delete`
- `settings.read`
- `settings.write`

**Simplified Access:** Full administrative access to all features

### Catering Provider Role

**Current Permissions:**

- `dashboard.access`
- `services.create`
- `services.read`
- `services.update`
- `services.delete`
- `bookings.read`
- `bookings.update`
- `calendar.read`
- `messages.read`
- `messages.create`
- `reviews.read`
- `reviews.respond`
- `analytics.basic`

**Simplified Access:** Full provider features (services, bookings, calendar, messages, reviews, analytics)

### User Role

**Current Permissions:**

- `dashboard.access`

**Simplified Access:** Basic dashboard access only

## Provider Sub-Role Mappings

### Owner Sub-Role (for catering_provider)

**Current Permissions:**

- All catering_provider permissions (same as above)

**Simplified Access:** Full provider features

### Staff Sub-Role (for catering_provider)

**Current Permissions:**

- `dashboard.access`
- `bookings.read`
- `calendar.read`
- `messages.read`

**Simplified Access:** Limited provider features (view-only for bookings, calendar, messages)

## Migration Strategy

### Role-Based Access Control Logic

Instead of checking individual permissions, the simplified system will use:

1. **Admin Role Check:** `user_role = 'admin'`

   - Grants access to: User management, settings, all admin features

2. **Catering Provider Role Check:** `user_role = 'catering_provider'`

   - **Owner Sub-Role:** `provider_role = 'owner'`
     - Grants access to: All provider features
   - **Staff Sub-Role:** `provider_role = 'staff'`
     - Grants access to: Limited provider features (read-only)

3. **User Role Check:** `user_role = 'user'`
   - Grants access to: Dashboard only

### Feature Access Mapping

- **User Management:** Admin only
- **Settings:** Admin only
- **Services Management:** Catering Provider (Owner only)
- **Bookings Management:** Catering Provider (Owner can modify, Staff can view)
- **Calendar:** Catering Provider (both Owner and Staff)
- **Messages:** Catering Provider (both Owner and Staff)
- **Reviews:** Catering Provider (Owner only)
- **Analytics:** Catering Provider (Owner only)
- **Dashboard:** All authenticated users
