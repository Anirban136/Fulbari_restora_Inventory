import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { addMenuItem, toggleMenuItem, deleteMenuItem } from "./actions"
import { MenuSquare } from "lucide-react"
import { AddMenuItemForm } from "./AddMenuItemForm"
import { MenuManagementTable } from "./MenuManagementTable"
import { HeroHeader } from "@/components/ui/hero-header"

export default async function MenusPage() {
  const outlets = await prisma.outlet.findMany({
    where: { type: { in: ["CAFE", "CHAI_JOINT"] } },
    orderBy: { name: 'asc' }
  })
  
  const menuItems = await prisma.menuItem.findMany({
    include: { 
      Outlet: true, 
      ingredients: {
        include: {
          Item: true
        }
      } 
    },
    orderBy: [ { Outlet: { name: 'asc' } }, { categoryId: 'asc' }, { name: 'asc' } ]
  })

  // Filter out any data with missing required relations to prevent crashes
  const validMenuItems = menuItems.filter(item => item.Outlet)

  const globalItems = await prisma.item.findMany({ orderBy: { name: 'asc' } })

  const existingCategories = Array.from(new Set(validMenuItems.map((item: any) => item.categoryId).filter(Boolean))) as string[]

  return (
    <div className="space-y-12 relative pb-20">
      <HeroHeader 
        title="Menu"
        highlightedWord="Management"
        subtitle="Configure POS menus, formulate pricing, and manage recipes for operational hubs."
        badgeText="Sales Catalog"
        icon={<MenuSquare className="w-6 h-6 text-foreground" />}
        colorGradient="from-indigo-500/50 to-purple-500"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 relative z-10">
        
        {/* ADD MENU FORM */}
        <div className="glass-panel p-6 sm:p-8 rounded-[2.5rem] self-start border border-foreground/10 bg-foreground/[0.03] shadow-2xl backdrop-blur-3xl transition-all">
          <div className="flex items-center gap-4 mb-8">
             <div className="h-12 w-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)]">
               <MenuSquare className="w-6 h-6 text-indigo-500" />
             </div>
             <h3 className="text-xl font-bold text-foreground">Add Menu Item</h3>
          </div>
          
          <AddMenuItemForm outlets={outlets} globalItems={globalItems} existingCategories={existingCategories} />
        </div>

        {/* MENU LIST (Filterable Client Table) */}
        <div className="xl:col-span-2 glass-panel rounded-[3rem] overflow-hidden flex flex-col border border-foreground/10 bg-foreground/[0.03] shadow-3xl backdrop-blur-3xl">
          <MenuManagementTable 
            menuItems={validMenuItems} 
            outlets={outlets} 
            globalItems={globalItems} 
            existingCategories={existingCategories} 
          />
        </div>
      </div>
    </div>
  )
}
