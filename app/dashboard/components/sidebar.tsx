'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Users, 
  Settings, 
  LogOut,
  ChefHat
} from 'lucide-react'
import { signout } from '@/app/auth/actions'

export default function Sidebar() {
  const pathname = usePathname()
  
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }
  
  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
    },
    {
      name: 'Users',
      href: '/dashboard/users',
      icon: Users,
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
    },
  ]
  
  return (
    <aside className="w-64 bg-card border-r border-border h-screen flex flex-col">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <ChefHat className="h-6 w-6" />
        <h1 className="text-xl font-bold">CateringHub</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive(item.href)
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
      
      <div className="p-4 border-t border-border">
        <form action={signout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
