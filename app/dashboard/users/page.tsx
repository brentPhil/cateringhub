import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/app/auth/actions";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, UserPlus } from "lucide-react";

// Define types for our data
type UserRole = {
  role: string;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  updated_at: string | null;
  user_roles: UserRole[];
};

export default async function UsersPage() {
  const supabase = await createClient();
  const userRole = await getUserRole();

  // Check if user has permission to access this page
  if (userRole !== "admin" && userRole !== "superadmin") {
    redirect("/dashboard");
  }

  // Fetch users with their roles
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, updated_at")
    .order("updated_at", { ascending: false });

  let users: UserProfile[] = [];
  let error = profilesError;

  if (profilesData && !profilesError) {
    // Fetch roles for each user
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      error = rolesError;
    } else if (rolesData) {
      // Combine the data
      users = profilesData.map((profile) => {
        const userRoles = rolesData.filter(
          (role) => role.user_id === profile.id
        );
        return {
          ...profile,
          user_roles: userRoles.map((r) => ({ role: r.role })),
        };
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Typography variant="h3">Users Management</Typography>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load users: {error.message}
          </AlertDescription>
        </Alert>
      )}

      <Table>
        <TableCaption>A list of all users in the system.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                {user.full_name || "N/A"}
              </TableCell>
              <TableCell className="font-mono text-xs">{user.id}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    user.user_roles?.[0]?.role === "admin"
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : user.user_roles?.[0]?.role === "superadmin"
                      ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      : "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  }`}
                >
                  {user.user_roles?.[0]?.role || "user"}
                </span>
              </TableCell>
              <TableCell>
                {user.updated_at
                  ? new Date(user.updated_at).toLocaleDateString()
                  : "N/A"}
              </TableCell>
            </TableRow>
          ))}

          {!users?.length && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground"
              >
                No users found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
