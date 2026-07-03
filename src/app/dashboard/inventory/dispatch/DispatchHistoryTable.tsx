"use client"

import { useState } from "react"
import { Search, Undo2, Edit, Coffee, Utensils, ChefHat, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { revertLedgerEntry, editDispatchQuantity } from "../actions"
import { cn } from "@/lib/utils"

export function DispatchHistoryTable({
  recentDispatches,
  outlets,
  isOwner
}: {
  recentDispatches: any[]
  outlets: any[]
  isOwner: boolean
}) {
  const [outletFilter, setOutletFilter] = useState<'ALL' | 'RESTAURANT' | 'CAFE' | 'CHAI_JOINT'>('ALL')
  const [searchQuery, setSearchQuery] = useState("")

  const filteredDispatches = recentDispatches.filter((log) => {
    const outlet = outlets.find(o => o.id === log.outletId)
    const matchesOutlet = 
      outletFilter === 'ALL' || 
      (outletFilter === 'RESTAURANT' && outlet?.type === 'RESTAURANT') ||
      (outletFilter === 'CAFE' && outlet?.type === 'CAFE') ||
      (outletFilter === 'CHAI_JOINT' && outlet?.type === 'CHAI_JOINT')
    
    const matchesSearch = 
      log.Item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.Item.category || "").toLowerCase().includes(searchQuery.toLowerCase())

    return matchesOutlet && matchesSearch
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* FILTER BAR */}
      {/* FILTER BAR */}
      <div className="p-4 lg:p-6 bg-muted/10 border-b border-border/10 flex flex-col lg:flex-row gap-4 lg:items-center justify-between sticky top-0 z-30 backdrop-blur-3xl">
        <div className="flex items-center gap-1 p-1 bg-black/40 rounded-2xl border border-foreground/5 overflow-x-auto no-scrollbar scroll-smooth w-full lg:w-fit group/filters">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOutletFilter('ALL')}
            className={cn(
              "rounded-xl h-9 px-4 text-[9px] font-black uppercase tracking-widest transition-all gap-2 flex-shrink-0",
              outletFilter === 'ALL' ? "bg-white text-black hover:bg-white shadow-lg" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-3 h-3" /> ALL
          </Button>
          <div className="w-[1px] h-4 bg-foreground/10 mx-1 hidden sm:block" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOutletFilter('RESTAURANT')}
            className={cn(
              "rounded-xl h-9 px-4 text-[9px] font-black uppercase tracking-widest transition-all gap-2 flex-shrink-0",
              outletFilter === 'RESTAURANT' ? "bg-rose-500 text-white hover:bg-rose-510 shadow-lg shadow-rose-500/20" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ChefHat className="w-3 h-3" /> Restaurant
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOutletFilter('CAFE')}
            className={cn(
              "rounded-xl h-9 px-4 text-[9px] font-black uppercase tracking-widest transition-all gap-2 flex-shrink-0",
              outletFilter === 'CAFE' ? "bg-amber-500 text-white hover:bg-amber-510 shadow-lg shadow-amber-500/20" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Utensils className="w-3 h-3" /> Cafe
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOutletFilter('CHAI_JOINT')}
            className={cn(
              "rounded-xl h-9 px-4 text-[9px] font-black uppercase tracking-widest transition-all gap-2 flex-shrink-0",
              outletFilter === 'CHAI_JOINT' ? "bg-blue-500 text-white hover:bg-blue-510 shadow-lg shadow-blue-500/20" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Coffee className="w-3 h-3" /> Chai Joint
          </Button>
        </div>

        <div className="relative group w-full lg:max-w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-blue-400 transition-colors" />
          <Input 
            placeholder="Search items..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-11 bg-black/40 border-foreground/10 rounded-2xl focus-visible:ring-blue-500/50 text-[10px] font-black uppercase tracking-[0.2em] placeholder:tracking-normal placeholder:font-medium shadow-inner"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto max-h-[600px] p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/10 hover:bg-transparent">
              <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20">Date / Time</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20">Item</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20">Destination</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20 text-right">Qty Out</TableHead>
              {isOwner && (
                <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] h-12 bg-muted/20 dark:bg-black/40 sticky top-0 z-20 text-center">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDispatches.length === 0 ? (
              <TableRow className="border-b border-foreground/10 hover:bg-transparent">
                <TableCell colSpan={isOwner ? 5 : 4} className="h-40 text-center text-muted-foreground">
                  <span className="flex flex-col items-center justify-center">
                    <Search className="w-8 h-8 opacity-20 mb-2" />
                    No shipments found matching these filters.
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              filteredDispatches.map((log) => {
                const destinationOutlet = outlets.find(o => o.id === log.outletId)
                return (
                  <TableRow key={log.id} className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors group">
                    <TableCell className="text-muted-foreground font-medium whitespace-nowrap text-xs">
                      <span className="text-foreground block">{formatDateIST(log.createdAt)}</span>
                      <span className="opacity-50 text-[10px]">{formatTimeIST(log.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-foreground/90 group-hover:text-foreground transition-colors text-sm">{log.Item.name}</div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mt-0.5">{log.Item.category || "Uncategorized"}</div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "font-black tracking-tighter uppercase text-[10px] px-2 py-0.5 rounded-md",
                        destinationOutlet?.type === 'RESTAURANT' ? "bg-rose-500/10 text-rose-500" :
                        destinationOutlet?.type === 'CAFE' ? "bg-amber-500/10 text-amber-500" :
                        destinationOutlet?.type === 'CHAI_JOINT' ? "bg-blue-500/10 text-blue-500" :
                        "bg-foreground/5 text-muted-foreground"
                      )}>
                        {destinationOutlet?.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className="inline-flex items-center text-blue-400 font-black tracking-widest text-xs lg:text-sm drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                          {log.quantity} <span className="text-[9px] lg:text-[10px] ml-1 opacity-70 uppercase">{log.Item.piecesPerBox ? 'pcs' : log.Item.unit}</span>
                        </span>
                        {log.Item.piecesPerBox && (
                          <span className="text-[9px] text-blue-500/50 font-black uppercase tracking-tighter -mt-0.5">
                            ({(log.quantity / log.Item.piecesPerBox).toFixed(1)} {log.Item.unit})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-center">
                         <div className="flex items-center justify-center gap-2">
                           {/* Edit Dialog */}
                           <Dialog>
                             <DialogTrigger>
                               <div className="p-2 rounded-xl text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all cursor-pointer">
                                 <Edit className="w-4 h-4" />
                               </div>
                             </DialogTrigger>
                             <DialogContent className="sm:max-w-[400px] bg-black/90 backdrop-blur-2xl border-blue-500/20 rounded-3xl shadow-[0_0_50px_rgba(59,130,246,0.15)]">
                               <DialogHeader className="mb-2">
                                 <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
                                   <Edit className="w-6 h-6 text-blue-400" />
                                 </div>
                                 <DialogTitle className="text-xl font-black text-foreground text-left">Edit Dispatch Quantity</DialogTitle>
                                 <DialogDescription className="text-muted-foreground leading-relaxed text-left">
                                   Modify the dispatched quantity of <span className="text-foreground font-bold">{log.Item.name}</span> to <span className="text-foreground font-bold">{destinationOutlet?.name}</span>. Currently dispatched: <span className="text-blue-400 font-bold">{log.quantity} {log.Item.piecesPerBox ? 'pcs' : log.Item.unit}</span>.
                                 </DialogDescription>
                               </DialogHeader>
                               <form action={editDispatchQuantity} className="mt-4 space-y-4">
                                 <input type="hidden" name="ledgerId" value={log.id} />
                                 <div className="space-y-2">
                                   <label htmlFor={`edit-qty-${log.id}`} className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">New Quantity</label>
                                   <Input 
                                     id={`edit-qty-${log.id}`}
                                     name="newQuantity" 
                                     type="number" 
                                     step="0.01" 
                                     min="0.01" 
                                     defaultValue={log.quantity}
                                     required
                                     className="h-12 bg-background border-border text-foreground rounded-xl focus-visible:ring-blue-500/50 shadow-inner"
                                   />
                                 </div>
                                 <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all active:scale-95">
                                   Save Changes
                                 </Button>
                               </form>
                             </DialogContent>
                           </Dialog>

                           {/* Revert Dialog */}
                           <Dialog>
                             <DialogTrigger>
                               <div className="p-2 rounded-xl text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all cursor-pointer">
                                 <Undo2 className="w-4 h-4" />
                               </div>
                             </DialogTrigger>
                             <DialogContent className="sm:max-w-[400px] bg-black/90 backdrop-blur-2xl border-amber-500/20 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.15)]">
                               <DialogHeader className="mb-2">
                                 <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20">
                                   <Undo2 className="w-6 h-6 text-amber-400" />
                                 </div>
                                 <DialogTitle className="text-xl font-black text-foreground text-left">Revert Dispatch?</DialogTitle>
                                 <DialogDescription className="text-muted-foreground leading-relaxed text-left">
                                   This will reverse the dispatch of <span className="text-blue-400 font-bold">{log.quantity} {log.Item.piecesPerBox ? 'pcs' : log.Item.unit}</span> of <span className="text-foreground font-bold">{log.Item.name}</span> to <span className="text-foreground font-bold">{destinationOutlet?.name}</span>. central stock will be restored.
                                 </DialogDescription>
                               </DialogHeader>
                               <form action={revertLedgerEntry} className="mt-4">
                                 <input type="hidden" name="ledgerId" value={log.id} />
                                 <Button type="submit" className="w-full h-11 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all active:scale-95">
                                   Yes, Revert Dispatch
                                 </Button>
                               </form>
                             </DialogContent>
                           </Dialog>
                         </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
