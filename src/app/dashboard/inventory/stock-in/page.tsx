import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { logStockIn } from "./actions"
import { revertLedgerEntry } from "../actions"
import { Truck, Search, Undo2, History } from "lucide-react"
import { StockInForm } from "./StockInForm"
import { StockIntakeTabs } from "./StockIntakeTabs"
import { BulkStockManager } from "@/components/BulkStockManager"
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
import { formatTimeIST, formatDateIST } from "@/lib/utils"

export default async function StockInPage() {
  const session = await getServerSession(authOptions)
  const isOwner = session?.user?.role === "OWNER"

  const items = await prisma.item.findMany({ orderBy: { name: 'asc' } })
  const vendors = await prisma.vendor.findMany({ orderBy: { name: 'asc' } })
  const outlets = await prisma.outlet.findMany({ orderBy: { name: 'asc' } })

  const recentLogs = await prisma.inventoryLedger.findMany({
    where: { type: "STOCK_IN" },
    include: { Item: true, User: true, Vendor: true },
    orderBy: { createdAt: 'desc' },
    take: 15
  })

  return (
    <div className="space-y-8 relative">
      {/* Background Decorators */}
      <div className="absolute top-[20%] right-[-100px] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="glass-panel p-6 rounded-3xl relative z-10 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            Stock Intake
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
          </h2>
          <p className="text-muted-foreground mt-1 font-medium text-sm tracking-wide uppercase">Log new warehouse deliveries and update central inventory.</p>
        </div>
      </div>

      <div className="space-y-12 relative z-10">
        
        <StockIntakeTabs 
          singleForm={<StockInForm items={items} vendors={vendors} outlets={outlets} />}
          bulkManager={
            <BulkStockManager 
              items={JSON.parse(JSON.stringify(items))} 
              categories={Array.from(new Set(items.map((item: any) => item.category).filter(Boolean))) as string[]} 
              vendors={JSON.parse(JSON.stringify(vendors))}
              outlets={JSON.parse(JSON.stringify(outlets))}
            />
          }
        />

        {/* Recent Deliveries Overview Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <History className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Recent Deliveries Overview</h3>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest opacity-60">Last 15 warehouse entries</p>
            </div>
          </div>

          <div className="glass-panel rounded-3xl overflow-hidden flex flex-col border border-border/50">
            <div className="p-6 border-b border-border/50 bg-foreground/5 backdrop-blur-md flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest opacity-40">Transaction History</h3>
              {isOwner && (
                <span className="text-[10px] font-black tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full uppercase">
                  Revert available
                </span>
              )}
            </div>
            <div className="flex-1 overflow-auto max-h-[600px] p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/10 hover:bg-transparent">
                    <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20">Date / Time</TableHead>
                    <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20">Item</TableHead>
                    <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20 text-right">Qty In</TableHead>
                    <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20">Received By</TableHead>
                    {isOwner && (
                      <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px] h-12 bg-black/40 sticky top-0 z-20 text-center">Revert</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {recentLogs.length === 0 ? (
                     <TableRow className="border-b border-foreground/10">
                      <TableCell colSpan={isOwner ? 5 : 4} className="h-40 text-center text-slate-500">
                        <span className="flex flex-col items-center justify-center">
                          <Search className="w-8 h-8 opacity-20 mb-2" />
                          No recent incoming stock logged.
                        </span>
                      </TableCell>
                    </TableRow>
                   ) : (
                    recentLogs.map((log) => (
                      <TableRow key={log.id} className="border-b border-border/10 hover:bg-muted/30 transition-colors group">
                        <TableCell className="text-muted-foreground font-medium whitespace-nowrap text-sm">
                          <span className="text-foreground/80 dark:text-slate-300">{formatDateIST(log.createdAt)}</span> <span className="opacity-80 dark:opacity-50">{formatTimeIST(log.createdAt)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-foreground/90 group-hover:text-foreground transition-colors">{log.Item.name}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1">{log.Item.category || "Uncategorized"}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center text-emerald-400 font-black tracking-widest text-xs lg:text-sm drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                              +{log.quantity} <span className="text-[9px] lg:text-[10px] ml-1 opacity-70 uppercase font-black">{log.Item.piecesPerBox ? 'pcs' : log.Item.unit}</span>
                            </span>
                            {log.Item.piecesPerBox && (
                              <span className="text-[9px] text-emerald-500/50 font-black uppercase tracking-tighter -mt-0.5">
                                ({(log.quantity / log.Item.piecesPerBox).toFixed(1)} {log.Item.unit})
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm font-medium">{log.User.name}</TableCell>
                        {isOwner && (
                          <TableCell className="text-center">
                            <Dialog>
                              <DialogTrigger render={
                                <button className="p-2 rounded-xl text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all" title="Revert this stock entry" />
                              }>
                                <Undo2 className="w-4 h-4" />
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[400px] bg-background/95 backdrop-blur-2xl border-amber-500/20 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.15)]">
                                <DialogHeader className="mb-2">
                                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20">
                                    <Undo2 className="w-6 h-6 text-amber-400" />
                                  </div>
                                  <DialogTitle className="text-xl font-black text-foreground">Revert Stock Entry?</DialogTitle>
                                  <DialogDescription className="text-muted-foreground leading-relaxed">
                                    This will reverse the intake of <span className="text-emerald-500 font-bold">+{log.quantity} {log.Item.piecesPerBox ? 'pcs' : log.Item.unit}</span> of <span className="text-foreground font-bold">{log.Item.name}</span> and delete this ledger record.
                                  </DialogDescription>
                                </DialogHeader>
                                <form action={revertLedgerEntry} className="mt-4">
                                  <input type="hidden" name="ledgerId" value={log.id} />
                                  <Button type="submit" className="w-full h-11 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all active:scale-95">
                                    Yes, Revert Intake
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
    </div>
  )
}
