"use client";

import { usePathname } from "next/navigation";
import { useQueryState, parseAsString } from "nuqs";
import { useEffect, useState } from "react";

export function useNavigationState() {
  const pathname = usePathname();
  const [section, setSection] = useQueryState("section", parseAsString);
  const [tab, setTab] = useQueryState("tab", parseAsString);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (
    path: string,
    queryParam?: string,
    queryKey: "section" | "tab" = "section"
  ): boolean => {
    if (!mounted) return false;

    const pathMatches = pathname === path || pathname.startsWith(`${path}/`);
    if (!queryParam) return pathMatches;

    const currentQueryValue = queryKey === "section" ? section : tab;
    return pathMatches && currentQueryValue === queryParam;
  };

  const setActiveSection = (value: string | null) => {
    void setSection(value);
  };

  const setActiveTab = (value: string | null) => {
    void setTab(value);
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
