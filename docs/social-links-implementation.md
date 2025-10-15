# Social Links Section - Implementation Guide

## Overview
This document outlines the implementation of the SocialLinksSection component for managing social media links on the provider profile page.

## Features Implemented

### 1. **SocialLinksSection Component**
- **Location**: `app/(provider)/dashboard/profile/components/social-links-section.tsx`
- **Purpose**: Allows providers to add, edit, and remove social media links
- **Platforms Supported**: Facebook, Instagram, Website, TikTok

### 2. **Component Structure**

#### Props Interface
```typescript
interface SocialLinksSectionProps {
  socialLinks: SocialLink[];
  onAddLink: (platform: SocialPlatform) => void;
  onUpdateLink: (id: string, field: "url", value: string) => void;
  onRemoveLink: (id: string) => void;
  isLoading?: boolean;
}
```

#### Social Link Type
```typescript
export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
}

export type SocialPlatform = "facebook" | "instagram" | "website" | "tiktok";
```

### 3. **UI Components Used**

All components are from Shadcn UI:

1. **Select** - Dropdown for adding new social links
2. **ButtonGroup** - Groups icon button, input, and delete button
3. **Input** - URL input field with validation
4. **Button** - Platform icon and delete button
5. **Skeleton** - Loading state

### 4. **Platform Configuration**

```typescript
const SOCIAL_PLATFORMS = [
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "website", label: "Website", icon: Globe },
  { value: "tiktok", label: "TikTok", icon: Music },
] as const;
```

### 5. **Helper Functions**

#### `getPlatformIcon(platform: string): LucideIcon`
Returns the appropriate icon component for a given platform.

#### `getPlatformLabel(platform: string): string`
Returns the display label for a given platform.

#### `isValidUrl(url: string): boolean`
Validates that the URL starts with "https://".

### 6. **Validation**

#### URL Validation
- **Rule**: URL must start with "https://"
- **Visual Feedback**: Red border on input field
- **Error Message**: "URL must start with https://" displayed below input

#### Schema Validation
Added to `lib/validations/index.ts`:

```typescript
socialMediaLinks: z
  .array(
    z.object({
      id: z.string(),
      platform: z.enum(['facebook', 'instagram', 'website', 'tiktok']),
      url: z
        .string()
        .refine(val => !val || val.startsWith('https://'), {
          message: 'URL must start with https://',
        }),
    })
  )
  .optional(),
```

## Backend Integration

### 1. **Database Schema**
The `social_media_links` field already exists in the `catering_providers` table as JSONB.

**Data Structure**:
```json
[
  {
    "id": "social-1234567890-abc123def",
    "platform": "facebook",
    "url": "https://facebook.com/mybusiness"
  },
  {
    "id": "social-1234567891-xyz789ghi",
    "platform": "instagram",
    "url": "https://instagram.com/mybusiness"
  }
]
```

### 2. **State Management**

#### Updated `useProfileFormState` Hook
**File**: `app/(provider)/dashboard/profile/hooks/use-profile-form-state.ts`

**Changes**:
1. Added `socialMediaLinks: SocialLink[]` to `ProfileFormState` interface
2. Added `parseAsJson<SocialLink[]>()` parser for URL state
3. Added `setSocialMediaLinks` setter function
4. Added social links comparison in `isDirty` check
5. Added `socialMediaLinks: null` to `resetForm` function

**Key Code**:
```typescript
// Parse from URL or database
socialMediaLinks:
  formState.socialMediaLinks ??
  (initialProfile?.social_media_links as SocialLink[] | null) ??
  [],

// Dirty check
!socialLinksEqual(
  formData.socialMediaLinks,
  initialProfile.social_media_links as SocialLink[] | null
)
```

### 3. **Server Action**

#### Updated `updateProviderProfile`
**File**: `app/(provider)/dashboard/profile/actions.ts`

**Changes**:
Added social media links to update data:
```typescript
const updateData = {
  // ... other fields
  social_media_links: validatedData.socialMediaLinks ?? undefined,
  updated_at: new Date().toISOString(),
};
```

### 4. **Profile Page Integration**

#### Handlers
**File**: `app/(provider)/dashboard/profile/page.tsx`

```typescript
// Add new social link
const handleAddSocialLink = (platform: SocialPlatform) => {
  const newLink: SocialLink = {
    id: `social-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    platform,
    url: "",
  };
  setSocialMediaLinks([...formData.socialMediaLinks, newLink]);
};

// Update social link URL
const handleUpdateSocialLink = (id: string, field: "url", value: string) => {
  const updatedLinks = formData.socialMediaLinks.map((link) =>
    link.id === id ? { ...link, [field]: value } : link
  );
  setSocialMediaLinks(updatedLinks);
};

// Remove social link
const handleRemoveSocialLink = (id: string) => {
  const updatedLinks = formData.socialMediaLinks.filter(
    (link) => link.id !== id
  );
  setSocialMediaLinks(updatedLinks);
};
```

#### Component Placement
Positioned after ProfileForm and before ServiceLocationsSection:

```tsx
<ProfileForm ... />

<SocialLinksSection
  socialLinks={formData.socialMediaLinks}
  onAddLink={handleAddSocialLink}
  onUpdateLink={handleUpdateSocialLink}
  onRemoveLink={handleRemoveSocialLink}
  isLoading={isLoading}
/>

<ServiceLocationsSection ... />
```

## Design Consistency

### 1. **Sentence Case**
All labels follow EU-style sentence case:
- ✅ "Social media links"
- ✅ "Add social link"
- ❌ "Social Media Links" (Title Case)

### 2. **Component Patterns**
Follows existing patterns from other sections:
- Same spacing (`space-y-4`, `space-y-2`)
- Same heading structure (h2 + description)
- Same loading skeleton pattern
- Same error message styling

### 3. **Accessibility**
- `aria-label` on icon buttons
- Proper button roles
- Keyboard navigation support
- Screen reader friendly

### 4. **Dark Mode**
All components support dark mode through Tailwind's dark mode utilities.

## User Experience

### 1. **Adding a Link**
1. Click "Add social link" dropdown
2. Select platform (Facebook, Instagram, Website, TikTok)
3. New row appears with platform icon and empty URL field
4. Enter URL starting with "https://"
5. Changes are tracked in URL state (nuqs)

### 2. **Editing a Link**
1. Type or paste URL in the input field
2. Real-time validation shows error if URL doesn't start with "https://"
3. Changes are immediately reflected in form state

### 3. **Removing a Link**
1. Click trash icon button
2. Link is immediately removed from the list
3. Changes are tracked in form state

### 4. **Saving**
1. Click "Save changes" in floating footer
2. All social links are validated
3. Data is persisted to Supabase
4. Success toast notification appears

## Data Flow

```
User Action
    ↓
Handler (handleAddSocialLink, handleUpdateSocialLink, handleRemoveSocialLink)
    ↓
setSocialMediaLinks (updates URL state via nuqs)
    ↓
formData.socialMediaLinks updated
    ↓
isDirty becomes true (floating footer appears)
    ↓
User clicks "Save changes"
    ↓
validateForm() checks schema
    ↓
updateProviderProfile() server action
    ↓
Supabase update (social_media_links JSONB field)
    ↓
refetch() gets latest data
    ↓
resetForm() clears URL params
    ↓
Form syncs with database state
```

## Testing Checklist

### Functionality
- [ ] Can add social links for all platforms
- [ ] Can edit URL for existing links
- [ ] Can remove social links
- [ ] URL validation works (must start with https://)
- [ ] Error message appears for invalid URLs
- [ ] Changes trigger isDirty state
- [ ] Floating footer appears when changes are made
- [ ] Save persists data to database
- [ ] Cancel resets to original state
- [ ] Data loads correctly from database

### UI/UX
- [ ] Loading skeleton appears while data is loading
- [ ] Platform icons display correctly
- [ ] ButtonGroup layout is responsive
- [ ] Error messages are clearly visible
- [ ] Sentence case is used throughout
- [ ] Dark mode works correctly
- [ ] Tooltips/aria-labels are present

### Edge Cases
- [ ] Empty social links array (no links added yet)
- [ ] Multiple links for same platform (should be allowed)
- [ ] Very long URLs (should wrap or truncate)
- [ ] Special characters in URLs
- [ ] Rapid add/remove operations
- [ ] Network errors during save

## Future Enhancements

1. **Platform Validation**
   - Validate URL matches platform (e.g., facebook.com for Facebook)
   - Show platform-specific placeholder URLs

2. **Link Preview**
   - Show preview of the social profile
   - Verify link is accessible

3. **Reordering**
   - Drag and drop to reorder links
   - Set display priority

4. **Analytics**
   - Track click-through rates on public profile
   - Show engagement metrics

5. **Additional Platforms**
   - Twitter/X
   - LinkedIn
   - YouTube
   - WhatsApp Business

6. **Bulk Import**
   - Import from existing business profiles
   - Auto-detect platform from URL

## Files Modified

1. ✅ `app/(provider)/dashboard/profile/components/social-links-section.tsx` (new)
2. ✅ `app/(provider)/dashboard/profile/hooks/use-profile-form-state.ts`
3. ✅ `lib/validations/index.ts`
4. ✅ `app/(provider)/dashboard/profile/actions.ts`
5. ✅ `app/(provider)/dashboard/profile/page.tsx`

## Summary

The SocialLinksSection component is now fully integrated with:
- ✅ Clean, reusable component structure
- ✅ Real-time URL validation
- ✅ nuqs state management for URL params
- ✅ Zod schema validation
- ✅ Supabase persistence
- ✅ Consistent design patterns
- ✅ Full accessibility support
- ✅ Dark mode compatibility

The implementation follows all existing patterns in the codebase and provides a seamless user experience for managing social media links on provider profiles.

