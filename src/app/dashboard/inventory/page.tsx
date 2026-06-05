import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AddItemDialog } from "./AddItemDialog"
import { GlobalCatalogFeed } from "./GlobalCatalogFeed"
import { Layers } from "lucide-react"
import { HeroHeader } from "@/components/ui/hero-header"

export default async function GlobalCatalogPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role || ""
  const isOwner = role === "OWNER" || role === "ADMIN"
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
      
      <HeroHeader 
        title="Global"
        highlightedWord="Catalog"
        subtitle="Manage the master product registry, stock definitions, and global item categorization."
        badgeText="Repository Control"
        icon={<Layers className="w-6 h-6 text-foreground" />}
        sideComponent={<AddItemDialog existingCategories={existingCategories} />}
        colorGradient="from-emerald-500/50 to-primary"
      />

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
