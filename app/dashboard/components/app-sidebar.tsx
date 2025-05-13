"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Settings, LogOut, ChefHat } from "lucide-react";
import { signout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

export default function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      name: "Users",
      href: "/dashboard/users",
      icon: Users,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <ChefHat className="h-6 w-6" />
          <Typography
            variant="h5"
            className={state === "collapsed" ? "hidden" : ""}
          >
            CateringHub
          </Typography>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span className={state === "collapsed" ? "hidden" : ""}>
              Navigation
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.name}
                  >
                    <Link href={item.href} className="flex items-center">
                      <item.icon className="h-5 w-5" />
                      <span
                        className={state === "collapsed" ? "sr-only" : "ml-2"}
                      >
                        {item.name}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <form action={signout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
            <span className={state === "collapsed" ? "sr-only" : "ml-2"}>
              Sign out
            </span>
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
