import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { createTab } from "./actions"
import Link from "next/link"
import { UserControls } from "@/components/user-controls"
import { Utensils, Coffee, LayoutGrid } from "lucide-react"
import AppLayout from "@/components/layouts/app-layout"
import { TableGrid } from "@/components/pos/table-grid"

export default async function ActiveTabsPage({ searchParams }: { searchParams: Promise<{ target?: string }> }) {
  const { target } = await searchParams || {}

  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const roleTypeMap: Record<string, string> = { CAFE_STAFF: "CAFE", CHAI_STAFF: "CHAI_JOINT" } 
  let outletSearch: any = {}
  
  if (session.user.role === "OWNER") {
    outletSearch = target ? { type: target } : {}
  } else {
    outletSearch = { type: roleTypeMap[session.user.role] }
  }

  const outlet = await prisma.outlet.findFirst({ where: outletSearch })

  let activeTabs: any[] = []
  if (outlet) {
    activeTabs = await prisma.tab.findMany({
      where: { outletId: outlet.id, status: { in: ["OPEN", "PAID_HOLD"] } },
      include: { Items: { include: { MenuItem: true } } },
      orderBy: { openedAt: "desc" }
    })
  }

  const isCafe = session.user.role === "CAFE_STAFF" || (session.user.role === "OWNER" && target === "CAFE")
  const isChai = session.user.role === "CHAI_STAFF" || (session.user.role === "OWNER" && target === "CHAI_JOINT")

  return (
    <AppLayout user={session?.user}>
      <div className={`${isCafe ? "selection:bg-orange-500/30 selection:text-orange-100" : "selection:bg-sky-500/30 selection:text-sky-100"} relative overflow-hidden flex flex-col items-center p-4 sm:p-8 min-h-full w-full bg-background`}>
        
        {/* Background Decorators */}
        <div className={`absolute top-[10%] left-[-10%] w-[500px] h-[500px] ${isCafe ? "bg-orange-600/10" : "bg-sky-600/10"} rounded-full blur-[150px] pointer-events-none z-0`}></div>
        <div className={`absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] ${isCafe ? "bg-amber-500/10" : "bg-blue-500/10"} rounded-full blur-[150px] pointer-events-none z-0`}></div>

        <div className="max-w-7xl w-full mx-auto space-y-8 relative z-10 flex-1 flex flex-col">
          
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-foreground/10 gap-4">
            <div className="flex items-center gap-4">
             <div className={`h-14 w-14 bg-gradient-to-br ${isCafe ? "from-orange-500 to-amber-600 shadow-[0_0_30px_-5px_oklch(0.65_0.22_25_/_0.5)]" : "from-sky-500 to-blue-600 shadow-[0_0_30px_-5px_rgba(14,165,233,0.5)]"} rounded-2xl flex items-center justify-center border border-foreground/10 p-1`}>
               <div className="h-full w-full bg-background/50 rounded-xl flex items-center justify-center backdrop-blur-md">
                 {isCafe ? <Utensils className="text-orange-400 w-6 h-6" /> : <Coffee className="text-sky-400 w-6 h-6" />}
               </div>
             </div>
            <div>
              <h1 className="text-4xl font-black text-foreground tracking-tight">POS Terminal</h1>
              <p className={`${isCafe ? "text-orange-500" : "text-sky-500"} font-black mt-1 tracking-widest uppercase text-xs`}>{outlet?.name || "Global"} Registers</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 sm:gap-4 items-center mt-4 sm:mt-0">
            {session.user.role === "OWNER" && (
               <Link href="/dashboard"><Button variant="outline" className="border-border text-slate-600 dark:text-slate-300 hover:bg-foreground/5 hover:text-foreground backdrop-blur-md font-black uppercase text-[10px] tracking-widest px-6 h-12 rounded-xl">Back to Dashboard</Button></Link>
            )}
            {session.user.role === "CAFE_STAFF" && (
               <Link href="/cafe"><Button variant="outline" className="border-border text-slate-600 dark:text-slate-300 hover:bg-foreground/5 hover:text-foreground backdrop-blur-md font-black uppercase text-[10px] tracking-widest px-6 h-12 rounded-xl">Back to Cafe Hub</Button></Link>
            )}
            {session.user.role === "CHAI_STAFF" && (
               <Link href="/chai"><Button variant="outline" className="border-border text-slate-600 dark:text-slate-300 hover:bg-foreground/5 hover:text-foreground backdrop-blur-md font-black uppercase text-[10px] tracking-widest px-6 h-12 rounded-xl">Back to Chai Hub</Button></Link>
            )}
            <UserControls />
          </div>
        </header>

        <div className={`flex flex-col md:flex-row justify-between items-center glass-panel p-6 rounded-3xl border border-foreground/10 ${isCafe ? "shadow-[0_20px_60px_-15px_rgba(245,158,11,0.1)]" : "shadow-[0_20px_60px_-15px_rgba(14,165,233,0.1)]"} gap-6`}>
           <div className="flex items-center gap-4">
             <div className={`w-14 h-14 rounded-2xl ${isCafe ? "bg-orange-500/20 border-orange-500/30" : "bg-sky-500/20 border-sky-500/30"} border flex items-center justify-center shadow-inner`}>
               <LayoutGrid className={`${isCafe ? "text-orange-400" : "text-sky-400"} w-7 h-7`} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-foreground tracking-tight">Table Layout</h2>
               <p className="text-muted-foreground text-sm font-black tracking-wide uppercase mt-1">Select a table to start billing.</p>
             </div>
           </div>
           
           <div className="flex items-center gap-6 px-6 py-3 bg-foreground/5 rounded-2xl border border-border">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Vacant</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Occupied</span>
                </div>
           </div>
        </div>

        <div className="w-full flex-1 pt-4">
            {outlet ? (
                <TableGrid activeTabs={activeTabs} outletId={outlet.id} isCafe={isCafe} />
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-black/20 rounded-[3rem] border-2 border-dashed border-foreground/5">
                    <LayoutGrid className="w-16 h-16 text-slate-700 mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest">No Outlet Assigned</p>
                </div>
            )}
        </div>
        
        </div>
      </div>
    </AppLayout>
  )
}

