"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Plus, Trash2, Save, Loader2, Package, ArrowRightLeft, CheckCircle2, 
  Search, Info, ChevronDown, LayoutGrid, Sparkles, Building2, Copy
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────
interface CatalogItem {
  id: string
  name: string
  category: string | null
  unit: string | null
  currentStock: number
  piecesPerBox: number | null
}

interface OutletInfo {
  id: string
  name: string
}

interface DispatchRow {
  id: string
  itemName: string
  selectedItemId: string | null
  currentStock: number
  outletId: string
  quantity: number | ""
  unitType: string
  multiplier: number | ""
  notes: string
}

interface ImportResult {
  summary: { totalProcessed: number; successful: number; failed: number }
  results: Array<{
    rowNum: number; itemName: string; outletName: string; quantity: number;
    unitType: string; status: string
  }>
  errors: string[]
}

// ── Compact Searchable Dropdown Component ──────────────────────────────────
function CompactSearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
  icon: Icon,
  className,
}: {
  options: string[]
  value: string
  onChange: (val: string) => void
  placeholder: string
  icon?: any
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSelect = (val: string) => {
    onChange(val)
    setSearch("")
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative w-full">
      <div
        className={cn(
          "flex items-center h-10 w-full rounded-lg border bg-background px-3 text-xs cursor-pointer hover:border-primary/40 transition-all duration-300 group shadow-sm",
          open ? "ring-1 ring-primary/20 border-primary" : "border-border/50",
          className
        )}
        onClick={() => { setOpen(!open); if(!open) setTimeout(() => inputRef.current?.focus(), 50) }}
      >
        {Icon && <Icon className="w-3.5 h-3.5 mr-2 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />}
        <div className="flex-1 truncate">
          {value ? (
            <span className="font-bold text-foreground uppercase tracking-tight">{value}</span>
          ) : (
            <span className="text-muted-foreground/40 font-bold uppercase tracking-widest text-[9px]">{placeholder}</span>
          )}
        </div>
        <ChevronDown className="w-3 h-3 text-muted-foreground ml-1 flex-shrink-0 group-hover:text-primary transition-colors" />
      </div>

      {open && (
        <div className="absolute z-[100] top-full left-0 mt-1 w-[260px] bg-background border border-border/50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-2 border-b border-border/50 bg-muted/20">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-background rounded-md border-border/50 border focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/30 font-bold"
              />
            </div>
          </div>
          <div className="max-h-[220px] overflow-y-auto py-1 custom-scrollbar">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-[10px] text-muted-foreground text-center font-black uppercase tracking-widest opacity-40 italic">No Database Matches</div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-primary/5 transition-colors truncate font-bold text-foreground/70 hover:text-primary flex items-center gap-2 uppercase tracking-tight border-b border-border/5 last:border-0"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export function ManualBulkDispatch({
  existingItems,
  outlets,
}: {
  existingItems: CatalogItem[]
  outlets: OutletInfo[]
}) {
  // State
  const [rows, setRows] = useState<DispatchRow[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const itemNames = existingItems.map(i => i.name)

  // Initialize with one empty row
  useEffect(() => {
    if (rows.length === 0) {
      addEmptyRow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handlers
  const addEmptyRow = () => {
    const lastRow = rows[rows.length - 1]
    setRows(prev => [...prev, {
      id: `row-${Date.now()}-${Math.random()}`,
      itemName: "",
      selectedItemId: null,
      currentStock: 0,
      outletId: lastRow ? lastRow.outletId : "", // Default to previous row's outlet to save time
      quantity: "",
      unitType: "pcs",
      multiplier: "",
      notes: "",
    }])
  }

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
    if (rows.length <= 1) {
       setTimeout(() => addEmptyRow(), 0)
    }
  }

  const updateRow = (id: string, field: keyof DispatchRow, value: any) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const handleItemSelect = (id: string, itemName: string) => {
    const item = existingItems.find(i => i.name === itemName)
    if (!item) return
    setRows(prev => prev.map(r => r.id === id ? {
      ...r,
      itemName: item.name,
      selectedItemId: item.id,
      currentStock: item.currentStock || 0,
      unitType: item.unit || "pcs",
      multiplier: item.piecesPerBox ?? "",
    } : r))
  }

  const copyOutletToAll = (outletId: string) => {
    if (!outletId) return
    setRows(prev => prev.map(r => ({ ...r, outletId })))
    toast.success("Outlet copied to all rows")
  }

  const handleSubmitBatch = async () => {
    // Filter out completely empty rows
    const validRows = rows.filter(r => r.selectedItemId && r.quantity !== "" && Number(r.quantity) > 0 && r.outletId)
    
    if (validRows.length === 0) {
      toast.error("Dispatch sheet is empty", { description: "Please add valid products, quantities, and outlets before syncing." })
      return
    }

    setIsSubmitting(true)
    setImportResult(null)

    try {
      const response = await fetch("/api/inventory/bulk-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      })
      
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Processing failed")
      
      setImportResult(result as ImportResult)
      
      if (result.summary.successful > 0) {
        toast.success("Dispatch synchronization successful!", {
          description: `Processed ${result.summary.successful} shipments into the ledger.`,
          icon: <Sparkles className="w-5 h-5 text-emerald-500" />,
          duration: 5000,
        })
        if (result.summary.failed === 0) {
           setRows([])
           addEmptyRow() 
        }
      }

      if (result.summary.failed > 0) {
        toast.error("Sync partial failure", {
          description: `${result.summary.failed} items failed to dispatch. Check report below.`,
        })
      }
    } catch (error) {
      toast.error("Critical synchronization error", {
        description: error instanceof Error ? error.message : "The warehouse server did not respond.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const validItemCount = useMemo(() => rows.filter(r => r.selectedItemId).length, [rows])

  return (
    <div className="space-y-8 animate-in fade-in duration-700 w-full mx-auto pb-32">
      
      {/* --- DISPATCH OVERVIEW HEADER --- */}
      <div className="glass-panel p-8 rounded-[2.5rem] border-2 border-blue-500/20 bg-blue-500/[0.03] shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform pointer-events-none">
           <ArrowRightLeft className="w-32 h-32 text-blue-500" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="space-y-2">
              <div className="flex items-center gap-3">
                 <div className="h-14 w-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <ArrowRightLeft className="w-7 h-7 text-white" />
                 </div>
                 <div>
                    <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase">Bulk <span className="text-blue-500 italic">Dispatch</span></h3>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Shipment grid control</p>
                 </div>
              </div>
           </div>

           <div className="flex flex-wrap gap-4">
              <div className="px-6 py-4 bg-background/50 rounded-2xl border border-border/50 text-right min-w-[120px]">
                 <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Valid Rows</div>
                 <div className="text-2xl font-black text-foreground">{validItemCount}</div>
              </div>
              <div className="flex items-center">
                <Button onClick={handleSubmitBatch} disabled={isSubmitting} className="h-full px-8 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95">
                   {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Save className="w-5 h-5 mr-3" />} Sync Dispatch
                </Button>
              </div>
           </div>
        </div>
      </div>

      {/* --- SPREADSHEET TABLE (DESKTOP) --- */}
      <div className="hidden md:block rounded-[2rem] border-2 border-border/50 bg-background/40 glass-panel shadow-sm">
         <div className="overflow-x-auto overflow-y-visible min-h-[500px]">
         <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/30 border-b border-border/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
               <tr>
                 <th className="p-4 text-center w-12 sticky left-0 bg-muted/30 z-10 backdrop-blur-md">#</th>
                 <th className="p-4 w-[300px]">Product</th>
                 <th className="p-4 w-[160px]">Available Stock</th>
                 <th className="p-4 w-[240px]">Destination Outlet</th>
                 <th className="p-4 w-[220px]">Dispatch Qty & Unit</th>
                 <th className="p-4 w-[220px]">Notes</th>
                 <th className="p-4 text-right w-16 sticky right-0 bg-muted/30 z-10 backdrop-blur-md">Act</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
               {rows.map((row, idx) => {
                 const isOverstock = Number(row.quantity) > row.currentStock && row.selectedItemId;
                 
                 return (
                  <tr key={row.id} className="hover:bg-muted/10 transition-colors group">
                     <td className="p-4 text-center text-[10px] font-black text-muted-foreground opacity-50 sticky left-0 bg-background/50 group-hover:bg-muted/10 backdrop-blur-md z-10">{idx + 1}</td>
                     
                     {/* Product */}
                     <td className="p-4 align-top">
                        <CompactSearchableDropdown 
                           options={itemNames}
                           value={row.itemName}
                           onChange={(val) => handleItemSelect(row.id, val)}
                           placeholder="Select Product"
                           icon={Package}
                           className="border-blue-500/20 bg-background shadow-none"
                        />
                     </td>

                     {/* Current Stock */}
                     <td className="p-4 align-top">
                        {row.selectedItemId ? (
                          <div className={cn(
                            "h-10 px-3 rounded-lg flex items-center justify-center font-black text-sm border",
                            row.currentStock <= 0 
                              ? "bg-red-500/10 text-red-500 border-red-500/20" 
                              : "bg-blue-500/5 text-blue-500 border-blue-500/20"
                          )}>
                             {row.currentStock} {row.unitType}
                          </div>
                        ) : (
                          <div className="h-10 flex items-center justify-center text-xs text-muted-foreground/40 italic">-</div>
                        )}
                     </td>

                     {/* Destination Outlet */}
                     <td className="p-4 space-y-2 align-top">
                        <div className="relative flex-1 group/select">
                           <select
                             value={row.outletId}
                             onChange={(e) => updateRow(row.id, "outletId", e.target.value)}
                             className="h-10 w-full rounded-lg border border-border/50 bg-background text-[10px] font-black uppercase tracking-widest text-foreground outline-none px-3 appearance-none shadow-none focus:ring-1 focus:ring-blue-500/30"
                           >
                             <option value="" disabled>Select Outlet</option>
                             {outlets.map(o => (
                               <option key={o.id} value={o.id}>{o.name}</option>
                             ))}
                           </select>
                           <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                        {row.outletId && (
                           <button 
                             onClick={() => copyOutletToAll(row.outletId)}
                             className="text-[9px] font-black uppercase tracking-widest text-blue-500/70 hover:text-blue-500 flex items-center gap-1 mt-1 px-1 transition-colors"
                           >
                             <Copy className="w-3 h-3" /> Copy to all
                           </button>
                        )}
                     </td>

                     {/* Quantity & Unit */}
                     <td className="p-4 space-y-2 align-top">
                        <div className="flex gap-2">
                           <Input 
                             type="number"
                             placeholder="Qty"
                             value={row.quantity}
                             onChange={(e) => updateRow(row.id, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                             className={cn(
                               "h-10 w-24 font-black text-center shadow-none",
                               isOverstock 
                                 ? "text-red-500 border-red-500 bg-red-500/5 focus-visible:ring-red-500/30" 
                                 : "text-blue-500 border-border/50 bg-background focus-visible:ring-blue-500/30"
                             )}
                           />
                           <div className="relative flex-1 group/select">
                             <select
                               value={row.unitType}
                               onChange={(e) => updateRow(row.id, "unitType", e.target.value)}
                               className="h-10 w-full rounded-lg border border-border/50 bg-background text-[10px] font-black uppercase tracking-widest text-foreground outline-none px-3 appearance-none shadow-none focus:ring-1 focus:ring-blue-500/30"
                             >
                               <option value="pcs">Pieces</option>
                               <option value="kg">Kg</option>
                               <option value="gm">Grams</option>
                               <option value="liter">Liters</option>
                               <option value="packet">Packets</option>
                               <option value="box">Boxes</option>
                               <option value="plate">Plates</option>
                             </select>
                             <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                           </div>
                        </div>
                        {(row.unitType === "box" || row.unitType === "packet" || row.unitType === "plate") && (
                           <Input 
                             type="number"
                             placeholder="Items per pack"
                             value={row.multiplier}
                             onChange={(e) => updateRow(row.id, "multiplier", e.target.value === "" ? "" : Number(e.target.value))}
                             className="h-8 text-xs bg-emerald-500/5 border-emerald-500/20 text-emerald-500 placeholder:text-emerald-500/40 shadow-none font-bold"
                           />
                        )}
                        {isOverstock && (
                          <div className="text-[9px] font-black uppercase text-red-500 tracking-widest">
                            Exceeds Stock!
                          </div>
                        )}
                     </td>

                     {/* Notes */}
                     <td className="p-4 align-top">
                        <Input 
                          placeholder="Dispatch notes..."
                          value={row.notes}
                          onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                          className="h-10 text-xs bg-transparent border-transparent hover:border-border/50 text-foreground placeholder:text-muted-foreground/40 shadow-none"
                        />
                     </td>

                     {/* Actions */}
                     <td className="p-4 text-right align-top sticky right-0 bg-background/50 group-hover:bg-muted/10 backdrop-blur-md z-10">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeRow(row.id)}
                          className="h-10 w-10 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                           <Trash2 className="w-4 h-4" />
                        </Button>
                     </td>
                  </tr>
                 );
               })}
            </tbody>
         </table>
         
         <div className="p-4 border-t border-border/50 bg-background">
            <Button onClick={addEmptyRow} variant="outline" className="w-full border-dashed border-blue-500/30 text-blue-500 hover:bg-blue-500/5 rounded-xl font-black uppercase tracking-widest text-xs h-12 transition-all">
               <Plus className="w-4 h-4 mr-2" /> Insert New Dispatch Row
            </Button>
         </div>
         </div>
      </div>

      {/* --- MOBILE CARD VIEW --- */}
      <div className="md:hidden space-y-6">
         {rows.map((row, idx) => {
            const isOverstock = Number(row.quantity) > row.currentStock && row.selectedItemId;
            return (
            <div key={row.id} className="glass-panel p-5 rounded-[2rem] border-2 border-border/50 bg-background/40 relative group shadow-sm flex flex-col gap-5">
               <div className="absolute -top-3 -left-3 h-8 w-8 bg-muted/80 rounded-xl flex items-center justify-center font-black text-xs text-muted-foreground shadow-sm border border-border/50 backdrop-blur-md">
                  {idx + 1}
               </div>
               
               <Button 
                 variant="ghost" 
                 size="icon" 
                 onClick={() => removeRow(row.id)}
                 className="absolute -top-3 -right-3 h-8 w-8 text-red-500 bg-background rounded-xl border border-red-500/20 shadow-sm hover:bg-red-500 hover:text-white transition-all z-10"
               >
                  <Trash2 className="w-3.5 h-3.5" />
               </Button>

               <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Product</label>
                       <CompactSearchableDropdown 
                          options={itemNames}
                          value={row.itemName}
                          onChange={(val) => handleItemSelect(row.id, val)}
                          placeholder="Select Product"
                          icon={Package}
                          className="h-12 border-blue-500/20 shadow-sm"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Avail.</label>
                       <div className="h-12 rounded-xl flex items-center justify-center font-black text-sm border bg-blue-500/5 text-blue-500 border-blue-500/20 shadow-sm">
                         {row.selectedItemId ? row.currentStock : "-"}
                       </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Destination</label>
                     <div className="relative">
                       <select
                         value={row.outletId}
                         onChange={(e) => updateRow(row.id, "outletId", e.target.value)}
                         className="h-12 w-full rounded-xl border border-border/50 bg-background text-[10px] font-black uppercase tracking-widest text-foreground outline-none px-4 appearance-none shadow-sm"
                       >
                         <option value="" disabled>Select Outlet</option>
                         {outlets.map(o => (
                           <option key={o.id} value={o.id}>{o.name}</option>
                         ))}
                       </select>
                       <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Dispatch Amount</label>
                     <div className="flex gap-2">
                        <Input 
                          type="number"
                          placeholder="0"
                          value={row.quantity}
                          onChange={(e) => updateRow(row.id, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                          className={cn(
                            "h-12 w-full font-black text-xl shadow-sm text-center",
                            isOverstock ? "text-red-500 border-red-500 bg-red-500/5" : "text-blue-500 border-border/50 bg-background"
                          )}
                        />
                        <div className="relative w-24 shrink-0">
                          <select
                            value={row.unitType}
                            onChange={(e) => updateRow(row.id, "unitType", e.target.value)}
                            className="h-12 w-full rounded-xl border border-border/50 bg-background text-[9px] font-black uppercase tracking-widest text-foreground outline-none px-2 appearance-none shadow-sm"
                          >
                            <option value="pcs">Pcs</option>
                            <option value="kg">Kg</option>
                            <option value="gm">Gm</option>
                            <option value="liter">Ltr</option>
                            <option value="packet">Pkt</option>
                            <option value="box">Box</option>
                            <option value="plate">Plt</option>
                          </select>
                        </div>
                     </div>
                     {isOverstock && (
                       <div className="text-[10px] font-black uppercase text-red-500 tracking-widest mt-1 text-center">
                         Exceeds Available Stock
                       </div>
                     )}
                  </div>

                  {(row.unitType === "box" || row.unitType === "packet" || row.unitType === "plate") && (
                     <div className="space-y-2 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                        <label className="text-[9px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                           <Info className="w-3 h-3" /> Items per {row.unitType}
                        </label>
                        <Input 
                          type="number"
                          placeholder="Multiplier"
                          value={row.multiplier}
                          onChange={(e) => updateRow(row.id, "multiplier", e.target.value === "" ? "" : Number(e.target.value))}
                          className="h-10 text-sm bg-background border-emerald-500/20 text-emerald-500 font-bold"
                        />
                     </div>
                  )}

                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Notes</label>
                     <Input 
                       placeholder="Dispatch notes..."
                       value={row.notes}
                       onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                       className="h-10 bg-background border-border/50 text-foreground text-sm shadow-sm"
                     />
                  </div>
               </div>
            </div>
            )
         })}
         
         <Button onClick={addEmptyRow} variant="outline" className="w-full border-2 border-dashed border-blue-500/30 text-blue-500 hover:bg-blue-500/5 rounded-[2rem] font-black uppercase tracking-widest text-sm h-16 transition-all shadow-sm">
            <Plus className="w-5 h-5 mr-3" /> Insert New Dispatch Row
         </Button>
      </div>

      {/* --- RESULTS REPORT --- */}
      {importResult && (
        <div className="glass-panel p-8 rounded-[3rem] border-2 border-emerald-500/20 bg-emerald-500/[0.02] backdrop-blur-2xl animate-in zoom-in-95 duration-500 shadow-2xl mt-8">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <h4 className="text-xl font-black text-foreground uppercase tracking-tight">Dispatch Complete</h4>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-60">Ledger successfully updated</p>
                 </div>
              </div>
              <Button variant="ghost" onClick={() => setImportResult(null)} className="text-[10px] font-black uppercase tracking-widest opacity-40">Dismiss</Button>
           </div>
           <div className="grid grid-cols-3 gap-6">
              <div className="bg-background/50 border border-border/50 p-6 rounded-3xl text-center">
                 <div className="text-3xl font-black text-foreground">{importResult.summary.totalProcessed}</div>
                 <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-40">Processed</div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl text-center">
                 <div className="text-3xl font-black text-emerald-500">{importResult.summary.successful}</div>
                 <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 opacity-60">Successful</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-center">
                 <div className="text-3xl font-black text-red-500">{importResult.summary.failed}</div>
                 <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 opacity-60">Faulted</div>
              </div>
           </div>
           
           {importResult.errors.length > 0 && (
             <div className="mt-8 space-y-2">
               <h5 className="text-[10px] font-black uppercase tracking-widest text-red-500">Error Details</h5>
               <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-2 max-h-40 overflow-y-auto">
                 {importResult.errors.map((err, i) => (
                   <div key={i} className="text-xs text-red-400 font-bold">{err}</div>
                 ))}
               </div>
             </div>
           )}
        </div>
      )}
      
      {/* Mobile Floating Sync Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:hidden z-50 animate-in slide-in-from-bottom duration-500">
        <Button 
          onClick={handleSubmitBatch} 
          disabled={isSubmitting || validItemCount === 0}
          className="w-full h-16 rounded-[2rem] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-sm shadow-[0_20px_50px_rgba(59,130,246,0.5)] transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
        >
          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Save className="w-6 h-6 mr-3" />} 
          Sync {validItemCount} Rows
        </Button>
      </div>

    </div>
  )
}
