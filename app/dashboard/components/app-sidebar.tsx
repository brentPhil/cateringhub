"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { NavUser } from "@/app/dashboard/components/nav-user";
import { useUser, useProfile, useHasPermission } from "@/hooks/use-auth";
import type { AppPermission } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { state } = useSidebar();

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const allNavItems: Array<{
    name: string;
    href: string;
    icon: LucideIcon;
    description: string;
    permission: AppPermission;
  }> = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "View your dashboard",
      permission: "dashboard.access",
    },
    {
      name: "Users",
      href: "/dashboard/users",
      icon: Users,
      description: "Manage system users",
      permission: "users.read",
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      description: "Configure your account",
      permission: "dashboard.access", // Everyone with dashboard access can access settings
    },
  ];

  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: profile, isLoading: isProfileLoading } = useProfile();

  // Get user permissions to filter navigation items
  const canViewUsers = useHasPermission("users.read");
  const canAccessDashboard = useHasPermission("dashboard.access");

  // Filter navigation items based on permissions
  const navItems = allNavItems.filter((item) => {
    switch (item.permission) {
      case "users.read":
        return canViewUsers;
      case "dashboard.access":
        return canAccessDashboard;
      default:
        return true; // Show items without specific permissions
    }
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
                        <Link href={item.href}>
                          <item.icon className="h-5 w-5" />
                          <span>{item.name}</span>
                        </Link>
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
        {userData && !isUserLoading && !isProfileLoading && (
          <NavUser user={userData} />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
