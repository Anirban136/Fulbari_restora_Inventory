import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AddItemDialog } from "./AddItemDialog"
import { GlobalCatalogFeed } from "./GlobalCatalogFeed"
import { Layers } from "lucide-react"
import { BulkStockManager } from "@/components/BulkStockManager"

export default async function GlobalCatalogPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role || ""
  const isOwner = role === "OWNER"
  const isManager = role === "INV_MANAGER"

  const items = await prisma.item.findMany({
    orderBy: { name: 'asc' }
  })

  const vendors = await prisma.vendor.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  // Gather unique categories dynamically from the existing catalog
  const existingCategories = Array.from(new Set(items.map((item: any) => item.category).filter(Boolean))) as string[]

  return (
    <div className="space-y-6 lg:space-y-12 relative pb-20 max-w-[1600px] mx-auto overflow-x-visible">
      {/* Background Decorators */}
      <div className="absolute top-[-100px] right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none -z-10"></div>
      
      {/* Header Section */}
      <header className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 lg:gap-8 pt-4 lg:pt-0">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex p-4 bg-primary/10 rounded-3xl border border-primary/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
               <Layers className="text-primary w-6 h-6 lg:w-8 lg:h-8" />
             </div>
             <div className="flex flex-col">
               <h2 className="text-3xl lg:text-7xl font-black tracking-tighter text-foreground leading-tight uppercase">
                 GLOBAL <span className="text-primary">CATALOG</span>
               </h2>
                <p className="text-muted-foreground mt-2 font-black text-[9px] lg:text-xs tracking-[0.3em] uppercase opacity-90 dark:opacity-60 flex items-center gap-2">
                  <Layers className="sm:hidden w-3 h-3 text-primary" />
                  REPOSITORY CONTROL • PRODUCT MANAGEMENT
                </p>
             </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 min-w-0 lg:min-w-[240px] w-full sm:w-auto self-start md:self-end">
          <AddItemDialog existingCategories={existingCategories} />
        </div>
      </header>

      {/* Bulk Stock Management */}
      {(isOwner || isManager) && (
        <div className="w-full">
          <BulkStockManager items={JSON.parse(JSON.stringify(items))} categories={existingCategories} vendors={JSON.parse(JSON.stringify(vendors))} />
        </div>
      )}

      {/* Main Dynamic Table Feed (Client Component) */}
      <div className="w-full">
        <GlobalCatalogFeed 
          items={items} 
          categories={existingCategories} 
          isOwner={isOwner}
          isManager={isManager}
        />
      </div>
    </div>
  )
}
