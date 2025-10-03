"use client";

import { usePathname } from "next/navigation";
import { useQueryState, parseAsString } from "nuqs";
import { useEffect, useState } from "react";

/**
 * Hook to manage navigation active state with URL query parameters
 * This allows for more granular control over active states, especially for tabs or sections
 * 
 * @example
 * // In a page with tabs
 * const { isActive, setActiveSection } = useNavigationState();
 * 
 * // Check if a path is active
 * isActive('/dashboard/profile') // true if on /dashboard/profile
 * 
 * // Check if a path with a specific section is active
 * isActive('/dashboard/settings', 'account') // true if on /dashboard/settings?section=account
 */
export function useNavigationState() {
  const pathname = usePathname();
  const [section, setSection] = useQueryState("section", parseAsString);
  const [tab, setTab] = useQueryState("tab", parseAsString);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Check if a given path (and optionally section/tab) is currently active
   * 
   * @param path - The path to check (e.g., '/dashboard/profile')
   * @param queryParam - Optional query parameter value to match (section or tab)
   * @param queryKey - Optional query key to check ('section' or 'tab', defaults to 'section')
   */
  const isActive = (
    path: string,
    queryParam?: string,
    queryKey: "section" | "tab" = "section"
  ): boolean => {
    if (!mounted) return false; // Prevent hydration mismatch

    // Check if the current pathname matches the nav item path
    const pathMatches = pathname === path || pathname.startsWith(`${path}/`);

    // If no query parameter is specified, just check the path
    if (!queryParam) {
      return pathMatches;
    }

    // If a query parameter is specified, check both path and query param
    const currentQueryValue = queryKey === "section" ? section : tab;
    return pathMatches && currentQueryValue === queryParam;
  };

  /**
   * Set the active section in the URL
   */
  const setActiveSection = (value: string | null) => {
    setSection(value);
  };

  /**
   * Set the active tab in the URL
   */
  const setActiveTab = (value: string | null) => {
    setTab(value);
  };

  return {
    isActive,
    section,
    setActiveSection,
    tab,
    setActiveTab,
    mounted,
  };
}

