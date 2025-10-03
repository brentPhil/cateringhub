"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  Settings,
  ChefHat,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuthInfo } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NavUser } from "./nav-user";
import { useNavigationState } from "@/hooks/use-navigation-state";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const { isActive, mounted } = useNavigationState();

  const allNavItems: Array<{
    name: string;
    href: string;
    icon: LucideIcon;
    description: string;
    adminOnly?: boolean;
  }> = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "View your dashboard",
    },
    {
      name: "Profile",
      href: "/dashboard/profile",
      icon: ChefHat,
      description: "Manage your profile",
    },
    {
      name: "Users",
      href: "/dashboard/users",
      icon: Users,
      description: "Manage system users",
      adminOnly: true,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      description: "Configure your account",
    },
  ];

  const { user, profile, isAdmin, isLoading: authLoading } = useAuthInfo();

  // Filter navigation items based on roles
  // Only filter after component is mounted to prevent hydration mismatch
  const navItems = allNavItems.filter((item) => {
    if (item.adminOnly) {
      // During SSR or before mount, hide admin items
      // After mount, show only if user is admin and auth is loaded
      if (!mounted) return false;
      return !authLoading && isAdmin;
    }
    return true; // Show items without specific role requirements
  });

  // Prepare user data for NavUser component
  const userData = user && {
    name: profile?.full_name || user.email?.split("@")[0] || "User",
    email: user?.email || "",
    avatar: profile?.avatar_url || "",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard">
                <ChefHat className="size-8 text-primary" />
                <span className="text-base font-semibold">CateringHub</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span>Navigation</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className={cn(state === "collapsed" ? "gap-0" : "")}>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Tooltip delayDuration={350}>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild isActive={isActive(item.href)}>
                        <a href={item.href}>
                          <item.icon className="h-5 w-5" />
                          <span>{item.name}</span>
                        </a>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {state === "collapsed" && (
                      <TooltipContent side="right" className="flex flex-col">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {userData && !authLoading && <NavUser user={userData} />}
      </SidebarFooter>
    </Sidebar>
  );
}
