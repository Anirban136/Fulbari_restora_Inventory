import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ManualBulkDispatch } from "@/components/ManualBulkDispatch"
import { DispatchHistoryTable } from "./DispatchHistoryTable"
import { ArrowRightLeft, History } from "lucide-react"
import { HeroHeader } from "@/components/ui/hero-header"

export default async function DispatchPage() {
  const session = await getServerSession(authOptions)
  const isOwner = session?.user?.role === "OWNER"

  const [items, outlets, recentDispatches] = await Promise.all([
    prisma.item.findMany({ 
      orderBy: { name: 'asc' } 
    }),
    prisma.outlet.findMany({ orderBy: { name: 'asc' } }),
    prisma.inventoryLedger.findMany({
      where: { type: "DISPATCH" },
      include: { Item: true, Outlet: true, User: true },
      orderBy: { createdAt: 'desc' },
      take: 50 // Increased limit for better filtering experience
    })
  ])

  return (
    <div className="space-y-8 relative pb-20">
      
      <HeroHeader 
        title="Dispatch"
        highlightedWord="Operations"
        subtitle="Send bulk inventory from Central Store to Outlets."
        badgeText="Logistics"
        icon={<ArrowRightLeft className="w-6 h-6 text-foreground" />}
        colorGradient="from-blue-500/50 to-sky-500"
      />

      <div className="space-y-12 relative z-10">
        
        {/* Bulk Dispatch Spreadsheet */}
        <ManualBulkDispatch 
          existingItems={items} 
          outlets={outlets} 
        />

        {/* History Table */}
        <div className="space-y-6 pt-8">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
              <History className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Recent Dispatches Overview</h3>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest opacity-60">Last 50 warehouse shipments</p>
            </div>
          </div>

          <div className="glass-panel rounded-3xl overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-6 border-b border-border/50 bg-foreground/5 backdrop-blur-md flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground tracking-wide uppercase">Dispatch History LEDGER</h3>
              {isOwner && (
                <span className="text-[10px] font-black tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full uppercase">
                  Revert available
                </span>
              )}
            </div>
            
            <DispatchHistoryTable 
              recentDispatches={recentDispatches} 
              outlets={outlets} 
              isOwner={isOwner} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
