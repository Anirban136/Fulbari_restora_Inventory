"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  Store, 
  ClipboardList, 
  Receipt,
  Menu,
  X,
  Home,
  Coffee,
  History,
  Settings,
  LogOut,
  ChevronRight,
  Users,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Tags,
  Sun,
  Moon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserControls } from "@/components/user-controls"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

interface NavItem {
  name: string
  href: string
  icon: any
  roles?: string[]
}

export function UnifiedSidebar({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const getLogoHref = () => {
    if (user?.role === "CAFE_STAFF") return "/cafe"
    if (user?.role === "CHAI_STAFF") return "/chai"
    if (user?.role === "REST_STAFF") return "/restaurant"
    return "/dashboard"
  }

  // Close sidebar when route changes
  useEffect(() => {
    setIsOpen(false)
    setMounted(true)
  }, [pathname])

  const navItems: NavItem[] = [
    { name: "Home Dashboard", href: "/dashboard", icon: Home, roles: ["OWNER"] },
    { name: "Global Catalog", href: "/dashboard/inventory", icon: Package, roles: ["OWNER", "INV_MANAGER"] },
    { name: "Global Menus", href: "/dashboard/menus", icon: ClipboardList, roles: ["OWNER", "INV_MANAGER"] },
    { name: "Stock In", href: "/dashboard/inventory/stock-in", icon: Package, roles: ["OWNER", "INV_MANAGER"] },
    { name: "Dispatch", href: "/dashboard/inventory/dispatch", icon: ArrowLeftRight, roles: ["OWNER", "INV_MANAGER"] },
    { name: "Vendors", href: "/dashboard/vendors", icon: Users, roles: ["OWNER", "INV_MANAGER"] },
    { name: "Outlets Stock", href: "/dashboard/stores", icon: Store, roles: ["OWNER", "INV_MANAGER"] },
    { name: "Category Manager", href: "/dashboard/categories", icon: Tags, roles: ["OWNER", "INV_MANAGER"] },
    { name: "Chai Hub", href: "/chai", icon: Coffee, roles: ["OWNER", "CHAI_STAFF"] },
    { name: "Cafe Hub", href: "/cafe", icon: Coffee, roles: ["OWNER", "CAFE_STAFF"] },
    { name: "Restaurant", href: "/restaurant", icon: Store, roles: ["OWNER", "REST_STAFF"] },
    { name: "Transactions", href: "/dashboard/transactions", icon: Receipt, roles: ["OWNER"] },
    { name: "Waste Tracking", href: "/dashboard/inventory/waste", icon: Trash2, roles: ["OWNER", "INV_MANAGER"] },
    { name: "Passcode Control", href: "/dashboard/settings/passwords", icon: ShieldCheck, roles: ["OWNER"] },
    { name: "Database Reset", href: "/dashboard/wipe", icon: AlertTriangle, roles: ["OWNER"] },
  ]

  const filteredItems = navItems.filter(item => 
    !item.roles || (user?.role && item.roles.includes(user.role))
  )

  if (!user) return null

  return (
    <>
      {/* Mobile Top Header (Enlarged & Clickable Branding) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-20 px-8 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-3xl z-[45] shadow-2xl">
        <Link href={getLogoHref()} className="flex flex-col group active:scale-95 transition-transform">
          <h1 className="text-3xl font-black text-emerald-500 group-hover:text-emerald-400 tracking-tighter leading-none uppercase transition-colors">FULBARI</h1>
          <p className="text-[9px] font-black tracking-[0.4em] uppercase text-muted-foreground mt-2 opacity-100">Operations Unit</p>
        </Link>
        <div className="flex items-center gap-4">
          {mounted && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
              className="rounded-[1rem] w-12 h-12 border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-xl active:scale-90 transition-all flex items-center justify-center p-0"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          )}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-[1.5rem] w-14 h-14 border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-xl active:scale-90 transition-all flex items-center justify-center p-0"
          >
            {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </Button>
        </div>
      </div>

      {/* Desktop Sidebar / Mobile Overlay */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-[100] w-[85vw] md:w-80 lg:w-72 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Backdrop for mobile (High-Fidelity Blur) */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-foreground/30 lg:hidden backdrop-blur-md transition-opacity duration-500 cursor-pointer -z-10" 
            onClick={() => setIsOpen(false)}
          />
        )}

        <aside className={cn(
          "relative h-full flex flex-col border-r border-border bg-background/95 lg:bg-background/20 lg:backdrop-blur-none z-50 overflow-hidden transition-all duration-300 shadow-2xl",
          isOpen ? "shadow-[20px_0_60px_rgba(0,0,0,0.2)] dark:shadow-[20px_0_60px_rgba(0,0,0,0.9)]" : "shadow-none"
        )}>
          {/* Logo Section in Sidebar (Enlarged & Clickable) */}
          <div className="p-10 border-b border-border shrink-0 flex items-start justify-between">
            <Link href={getLogoHref()} className="group block active:scale-95 transition-transform">
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-400 dark:from-emerald-400 dark:to-teal-200 tracking-tighter uppercase leading-none group-hover:from-emerald-500 group-hover:to-teal-300 transition-all">FULBARI</h1>
                <p className="text-[10px] font-black tracking-[0.4em] uppercase text-muted-foreground mt-3 opacity-100">Operations Unit</p>
            </Link>
            {mounted && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
                className="w-10 h-10 rounded-xl border-border bg-foreground/[0.02] text-muted-foreground hover:text-primary transition-all shadow-sm"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            )}
          </div>
          
          {/* User Profile Hook */}
          <div className="p-8 border-b border-border bg-foreground/[0.02] shrink-0">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 p-0.5 shadow-xl">
                 <div className="w-full h-full rounded-[14px] bg-background flex items-center justify-center font-black text-emerald-700 dark:text-emerald-400 text-xl">
                    {user.name?.[0].toUpperCase()}
                 </div>
               </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-foreground text-base truncate uppercase tracking-tight">{user.name}</p>
                  <p className="text-[10px] font-black tracking-[0.2em] uppercase text-emerald-700 dark:text-emerald-400 mt-1 opacity-100">{user.role?.replace('_', ' ')}</p>
                </div>
             </div>
          </div>

          <nav data-lenis-prevent className="flex-1 overflow-y-auto p-6 lg:p-4 space-y-2 custom-scrollbar-premium lg:block">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={cn(
                    "flex items-center gap-4 px-5 py-5 lg:py-3.5 rounded-[1.5rem] transition-all duration-300 group relative overflow-hidden",
                    isActive 
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_10px_30px_rgba(16,185,129,0.1)]" 
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                  )}
                >
                  <item.icon className={cn(
                    "w-6 h-6 lg:w-5 lg:h-5 transition-transform group-hover:scale-110",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )} />
                  <span className="font-black tracking-tight text-base lg:text-sm uppercase">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)]" />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="p-8 border-t border-border bg-foreground/[0.01] shrink-0">
            <UserControls role={user.role} />
          </div>
        </aside>
      </div>
    </>
  )
}
