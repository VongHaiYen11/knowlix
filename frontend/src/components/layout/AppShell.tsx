import { CalendarDays, Feather, Home, Library, LogOut, PanelLeftClose, PanelLeftOpen, Settings, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { APP_NAME } from '@/constants/app'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { ShellControlsProvider } from './ShellControlsContext'
import { cn } from '@/utils/cn'

const navItems = [
  { label: 'Home', href: ROUTES.home, icon: Home },
  { label: 'Library', href: ROUTES.library, icon: Library },
  { label: 'Research', href: ROUTES.research, icon: Sparkles },
  { label: 'Journal', href: ROUTES.journal, icon: CalendarDays },
  { label: 'Customization', href: ROUTES.customization, icon: SlidersHorizontal },
  { label: 'Settings', href: ROUTES.settings, icon: Settings },
]

function SidebarContent({ collapsed = false, onCollapseToggle, onNavigate }: { collapsed?: boolean; onCollapseToggle?: () => void; onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const active = (href: string) => (href === ROUTES.home ? pathname === href : pathname.startsWith(href))

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex gap-2.5 pb-8 pt-6', collapsed ? 'flex-col items-center px-3' : 'items-center px-5')}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Feather className="h-4 w-4" strokeWidth={1.75} />
        </span>
        {!collapsed && <span className="font-serif text-2xl leading-none tracking-tight">{APP_NAME}</span>}
        {onCollapseToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onCollapseToggle}
            className={cn('hidden md:inline-flex', !collapsed && 'ml-auto')}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        )}
        <ThemeToggle />
      </div>
      <nav className="flex-1 px-3" aria-label="Primary navigation">
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  'group flex items-center rounded-lg py-2 text-sm transition',
                  collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                  active(item.href) ? 'bg-sidebar-accent text-accent-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                )}
              >
                <item.icon className={cn('h-[18px] w-[18px] shrink-0', active(item.href) ? 'text-primary' : 'text-muted-foreground')} strokeWidth={1.75} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="px-3 pb-2">
        <div className={cn('flex items-center rounded-lg py-2.5', collapsed ? 'justify-center px-2' : 'gap-3 px-3')}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm text-accent-foreground">{user?.initials ?? 'U'}</span>
          {!collapsed && <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{user?.name ?? 'User'}</p>
              <p className="truncate text-xs text-muted-foreground">Private library</p>
            </div>
            <button
              onClick={() => void logout()}
              title="Logout"
              aria-label="Logout"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          </>}
        </div>
        {collapsed && (
          <button
            onClick={() => void logout()}
            title="Logout"
            aria-label="Logout"
            className="mt-1 flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn('sticky top-0 hidden h-screen shrink-0 border-r border-border bg-sidebar transition-[width] duration-200 md:block md:w-16', sidebarCollapsed ? 'xl:w-16' : 'xl:w-64')}>
        <div className="h-full xl:hidden">
          <SidebarContent collapsed onCollapseToggle={() => setMobileOpen(true)} />
        </div>
        <div className="hidden h-full xl:block">
          <SidebarContent collapsed={sidebarCollapsed} onCollapseToggle={() => setSidebarCollapsed((value) => !value)} />
        </div>
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button className="absolute inset-0 w-full bg-foreground/20" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 border-r border-border bg-sidebar shadow-xl">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="absolute right-3 top-6" aria-label="Close navigation">
              <X className="h-5 w-5" />
            </Button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <ShellControlsProvider value={{ openMobileNavigation: () => setMobileOpen(true) }}>
          <main className="flex-1">{children}</main>
        </ShellControlsProvider>
      </div>
    </div>
  )
}
