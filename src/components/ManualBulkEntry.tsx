"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Plus, Trash2, Save, Loader2, Package, TrendingUp, CheckCircle2, 
  Search, IndianRupee, Truck, Info, Layers, ChevronDown, Check, LayoutGrid, Sparkles
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────
interface CatalogItem {
  id: string
  name: string
  category: string | null
  unit: string | null
  currentStock: number | null
  costPerUnit: number | null
  sellPrice: number | null
  piecesPerBox: number | null
}

interface VendorInfo {
  id: string
  name: string
}

interface ManualRow {
  id: string
  itemName: string
  selectedItemId: string | null
  category: string
  addStock: number | ""
  unitType: string
  multiplier: number | ""
  costPerUnit: number | ""
  sellPrice: number | ""
  vendorName: string
  selectedVendorId: string | null
  notes: string
  isNew: boolean
  isNewVendor: boolean
  autoDispatchOutletId: string | null
}

interface ImportResult {
  summary: { totalProcessed: number; successful: number; failed: number }
  results: Array<{
    rowNum: number; itemName: string; quantity: number;
    unitType: string; vendor: string; totalCost: string; status: string
  }>
  errors: string[]
}

// ── Compact Searchable Dropdown Component ──────────────────────────────────
function CompactSearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
  allowNew,
  newLabel,
  icon: Icon,
  className,
}: {
  options: string[]
  value: string
  onChange: (val: string, isNew: boolean) => void
  placeholder: string
  allowNew?: boolean
  newLabel?: string
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

  const exactMatch = options.some(o => o.toLowerCase() === search.toLowerCase())

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSelect = (val: string, isNew: boolean) => {
    onChange(val, isNew)
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
            {filtered.length === 0 && !allowNew && (
              <div className="px-3 py-4 text-[10px] text-muted-foreground text-center font-black uppercase tracking-widest opacity-40 italic">No Database Matches</div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelect(opt, false)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-primary/5 transition-colors truncate font-bold text-foreground/70 hover:text-primary flex items-center gap-2 uppercase tracking-tight border-b border-border/5 last:border-0"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                {opt}
              </button>
            ))}
            {allowNew && search.trim() && !exactMatch && (
              <button
                onClick={() => handleSelect(search.trim(), true)}
                className="w-full text-left px-3 py-2 text-xs bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors flex items-center gap-2 border-t border-border/50 text-emerald-500 font-black tracking-tighter uppercase"
              >
                <Plus className="w-4 h-4" />
                {newLabel || "Create"}: "{search.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export function ManualBulkEntry({
  existingItems,
  existingCategories,
  existingVendors,
  outlets = [],
}: {
  existingItems: CatalogItem[]
  existingCategories: string[]
  existingVendors: VendorInfo[]
  outlets?: { id: string, name: string }[]
}) {
  // State
  const [rows, setRows] = useState<ManualRow[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>(existingCategories)
  const [allVendors, setAllVendors] = useState<string[]>(existingVendors.map(v => v.name))

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
    setRows(prev => [...prev, {
      id: `row-${Date.now()}-${Math.random()}`,
      itemName: "",
      selectedItemId: null,
      category: "",
      addStock: "",
      unitType: "pcs",
      multiplier: "",
      costPerUnit: "",
      sellPrice: "",
      vendorName: "",
      selectedVendorId: null,
      notes: "",
      isNew: true,
      isNewVendor: false,
      autoDispatchOutletId: null,
    }])
  }

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
    // Always keep at least one row
    if (rows.length <= 1) {
       setTimeout(() => addEmptyRow(), 0)
    }
  }

  const updateRow = (id: string, field: keyof ManualRow, value: any) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const handleItemSelect = (id: string, itemName: string, isNew: boolean) => {
    if (isNew) {
      setRows(prev => prev.map(r => r.id === id ? { ...r, itemName, selectedItemId: null, isNew: true } : r))
      return
    }
    const item = existingItems.find(i => i.name === itemName)
    if (!item) return
    setRows(prev => prev.map(r => r.id === id ? {
      ...r,
      itemName: item.name,
      selectedItemId: item.id,
      category: item.category || "",
      unitType: item.unit || "pcs",
      costPerUnit: item.costPerUnit ?? "",
      sellPrice: item.sellPrice ?? "",
      multiplier: item.piecesPerBox ?? "",
      isNew: false,
    } : r))
  }

  const handleCategorySelect = (id: string, cat: string, isNew: boolean) => {
    updateRow(id, "category", cat)
    if (isNew && !allCategories.includes(cat)) setAllCategories(prev => [...prev, cat])
  }

  const handleVendorSelect = (id: string, vendorName: string, isNew: boolean) => {
    const v = existingVendors.find(vend => vend.name === vendorName)
    setRows(prev => prev.map(r => r.id === id ? {
      ...r, vendorName, selectedVendorId: v?.id || null, isNewVendor: isNew
    } : r))
    if (isNew && !allVendors.includes(vendorName)) setAllVendors(prev => [...prev, vendorName])
  }

  const handleSubmitBatch = async () => {
    // Filter out completely empty rows
    const validRows = rows.filter(r => r.itemName.trim() !== "" && r.addStock !== "" && Number(r.addStock) > 0)
    
    if (validRows.length === 0) {
      toast.error("Spreadsheet is empty", { description: "Please add valid products and quantities before syncing." })
      return
    }

    setIsSubmitting(true)
    setImportResult(null)

    try {
      const response = await fetch("/api/inventory/bulk-stock/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      })
      if (!response.ok) throw new Error("Processing failed")
      const result: ImportResult = await response.json()
      setImportResult(result)
      
      if (result.summary.successful > 0) {
        toast.success("Inventory synchronization successful!", {
          description: `Processed ${result.summary.successful} products into the warehouse ledger.`,
          icon: <Sparkles className="w-5 h-5 text-emerald-500" />,
          duration: 5000,
        })
        if (result.summary.failed === 0) {
           setRows([])
           addEmptyRow() // Reset to one blank row
        }
      }

      if (result.summary.failed > 0) {
        toast.error("Sync partial failure", {
          description: `${result.summary.failed} items failed to update. Check report below.`,
        })
      }
    } catch (error) {
      toast.error("Critical synchronization error", {
        description: "The warehouse server did not respond. Check your connection.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Stats
  const grandTotal = useMemo(() => rows.reduce((sum, r) => sum + (Number(r.addStock) || 0) * (Number(r.costPerUnit) || 0), 0), [rows])
  const validItemCount = useMemo(() => rows.filter(r => r.itemName.trim() !== "").length, [rows])

  return (
    <div className="space-y-8 animate-in fade-in duration-700 w-full mx-auto pb-32">
      
      {/* --- SPREADSHEET OVERVIEW HEADER --- */}
      <div className="glass-panel p-8 rounded-[2.5rem] border-2 border-primary/20 bg-primary/[0.03] shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform pointer-events-none">
           <LayoutGrid className="w-32 h-32 text-primary" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="space-y-2">
              <div className="flex items-center gap-3">
                 <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                    <LayoutGrid className="w-7 h-7 text-foreground" />
                 </div>
                 <div>
                    <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase">Intake <span className="text-primary italic">Spreadsheet</span></h3>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Bulk entry grid control</p>
                 </div>
              </div>
           </div>

           <div className="flex flex-wrap gap-4">
              <div className="px-6 py-4 bg-background/50 rounded-2xl border border-border/50 text-right min-w-[120px]">
                 <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Valid Rows</div>
                 <div className="text-2xl font-black text-foreground">{validItemCount}</div>
              </div>
              <div className="px-6 py-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-right min-w-[150px]">
                 <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest opacity-60">Total Obligation</div>
                 <div className="text-2xl font-black text-amber-600 dark:text-amber-400">₹{grandTotal.toLocaleString()}</div>
              </div>
              <div className="flex items-center">
                <Button onClick={handleSubmitBatch} disabled={isSubmitting} className="h-full px-8 rounded-2xl bg-primary hover:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
                   {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Save className="w-5 h-5 mr-3" />} Sync
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
                 <th className="p-4 w-[280px]">Product & Category</th>
                 <th className="p-4 w-[220px]">Quantity & Unit</th>
                 <th className="p-4 w-[240px]">Cost & Sell Price (₹)</th>
                 <th className="p-4 w-[280px]">Vendor, Dispatch & Notes</th>
                 <th className="p-4 text-right w-16 sticky right-0 bg-muted/30 z-10 backdrop-blur-md">Act</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
               {rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-muted/10 transition-colors group">
                     <td className="p-4 text-center text-[10px] font-black text-muted-foreground opacity-50 sticky left-0 bg-background/50 group-hover:bg-muted/10 backdrop-blur-md z-10">{idx + 1}</td>
                     
                     {/* Product / Category */}
                     <td className="p-4 space-y-2 align-top">
                        <CompactSearchableDropdown 
                           options={itemNames}
                           value={row.itemName}
                           onChange={(val, isNew) => handleItemSelect(row.id, val, isNew)}
                           placeholder="Select Product"
                           allowNew
                           newLabel="Create"
                           icon={Package}
                           className="border-primary/20 bg-background shadow-none"
                        />
                        <CompactSearchableDropdown 
                           options={allCategories}
                           value={row.category}
                           onChange={(val, isNew) => handleCategorySelect(row.id, val, isNew)}
                           placeholder="Category"
                           allowNew
                           newLabel="New"
                           icon={Layers}
                           className="h-8 border-transparent bg-transparent hover:bg-background/80 hover:border-border/50 px-2"
                        />
                     </td>

                     {/* Quantity & Unit */}
                     <td className="p-4 space-y-2 align-top">
                        <div className="flex gap-2">
                           <Input 
                             type="number"
                             placeholder="Qty"
                             value={row.addStock}
                             onChange={(e) => updateRow(row.id, "addStock", e.target.value === "" ? "" : Number(e.target.value))}
                             className="h-10 w-24 font-black text-emerald-500 border-border/50 bg-background text-center shadow-none focus-visible:ring-emerald-500/30"
                           />
                           <div className="relative flex-1 group/select">
                             <select
                               value={row.unitType}
                               onChange={(e) => updateRow(row.id, "unitType", e.target.value)}
                               className="h-10 w-full rounded-lg border border-border/50 bg-background text-[10px] font-black uppercase tracking-widest text-foreground outline-none px-3 appearance-none shadow-none focus:ring-1 focus:ring-primary/30"
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
                             className="h-8 text-xs bg-blue-500/5 border-blue-500/20 text-blue-500 placeholder:text-blue-500/40 shadow-none font-bold"
                           />
                        )}
                     </td>

                     {/* Cost & Price */}
                     <td className="p-4 space-y-2 align-top">
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground w-12 shrink-0">Cost</span>
                           <Input 
                             type="number"
                             placeholder="Buy Cost"
                             value={row.costPerUnit}
                             onChange={(e) => updateRow(row.id, "costPerUnit", e.target.value === "" ? "" : Number(e.target.value))}
                             className="h-10 bg-amber-500/5 border-amber-500/20 text-foreground text-sm font-black shadow-none flex-1 focus-visible:ring-amber-500/30"
                           />
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground w-12 shrink-0">List</span>
                           <Input 
                             type="number"
                             placeholder="Sell Price"
                             value={row.sellPrice}
                             onChange={(e) => updateRow(row.id, "sellPrice", e.target.value === "" ? "" : Number(e.target.value))}
                             className="h-8 bg-transparent border-transparent hover:border-border/50 text-foreground text-xs font-bold shadow-none flex-1"
                           />
                        </div>
                     </td>

                     {/* Vendor, Dispatch & Notes */}
                     <td className="p-4 space-y-2 align-top">
                        <CompactSearchableDropdown 
                           options={allVendors}
                           value={row.vendorName}
                           onChange={(val, isNew) => handleVendorSelect(row.id, val, isNew)}
                           placeholder="Supplier Vendor"
                           allowNew
                           newLabel="Create"
                           icon={Truck}
                           className="bg-background shadow-none"
                        />
                        <div className="relative group/select w-full">
                          <select
                            value={row.autoDispatchOutletId || ""}
                            onChange={(e) => updateRow(row.id, "autoDispatchOutletId", e.target.value === "" ? null : e.target.value)}
                            className="h-8 w-full rounded-md border border-border/50 bg-background text-[10px] font-bold text-foreground outline-none px-2 appearance-none shadow-none focus:ring-1 focus:ring-primary/30"
                          >
                            <option value="">No Auto Dispatch</option>
                            {outlets.map(o => (
                              <option key={o.id} value={o.id}>To: {o.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                        <Input 
                          placeholder="Delivery notes..."
                          value={row.notes}
                          onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                          className="h-8 text-xs bg-transparent border-transparent hover:border-border/50 text-foreground placeholder:text-muted-foreground/40 shadow-none"
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
               ))}
            </tbody>
         </table>
         
         <div className="p-4 border-t border-border/50 bg-background">
            <Button onClick={addEmptyRow} variant="outline" className="w-full border-dashed border-primary/30 text-primary hover:bg-primary/5 rounded-xl font-black uppercase tracking-widest text-xs h-12 transition-all">
               <Plus className="w-4 h-4 mr-2" /> Insert New Row
            </Button>
         </div>
         </div>
      </div>

      {/* --- MOBILE CARD VIEW --- */}
      <div className="md:hidden space-y-6">
         {rows.map((row, idx) => (
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
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Product</label>
                     <CompactSearchableDropdown 
                        options={itemNames}
                        value={row.itemName}
                        onChange={(val, isNew) => handleItemSelect(row.id, val, isNew)}
                        placeholder="Select Product"
                        allowNew
                        newLabel="Create"
                        icon={Package}
                        className="h-12 border-primary/20 shadow-sm"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Category</label>
                        <CompactSearchableDropdown 
                           options={allCategories}
                           value={row.category}
                           onChange={(val, isNew) => handleCategorySelect(row.id, val, isNew)}
                           placeholder="Category"
                           allowNew
                           newLabel="New"
                           icon={Layers}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vendor</label>
                        <CompactSearchableDropdown 
                           options={allVendors}
                           value={row.vendorName}
                           onChange={(val, isNew) => handleVendorSelect(row.id, val, isNew)}
                           placeholder="Vendor"
                           allowNew
                           newLabel="Create"
                           icon={Truck}
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Volume</label>
                        <div className="flex gap-2">
                           <Input 
                             type="number"
                             placeholder="0"
                             value={row.addStock}
                             onChange={(e) => updateRow(row.id, "addStock", e.target.value === "" ? "" : Number(e.target.value))}
                             className="h-12 w-full font-black text-emerald-500 border-border/50 text-xl shadow-sm text-center"
                           />
                           <div className="relative w-20 shrink-0">
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
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Buy Cost</label>
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/50 font-black">₹</span>
                           <Input 
                             type="number"
                             placeholder="0.00"
                             value={row.costPerUnit}
                             onChange={(e) => updateRow(row.id, "costPerUnit", e.target.value === "" ? "" : Number(e.target.value))}
                             className="h-12 pl-8 bg-amber-500/5 border-amber-500/20 text-foreground font-black text-lg shadow-sm"
                           />
                        </div>
                     </div>
                  </div>

                  {(row.unitType === "box" || row.unitType === "packet" || row.unitType === "plate") && (
                     <div className="space-y-2 bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
                        <label className="text-[9px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
                           <Info className="w-3 h-3" /> Items per {row.unitType}
                        </label>
                        <Input 
                          type="number"
                          placeholder="Multiplier"
                          value={row.multiplier}
                          onChange={(e) => updateRow(row.id, "multiplier", e.target.value === "" ? "" : Number(e.target.value))}
                          className="h-10 text-sm bg-background border-blue-500/20 text-blue-500 font-bold"
                        />
                     </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">List Price</label>
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 font-black">₹</span>
                           <Input 
                             type="number"
                             placeholder="0.00"
                             value={row.sellPrice}
                             onChange={(e) => updateRow(row.id, "sellPrice", e.target.value === "" ? "" : Number(e.target.value))}
                             className="h-10 pl-8 bg-background border-border/50 text-foreground font-bold shadow-sm"
                           />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Auto Dispatch</label>
                        <div className="relative w-full">
                          <select
                            value={row.autoDispatchOutletId || ""}
                            onChange={(e) => updateRow(row.id, "autoDispatchOutletId", e.target.value === "" ? null : e.target.value)}
                            className="h-10 w-full rounded-xl border border-border/50 bg-background text-[10px] font-black uppercase tracking-widest text-foreground outline-none px-2 appearance-none shadow-sm"
                          >
                            <option value="">No</option>
                            {outlets.map(o => (
                              <option key={o.id} value={o.id}>To: {o.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                     </div>
                  </div>
                  
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Notes</label>
                     <Input 
                       placeholder="Invoice..."
                       value={row.notes}
                       onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                       className="h-10 bg-background border-border/50 text-foreground text-sm shadow-sm"
                     />
                  </div>
               </div>
            </div>
         ))}
         
         <Button onClick={addEmptyRow} variant="outline" className="w-full border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 rounded-[2rem] font-black uppercase tracking-widest text-sm h-16 transition-all shadow-sm">
            <Plus className="w-5 h-5 mr-3" /> Insert New Row
         </Button>
      </div>

      {/* --- RESULTS REPORT --- */}
      {importResult && (
        <div className="glass-panel p-8 rounded-[3rem] border-2 border-emerald-500/20 bg-emerald-500/[0.02] backdrop-blur-2xl animate-in zoom-in-95 duration-500 shadow-2xl mt-8">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6 text-foreground" />
                 </div>
                 <div>
                    <h4 className="text-xl font-black text-foreground uppercase tracking-tight">Sync Complete</h4>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-60">Database successfully updated</p>
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
        </div>
      )}
      
      {/* Mobile Floating Sync Button (visible if valid rows exist) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:hidden z-50 animate-in slide-in-from-bottom duration-500">
        <Button 
          onClick={handleSubmitBatch} 
          disabled={isSubmitting || validItemCount === 0}
          className="w-full h-16 rounded-[2rem] bg-primary hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-sm shadow-[0_20px_50px_rgba(16,185,129,0.5)] transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
        >
          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Save className="w-6 h-6 mr-3" />} 
          Sync {validItemCount} Rows
        </Button>
      </div>

    </div>
  )
}
