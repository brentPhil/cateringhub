import { z } from "zod";

export const SOCIAL_PLATFORM_KEYS = [
  "facebook",
  "instagram",
  "website",
  "tiktok",
] as const;

export type SocialPlatformKey = (typeof SOCIAL_PLATFORM_KEYS)[number];

export interface SocialLinkValidationConfig {
  label: string;
  placeholder: string;
  example: string;
  allowedHosts?: string[];
  requiresPath?: boolean;
  pathPattern?: RegExp;
}

export const SOCIAL_LINK_CONFIG: Record<
  SocialPlatformKey,
  SocialLinkValidationConfig
> = {
  facebook: {
    label: "Facebook",
    placeholder: "https://www.facebook.com/yourpage",
    example: "https://www.facebook.com/yourpage",
    allowedHosts: ["facebook.com", "fb.com"],
    requiresPath: true,
  },
  instagram: {
    label: "Instagram",
    placeholder: "https://www.instagram.com/yourhandle",
    example: "https://www.instagram.com/yourhandle",
    allowedHosts: ["instagram.com"],
    requiresPath: true,
    pathPattern: /^\/[A-Za-z0-9._-]+\/?$/,
  },
  website: {
    label: "Website",
    placeholder: "https://yourdomain.com",
    example: "https://yourdomain.com",
  },
  tiktok: {
    label: "TikTok",
    placeholder: "https://www.tiktok.com/@yourhandle",
    example: "https://www.tiktok.com/@yourhandle",
    allowedHosts: ["tiktok.com"],
    requiresPath: true,
    pathPattern: /^\/@[\w.-]+\/?$/,
  },
};

export const SOCIAL_PLATFORM_SCHEMA = z.enum(SOCIAL_PLATFORM_KEYS);

export function isSocialPlatformKey(value: string): value is SocialPlatformKey {
  return SOCIAL_PLATFORM_KEYS.includes(value as SocialPlatformKey);
}

function isAllowedHost(hostname: string, allowedHosts: string[] = []) {
  if (allowedHosts.length === 0) {
    return true;
  }

  const normalizedHost = hostname.toLowerCase();
  return allowedHosts.some((host) => {
    const normalizedAllowed = host.toLowerCase();
    return (
      normalizedHost === normalizedAllowed ||
      normalizedHost.endsWith(`.${normalizedAllowed}`)
    );
  });
}

export function validateSocialUrl(
  platform: SocialPlatformKey,
  rawUrl: string
): string | null {
  const value = rawUrl.trim();
  if (!value) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return `Enter a valid ${SOCIAL_LINK_CONFIG[
      platform
    ].label.toLowerCase()} URL (e.g., ${SOCIAL_LINK_CONFIG[platform].example})`;
  }

  if (parsed.protocol !== "https:") {
    return "URL must start with https://";
  }

  const config = SOCIAL_LINK_CONFIG[platform];

  if (!isAllowedHost(parsed.hostname, config.allowedHosts)) {
    return `Enter a valid ${config.label.toLowerCase()} URL (e.g., ${config.example})`;
  }

  if (config.requiresPath) {
    const normalizedPath = parsed.pathname.replace(/\/+$/, "");
    if (!normalizedPath || normalizedPath === "") {
      return `Include your ${config.label.toLowerCase()} handle (e.g., ${config.example})`;
    }
  }

  if (config.pathPattern && !config.pathPattern.test(parsed.pathname)) {
    return `Enter a valid ${config.label.toLowerCase()} URL (e.g., ${config.example})`;
  }

  return null;
}

