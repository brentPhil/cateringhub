import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/app/auth/actions";
import { Typography } from "@/components/ui/typography";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function UsersPage() {
  const supabase = await createClient();
  const userRole = await getUserRole();

  // Check if user has permission to access this page
  if (userRole !== "admin" && userRole !== "superadmin") {
    redirect("/dashboard");
  }

  // Fetch users with their roles
  const { data: users } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      updated_at,
      user_roles (
        role
      )
    `
    )
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users Management</h1>
      </div>

      <div className="rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr key={user.id} className="border-b border-border">
                  <td className="px-4 py-3 text-sm">
                    {user.full_name || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{user.id}</td>
                  <td className="px-4 py-3 text-sm">
                    {user.user_roles?.[0]?.role || "user"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {user.updated_at
                      ? new Date(user.updated_at).toLocaleDateString()
                      : "N/A"}
                  </td>
                </tr>
              ))}

              {!users?.length && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-center text-sm text-muted-foreground"
                  >
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
