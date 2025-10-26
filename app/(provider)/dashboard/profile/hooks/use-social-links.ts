"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Tables } from "@/types/supabase";

type DBSocialLink = Tables<"provider_social_links">;

export type SocialPlatform = "facebook" | "instagram" | "website" | "tiktok";

export interface SocialLinkFormData {
  id: string;
  platform: SocialPlatform;
  url: string;
}

/**
 * Custom hook for managing social links state
 * Handles add, update, remove operations with dirty tracking
 */
export function useSocialLinks(initialLinks: DBSocialLink[] = []) {
  // Convert DB format to form format
  const convertToFormData = useCallback(
    (dbLinks: DBSocialLink[]): SocialLinkFormData[] => {
      return dbLinks.map((link) => ({
        id: link.id,
        platform: link.platform as SocialPlatform,
        url: link.url,
      }));
    },
    []
  );

  // State
  const [links, setLinks] = useState<SocialLinkFormData[]>(() =>
    convertToFormData(initialLinks)
  );

  // Track initial state for dirty checking
  const initialStateRef = useRef<SocialLinkFormData[]>(
    convertToFormData(initialLinks)
  );

  // Sync from server data (called after save/refetch)
  const syncFromServer = useCallback(
    (serverLinks: DBSocialLink[]) => {
      const formData = convertToFormData(serverLinks);
      setLinks(formData);
      initialStateRef.current = formData;
    },
    [convertToFormData]
  );

  // Update initial state when initialLinks prop changes
  useEffect(() => {
    // Avoid unnecessary updates while data is still loading by short-circuiting identical empty payloads
    if (!initialLinks || initialLinks.length === 0) {
      if (initialStateRef.current.length === 0) {
        return;
      }

      initialStateRef.current = [];
      setLinks([]);
      return;
    }

    const formData = convertToFormData(initialLinks);
    const previous = initialStateRef.current;

    const isSameLength = previous.length === formData.length;
    const isSameContent =
      isSameLength &&
      previous.every((prevLink, index) => {
        const nextLink = formData[index];
        return (
          nextLink &&
          prevLink.id === nextLink.id &&
          prevLink.platform === nextLink.platform &&
          prevLink.url === nextLink.url
        );
      });

    if (isSameContent) {
      return;
    }

    initialStateRef.current = formData;
    setLinks(formData);
  }, [initialLinks, convertToFormData]);

  // Add a new social link
  const addLink = useCallback((platform: SocialPlatform) => {
    const newLink: SocialLinkFormData = {
      id: crypto.randomUUID(),
      platform,
      url: "",
    };
    setLinks((prev) => [...prev, newLink]);
  }, []);

  // Update a social link
  const updateLink = useCallback(
    (id: string, field: keyof Omit<SocialLinkFormData, "id">, value: string) => {
      setLinks((prev) =>
        prev.map((link) =>
          link.id === id ? { ...link, [field]: value } : link
        )
      );
    },
    []
  );

  // Remove a social link
  const removeLink = useCallback((id: string) => {
    setLinks((prev) => prev.filter((link) => link.id !== id));
  }, []);

  // Validate links
  const validateLinks = useCallback((): string[] => {
    const errors: string[] = [];

    links.forEach((link, index) => {
      // Check if URL is provided
      if (!link.url.trim()) {
        errors.push(`Social link ${index + 1}: URL is required`);
      }
      // Check if URL starts with https://
      else if (!link.url.startsWith("https://")) {
        errors.push(`Social link ${index + 1}: URL must start with https://`);
      }
    });

    // Check for duplicate platforms
    const platforms = links.map((l) => l.platform);
    const duplicates = platforms.filter(
      (platform, index) => platforms.indexOf(platform) !== index
    );
    if (duplicates.length > 0) {
      errors.push(
        `Duplicate platforms found: ${[...new Set(duplicates)].join(", ")}`
      );
    }

    return errors;
  }, [links]);

  // Check if state is dirty (different from initial)
  const isDirty = useCallback((): boolean => {
    const initial = initialStateRef.current;

    // Different number of links
    if (links.length !== initial.length) {
      return true;
    }

    // Check each link for changes
    return links.some((link) => {
      const initialLink = initial.find((l) => l.id === link.id);
      if (!initialLink) {
        return true; // New link
      }
      return (
        initialLink.platform !== link.platform || initialLink.url !== link.url
      );
    });
  }, [links]);

  // Reset to initial state
  const resetLinks = useCallback(() => {
    setLinks([...initialStateRef.current]);
  }, []);

  return {
    links,
    addLink,
    updateLink,
    removeLink,
    validateLinks,
    isDirty,
    resetLinks,
    syncFromServer,
  };
}
