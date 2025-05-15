/**
 * Utility functions for handling user avatars
 */

/**
 * Get user initials from a name or email for avatar fallback
 * @param nameOrEmail User's name or email
 * @returns Initials (up to 2 characters)
 */
export function getInitials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return "U";
  
  // If it looks like an email, use the first character of the username
  if (nameOrEmail.includes('@')) {
    const username = nameOrEmail.split('@')[0];
    return username.charAt(0).toUpperCase();
  }
  
  // Otherwise, get initials from the name
  return nameOrEmail
    .split(' ')
    .map((part) => part?.[0] || '')
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Get a fallback avatar URL using UI Avatars service
 * @param name User's name or email
 * @param size Size of the avatar in pixels
 * @returns URL to a generated avatar
 */
export function getFallbackAvatarUrl(name: string | null | undefined, size: number = 128): string {
  if (!name) name = 'User';
  
  // Use UI Avatars service to generate a fallback avatar
  const initials = getInitials(name);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=random`;
}

/**
 * Get the best available avatar URL with fallback
 * @param avatarUrl User's avatar URL from profile
 * @param name User's name or email for fallback
 * @param size Size of the avatar in pixels
 * @returns The best available avatar URL
 */
export function getAvatarUrl(
  avatarUrl: string | null | undefined, 
  name: string | null | undefined, 
  size: number = 128
): string {
  // If we have a valid avatar URL, use it
  if (avatarUrl && avatarUrl.trim() !== '') {
    return avatarUrl;
  }
  
  // Otherwise, generate a fallback avatar
  return getFallbackAvatarUrl(name, size);
}
