import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/app/auth/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { UserRoleData } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userRoleData = await getUserRole();

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  // Format role display
  const formatRoleDisplay = (roleData: UserRoleData | null) => {
    if (!roleData) return "user";

    const { role, provider_role } = roleData;

    if (role === "catering_provider" && provider_role) {
      return `${role} (${provider_role})`;
    }

    return role;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {profile?.full_name || user?.email}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Typography variant="smallText">
              <span className="font-medium">Email:</span> {user?.email}
            </Typography>
            <Typography variant="smallText">
              <span className="font-medium">Role:</span>{" "}
              {formatRoleDisplay(userRoleData)}
            </Typography>
            {userRoleData?.role === "catering_provider" &&
              userRoleData?.provider_role && (
                <Typography variant="smallText">
                  <span className="font-medium">Provider Type:</span>{" "}
                  {userRoleData.provider_role}
                </Typography>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Typography variant="smallText">
              <span className="font-medium">Last Login:</span>{" "}
              {new Date(user?.last_sign_in_at || "").toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
