import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revertWasteEntry } from "./actions"
import { Search, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WasteForm } from "./WasteForm"
import { WasteTimeFilter } from "./WasteTimeFilter"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatTimeIST, formatDateIST, getISTDateBounds } from "@/lib/utils"

import { HeroHeader } from "@/components/ui/hero-header"

export default async function WasteTrackingPage({ searchParams }: { searchParams: { filter?: string } }) {
  const session = await getServerSession(authOptions)
  const isOwner = session?.user?.role === "OWNER"

  const filter = searchParams?.filter || "all"

  let dateQuery = {}
  
  if (filter === "today") {
    const { startUTC, endUTC } = getISTDateBounds(new Date())
    dateQuery = { gte: startUTC, lte: endUTC }
  } else if (filter === "7d") {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    dateQuery = { gte: d }
  } else if (filter === "30d") {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    dateQuery = { gte: d }
  }

  const items = await prisma.item.findMany({ orderBy: { name: 'asc' } })
  const vendors = await prisma.vendor.findMany({ orderBy: { name: 'asc' } })
  const outlets = await prisma.outlet.findMany({
    include: {
      Stock: {
        include: { Item: true }
      }
    },
    orderBy: { name: 'asc' }
  })
  
  const whereClause: any = { type: "WASTE" }
  if (Object.keys(dateQuery).length > 0) {
     whereClause.createdAt = dateQuery
  }

  const recentLogs = await prisma.inventoryLedger.findMany({
    where: whereClause,
    include: { Item: true, User: true, Vendor: true },
    orderBy: { createdAt: 'desc' },
    take: filter === "all" ? 50 : undefined
  })

  return (
    <div className="space-y-8 relative">
      
      <HeroHeader 
        title="Waste"
        highlightedWord="Tracking"
        subtitle="Deduct damaged stock and penalize vendor balances."
        badgeText="Loss Mitigation"
        icon={<Undo2 className="w-6 h-6 text-foreground" />}
        colorGradient="from-red-500/50 to-rose-500"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Form */}
        <WasteForm items={items} vendors={vendors} outlets={outlets} />

        {/* Right Table */}
        <div className="lg:col-span-2 glass-panel rounded-3xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border/50 bg-foreground/5 backdrop-blur-md flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground tracking-wide">Recent Waste / Spoilage</h3>
            <div className="flex items-center gap-3">
              <WasteTimeFilter />
              {isOwner && (
                <span className="text-[10px] hidden sm:inline-block font-black tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full uppercase">
                  Revert available
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto max-h-[600px] p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/10 hover:bg-transparent">
                  <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20">Date / Time</TableHead>
                  <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20">Item & Notes</TableHead>
                  <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20">Vendor Logged</TableHead>
                  <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20 text-right">Lost Qty</TableHead>
                  <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20">Discarded By</TableHead>
                  {isOwner && (
                    <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20 text-center">Revert</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                 {recentLogs.length === 0 ? (
                   <TableRow className="border-b border-foreground/10">
                    <TableCell colSpan={isOwner ? 6 : 5} className="h-40 text-center text-slate-500">
                      <span className="flex flex-col items-center justify-center">
                        <Search className="w-8 h-8 opacity-20 mb-2" />
                        No recent waste logs found.
                      </span>
                    </TableCell>
                  </TableRow>
                 ) : (
                  recentLogs.map((log) => (
                    <TableRow key={log.id} className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors group">
                      <TableCell className="text-slate-500 font-medium whitespace-nowrap text-sm">
                        <span className="text-slate-300">{formatDateIST(log.createdAt)}</span> <span className="opacity-50">{formatTimeIST(log.createdAt)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-foreground/90 group-hover:text-foreground transition-colors">{log.Item.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1">{log.notes}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-bold text-slate-300">{log.Vendor?.name || "None"}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex text-red-400 font-black tracking-widest text-sm drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]">
                          -{log.quantity} <span className="text-[10px] ml-1 opacity-70 uppercase font-black">{log.Item.piecesPerBox ? 'pcs' : log.Item.unit}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm font-medium">{log.User.name}</TableCell>
                      {isOwner && (
                        <TableCell className="text-center">
                          <Dialog>
                            <DialogTrigger render={
                              <button className="p-2 rounded-xl text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all" title="Revert this waste entry" />
                            }>
                              <Undo2 className="w-4 h-4" />
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[400px] bg-black/90 backdrop-blur-2xl border-amber-500/20 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.15)]">
                              <DialogHeader className="mb-2">
                                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20">
                                  <Undo2 className="w-6 h-6 text-amber-400" />
                                </div>
                                <DialogTitle className="text-xl font-black text-foreground">Revert Waste Entry?</DialogTitle>
                                <DialogDescription className="text-muted-foreground leading-relaxed">
                                  This will restore <span className="text-emerald-500 font-bold">+{log.quantity} {log.Item.piecesPerBox ? 'pcs' : log.Item.unit}</span> of <span className="text-foreground font-bold">{log.Item.name}</span> back into the main stock and remove the vendor penalty.
                                </DialogDescription>
                              </DialogHeader>
                              <form action={revertWasteEntry} className="mt-4">
                                <input type="hidden" name="ledgerId" value={log.id} />
                                <Button type="submit" className="w-full h-11 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all active:scale-95">
                                  Yes, Revert Waste
                                </Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                 )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
