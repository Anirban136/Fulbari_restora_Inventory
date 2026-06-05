import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { addMenuItem, toggleMenuItem, deleteMenuItem } from "./actions"
import { MenuSquare } from "lucide-react"
import { AddMenuItemForm } from "./AddMenuItemForm"
import { MenuManagementTable } from "./MenuManagementTable"

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
    <div className="space-y-8 relative">
      <div className="absolute top-[30%] left-[80%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[130px] pointer-events-none -translate-x-1/2"></div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10 glass-panel p-6 rounded-3xl">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            Menu Management
            <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_10px_#6366f1]"></div>
          </h2>
          <p className="text-muted-foreground mt-1 font-medium text-sm tracking-wide uppercase">Configure pricing and establish POS menus for the Cafe and Chai Joint.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 relative z-10">
        
        {/* ADD MENU FORM */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl self-start hover:border-foreground/20 transition-all">
          <div className="flex items-center gap-4 mb-8">
             <div className="h-12 w-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)]">
               <MenuSquare className="w-6 h-6 text-indigo-500" />
             </div>
             <h3 className="text-xl font-bold text-foreground">Add Menu Item</h3>
          </div>
          
          <AddMenuItemForm outlets={outlets} globalItems={globalItems} existingCategories={existingCategories} />
        </div>

        {/* MENU LIST (Filterable Client Table) */}
        <div className="xl:col-span-2 glass-panel rounded-3xl overflow-hidden flex flex-col">
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
