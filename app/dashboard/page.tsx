import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/app/auth/actions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userRole = await getUserRole()
  
  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {profile?.full_name || user?.email}</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Email:</span> {user?.email}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Role:</span> {userRole}
            </p>
          </div>
        </div>
        
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Last Login:</span> {new Date(user?.last_sign_in_at || '').toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
