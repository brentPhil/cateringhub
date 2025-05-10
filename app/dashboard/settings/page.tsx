import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/app/auth/actions'

export default async function SettingsPage() {
  const supabase = await createClient()
  const userRole = await getUserRole()
  
  // Fetch role permissions
  const { data: rolePermissions } = await supabase
    .from('role_permissions')
    .select('*')
    .order('role', { ascending: true })
    .order('permission', { ascending: true })
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>
      
      <div className="grid gap-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Role:</span> {userRole}
            </p>
          </div>
        </div>
        
        {(userRole === 'admin' || userRole === 'superadmin') && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Role Permissions</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Permission</th>
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
          </div>
        )}
        
        {userRole !== 'superadmin' && (
          <div className="rounded-lg border border-border bg-card p-6 bg-muted/20">
            <h2 className="text-xl font-semibold mb-4">Superadmin Settings</h2>
            <p className="text-sm text-muted-foreground">
              You need superadmin privileges to access these settings.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
