"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditProfileForm } from "./edit-profile-form";
import { getInitials, getAvatarUrl } from "@/lib/utils/avatar";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { User } from "@supabase/supabase-js";

// Define valid tab values
const TABS = ["profile", "account", "permissions"] as const;

// Define types for our state
interface Profile {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
  bio?: string | null;
  updated_at?: string;
  created_at?: string;
}

// TODO: organize the types properly
interface RolePermission {
  role: string;
  permission: string;
  id?: string;
  created_at?: string;
  updated_at?: string;
}

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use nuqs to manage the active tab in the URL
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TABS).withDefault("profile")
  );

  // Fetch data on component mount
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);

      try {
        // Get user data
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);

        // Get user role
        const { data: userRolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user?.id)
          .single();
        setUserRole(userRolesData?.role || null);

        // Fetch user profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user?.id)
          .single();
        setProfile(profileData);

        // Fetch role permissions
        const { data: permissionsData } = await supabase
          .from("role_permissions")
          .select("*")
          .order("role", { ascending: true })
          .order("permission", { ascending: true });
        setRolePermissions(permissionsData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Show loading state if data is still loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <div className="flex items-center justify-center p-8">
          <Typography>Loading settings...</Typography>
        </div>
      </div>
    );
  }

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as (typeof TABS)[number]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          {(userRole === "admin" || userRole === "superadmin") && (
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <EditProfileForm user={user} profile={profile} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={getAvatarUrl(
                      profile?.avatar_url,
                      profile?.full_name || user?.email || ""
                    )}
                    alt={profile?.full_name || user?.email || ""}
                  />
                  <AvatarFallback className="text-lg">
                    {getInitials(profile?.full_name || user?.email || "")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{profile?.full_name || user?.email}</CardTitle>
                  <Typography variant="mutedText">{user?.email}</Typography>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Typography variant="smallText" className="font-medium">
                    Account Information
                  </Typography>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Typography
                        variant="smallText"
                        className="text-muted-foreground"
                      >
                        Role
                      </Typography>
                      <Typography variant="smallText">{userRole}</Typography>
                    </div>
                    <div className="flex justify-between">
                      <Typography
                        variant="smallText"
                        className="text-muted-foreground"
                      >
                        Email
                      </Typography>
                      <Typography variant="smallText">{user?.email}</Typography>
                    </div>
                    <div className="flex justify-between">
                      <Typography
                        variant="smallText"
                        className="text-muted-foreground"
                      >
                        Last Sign In
                      </Typography>
                      <Typography variant="smallText">
                        {user?.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleString()
                          : "N/A"}
                      </Typography>
                    </div>
                    <div className="flex justify-between">
                      <Typography
                        variant="smallText"
                        className="text-muted-foreground"
                      >
                        Created At
                      </Typography>
                      <Typography variant="smallText">
                        {user?.created_at
                          ? new Date(user.created_at).toLocaleString()
                          : "N/A"}
                      </Typography>
                    </div>
                  </div>
                </div>

                {(userRole === "admin" || userRole === "superadmin") && (
                  <div>
                    <Typography variant="smallText" className="font-medium">
                      Advanced Information
                    </Typography>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Typography
                          variant="smallText"
                          className="text-muted-foreground"
                        >
                          User ID
                        </Typography>
                        <Typography
                          variant="smallText"
                          className="font-mono text-xs"
                        >
                          {user?.id}
                        </Typography>
                      </div>
                      <div className="flex justify-between">
                        <Typography
                          variant="smallText"
                          className="text-muted-foreground"
                        >
                          Email Confirmed
                        </Typography>
                        <Typography variant="smallText">
                          {user?.email_confirmed_at ? "Yes" : "No"}
                        </Typography>
                      </div>
                      <div className="flex justify-between">
                        <Typography
                          variant="smallText"
                          className="text-muted-foreground"
                        >
                          Auth Provider
                        </Typography>
                        <Typography variant="smallText">
                          {user?.app_metadata?.provider || "email"}
                        </Typography>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {userRole !== "superadmin" && (
              <Card>
                <CardHeader>
                  <CardTitle>Superadmin Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <Typography variant="mutedText">
                    You need superadmin privileges to access these settings.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="permissions">
          {(userRole === "admin" || userRole === "superadmin") && (
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          Permission
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rolePermissions?.map((rp, index) => (
                        <tr key={index} className="border-b border-border">
                          <td className="px-4 py-3 text-sm">{rp.role}</td>
                          <td className="px-4 py-3 text-sm">{rp.permission}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
