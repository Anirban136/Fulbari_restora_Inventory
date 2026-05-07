"use client"

import { useState, useMemo } from "react"
import { Search, Package, Trash2, AlertTriangle, Layers, Edit2, CheckCircle2, IndianRupee, BarChart2, ShieldAlert, LayoutGrid, Trash } from "lucide-react"
import { DeleteVerificationDialog } from "@/components/DeleteVerificationDialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { EditItemDialog } from "./EditItemDialog"
import { removeItem } from "./actions"
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
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function GlobalCatalogFeed({ 
  items, 
  categories, 
  isOwner, 
  isManager 
}: { 
  items: any[]
  categories: string[]
  isOwner: boolean
  isManager: boolean
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("ALL")
  const [itemToDelete, setItemToDelete] = useState<any>(null)

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category || "").toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = activeCategory === "ALL" || item.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [items, searchTerm, activeCategory])

  return (
    <div className="flex flex-col h-full bg-card rounded-[2.5rem] border border-border overflow-hidden backdrop-blur-xl">
      {/* 1. STICKY FILTER BAR (Shared Design Pattern) */}
      <div className="p-4 lg:p-6 bg-foreground/5 border-b border-border flex flex-col lg:flex-row gap-6 lg:items-center justify-between sticky top-0 z-30 backdrop-blur-3xl">
        <div className="flex items-center gap-1 p-1 bg-foreground/5 rounded-2xl border border-border overflow-x-auto no-scrollbar scroll-smooth w-full lg:w-fit group/filters">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveCategory("ALL")}
            className={cn(
              "rounded-xl h-9 px-4 text-[9px] font-black uppercase tracking-widest transition-all gap-2 flex-shrink-0",
              activeCategory === 'ALL' ? "bg-primary text-primary-foreground hover:bg-primary shadow-lg" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> All Products
          </Button>
          <div className="w-[1px] h-4 bg-border mx-1 hidden sm:block" />
          {categories.map(cat => (
            <Button
              key={cat}
              variant="ghost"
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-xl h-9 px-4 text-[9px] font-black uppercase tracking-widest transition-all gap-2 flex-shrink-0",
                activeCategory === cat ? "bg-primary text-primary-foreground hover:bg-primary shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {cat}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative group w-full lg:max-w-[320px]">
            <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", searchTerm ? "text-primary" : "text-muted-foreground/30")} />
            <Input 
              placeholder="Search products or categories..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 pl-12 bg-background border-border rounded-2xl focus-visible:ring-primary/50 text-[10px] font-black uppercase tracking-[0.2em] placeholder:tracking-normal placeholder:font-medium shadow-inner transition-all"
            />
          </div>
          <div className="hidden lg:flex items-center gap-3 px-5 py-2.5 bg-primary/10 border border-primary/20 rounded-2xl">
             <Layers className="w-4 h-4 text-primary" />
             <span className="text-[10px] font-black text-primary uppercase tracking-widest">{filteredItems.length} Products</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN DATA CONTAINER (Responsive Views) */}
      <div className="flex-1 overflow-auto custom-scrollbar-premium p-0 max-h-[800px]">
        
        {/* MOBILE CARD VIEW: Visible only on small/medium screens */}
        <div className="lg:hidden p-4 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <Package className="w-16 h-16" />
              <p className="font-black uppercase tracking-[0.5em] text-xs">Repository Empty</p>
            </div>
          ) : (
            <>
              {filteredItems.map(item => {
              const isCritical = item.minStock > 0 && item.currentStock <= 0
              const isLow = item.minStock > 0 && item.currentStock <= item.minStock
              const hasConversion = item.piecesPerBox > 0

              return (
                <div 
                  key={item.id}
                  className={cn(
                    "relative overflow-hidden group bg-foreground/[0.03] border border-border rounded-3xl p-5 transition-all active:scale-[0.98]",
                    isCritical ? "border-red-500/20 bg-red-500/[0.02]" : isLow ? "border-amber-500/20 bg-amber-500/[0.02]" : ""
                  )}
                >
                  {/* Item Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-base font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors leading-tight">
                        {item.name}
                      </h3>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest bg-foreground/5 px-2 py-0.5 rounded-md self-start border border-border">
                        {item.category || "GENERAL"}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                       <EditItemDialog item={item} existingCategories={categories} isOwner={isOwner} isManager={isManager} />
                       {(isOwner || isManager) && (
                          <button 
                            onClick={() => setItemToDelete(item)}
                            className="p-2.5 rounded-xl bg-red-500/5 text-red-500/40 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20" 
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                       )}
                    </div>
                  </div>

                  {/* Stock Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-foreground/5 rounded-2xl p-4 border border-border">
                      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-90 dark:opacity-60">Current Stock</p>
                      <div className="flex items-end gap-2">
                         <span className={cn(
                           "text-2xl font-black tracking-tighter leading-none",
                           isCritical ? "text-red-500" : isLow ? "text-amber-500" : "text-foreground"
                         )}>
                           {item.currentStock}
                         </span>
                         <span className="text-[9px] font-black text-muted-foreground/50 mb-0.5">{hasConversion ? 'PCS' : item.unit}</span>
                      </div>
                    </div>

                    <div className="bg-foreground/5 rounded-2xl p-4 border border-border flex flex-col justify-center">
                       <p className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest mb-1">Price Point</p>
                       <div className="flex flex-col">
                          <span className="text-sm font-black text-primary leading-tight">₹{item.sellPrice?.toFixed(0)}</span>
                          <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest mt-0.5">EST. SELL</span>
                       </div>
                    </div>
                  </div>

                  {/* Footer Status */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                     <div className="flex items-center gap-2">
                        {isLow ? (
                          <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-full",
                            isCritical ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                          )}>
                             <AlertTriangle className="w-3 h-3" />
                             <span className="text-[8px] font-black uppercase tracking-widest">
                               {isCritical ? "Out of Stock" : "Low Inventory"}
                             </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
                             <CheckCircle2 className="w-3 h-3" />
                             <span className="text-[8px] font-black uppercase tracking-widest">Healthy</span>
                          </div>
                        )}
                     </div>
                     {hasConversion && (
                       <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-wider italic">
                         {item.piecesPerBox} PIECES PER {item.unit}
                       </span>
                     )}
                  </div>
                </div>
              )
            })}
            </>
          )}
        </div>

        {/* DESKTOP TABLE VIEW: Visible only on large screens */}
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="px-8 font-black text-muted-foreground/80 dark:text-muted-foreground/40 uppercase tracking-[0.3em] text-[10px] h-14 bg-foreground/5 sticky top-0 z-20 border-r border-border">Product Detail</TableHead>
                <TableHead className="px-8 font-black text-muted-foreground/80 dark:text-muted-foreground/40 uppercase tracking-[0.3em] text-[10px] h-14 bg-foreground/5 sticky top-0 z-20 border-r border-border">Category</TableHead>
                <TableHead className="px-8 font-black text-muted-foreground/80 dark:text-muted-foreground/40 uppercase tracking-[0.3em] text-[10px] h-14 bg-foreground/5 sticky top-0 z-20 text-center border-r border-border">Inventory Status</TableHead>
                <TableHead className="px-8 font-black text-muted-foreground/80 dark:text-muted-foreground/40 uppercase tracking-[0.3em] text-[10px] h-14 bg-foreground/5 sticky top-0 z-20 text-center border-r border-border">Base Unit</TableHead>
                <TableHead className="px-8 font-black text-muted-foreground/80 dark:text-muted-foreground/40 uppercase tracking-[0.3em] text-[10px] h-14 bg-foreground/5 sticky top-0 z-20 text-center border-r border-border">Multiplier (PCS/Box)</TableHead>
                <TableHead className="px-8 font-black text-muted-foreground/80 dark:text-muted-foreground/40 uppercase tracking-[0.3em] text-[10px] h-14 bg-foreground/5 sticky top-0 z-20 text-right border-r border-border">Buy Rate</TableHead>
                <TableHead className="px-8 font-black text-muted-foreground/80 dark:text-muted-foreground/40 uppercase tracking-[0.3em] text-[10px] h-14 bg-foreground/5 sticky top-0 z-20 text-right border-r border-border">Sell Rate</TableHead>
                <TableHead className="px-8 font-black text-muted-foreground/80 dark:text-muted-foreground/40 uppercase tracking-[0.3em] text-[10px] h-14 bg-foreground/5 sticky top-0 z-20 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 opacity-20">
                      <Package className="w-16 h-16" />
                      <p className="font-black uppercase tracking-[0.5em] text-xs">Repository Empty</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map(item => {
                  const isCritical = item.minStock > 0 && item.currentStock <= 0
                  const isLow = item.minStock > 0 && item.currentStock <= item.minStock
                  const hasConversion = item.piecesPerBox > 0

                  return (
                    <TableRow 
                      key={item.id} 
                      className={cn(
                        "border-b border-border hover:bg-foreground/[0.03] transition-all group",
                        isCritical ? "bg-red-500/[0.02]" : isLow ? "bg-amber-500/[0.02]" : ""
                      )}
                    >
                      <TableCell className="px-8 py-6 border-r border-border">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                            {item.name}
                          </span>
                          {isLow && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                               <AlertTriangle className={cn("w-3 h-3", isCritical ? "text-red-500" : "text-amber-500")} />
                               <span className={cn("text-[8px] font-black uppercase tracking-widest", isCritical ? "text-red-500" : "text-amber-500")}>
                                 {isCritical ? "Stock Exhausted" : "Low Stock Alert"}
                               </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="px-8 py-6 border-r border-border">
                        <span className={cn(
                          "text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest",
                          isCritical ? "bg-red-500/10 text-red-500" : 
                          isLow ? "bg-amber-500/10 text-amber-500" : 
                          "bg-primary/10 text-primary"
                        )}>
                          {item.category || "GENERAL"}
                        </span>
                      </TableCell>

                      <TableCell className="px-8 py-6 text-center border-r border-border">
                         <div className="inline-flex flex-col items-center">
                           <div className="flex items-center gap-3">
                             <span className={cn(
                               "text-xl font-black tracking-tighter drop-shadow-sm",
                               isCritical ? "text-red-500" : isLow ? "text-amber-500" : "text-foreground"
                             )}>
                               {item.currentStock}
                             </span>
                             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{hasConversion ? 'PCS' : item.unit}</span>
                           </div>
                           {hasConversion && (
                             <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                               {item.piecesPerBox} PIECES PER {item.unit}
                             </span>
                           )}
                         </div>
                      </TableCell>

                      <TableCell className="px-8 py-6 text-center border-r border-border">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-3 py-1 bg-foreground/5 rounded-lg border border-border">
                          {hasConversion ? 'PCS' : item.unit}
                        </span>
                      </TableCell>

                      <TableCell className="px-8 py-6 text-center border-r border-border">
                        {hasConversion ? (
                          <div className="flex flex-col items-center">
                             <span className="text-sm font-black text-foreground">{item.piecesPerBox}</span>
                             <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">PCS / {item.unit}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-muted-foreground/20 italic tracking-widest">N/A</span>
                        )}
                      </TableCell>

                      <TableCell className="px-8 py-6 text-right border-r border-border">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black text-muted-foreground">
                            ₹{item.costPerUnit?.toFixed(2)}
                          </span>
                          <span className="text-[8px] font-black text-muted-foreground/20 uppercase tracking-widest">PER {hasConversion ? 'PC' : item.unit}</span>
                        </div>
                      </TableCell>

                      <TableCell className="px-8 py-6 text-right border-r border-border">
                         <div className="flex flex-col items-end">
                          <span className="text-sm font-black text-primary drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                            ₹{item.sellPrice?.toFixed(2)}
                          </span>
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 opacity-90 dark:opacity-60">EST. VALUE</span>
                        </div>
                      </TableCell>

                      <TableCell className="px-8 py-6">
                        <div className="flex items-center justify-center gap-3">
                          <EditItemDialog item={item} existingCategories={categories} isOwner={isOwner} isManager={isManager} />
                          {(isOwner || isManager) && (
                            <button 
                              onClick={() => setItemToDelete(item)}
                              className="p-2.5 rounded-xl bg-red-500/5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 active:scale-90" 
                              title={`Delete ${item.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <DeleteVerificationDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        itemName={itemToDelete?.name || ""}
        title="Delete Catalog Item?"
        description="Permanently dissolve this product and all associated ledger history. This will impact stock levels across all outlets."
        requirePin={false}
        onConfirm={async (pin) => {
          await removeItem(itemToDelete.id, pin)
          toast.success(`${itemToDelete.name} has been removed from catalog`)
        }}
      />
    </div>
  )
}
