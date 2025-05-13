"use client";

import { usePathname } from "next/navigation";

// Helper function to get page title from pathname
function getPageTitle(pathname: string): string {
  const path = pathname.split("/").pop();
  
  if (!path || path === "dashboard") return "Dashboard";
  
  // Convert to title case (first letter uppercase, rest lowercase)
  return path.charAt(0).toUpperCase() + path.slice(1);
}

export default function PageTitle() {
  const pathname = usePathname();
  
  return (
    <h1 className="ml-2 text-xl font-semibold">
      {getPageTitle(pathname)}
    </h1>
  );
}
