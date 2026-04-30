"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Plus, Trash2, Save, Loader2, Package, TrendingUp, CheckCircle2, 
  AlertCircle, ChevronDown, ChevronUp, Search, Sparkles, IndianRupee, 
  Tag, Truck, Info, Layers, Edit3, X, ShoppingCart, ArrowRight,
  ArrowLeft, Check, PackageOpen, LayoutGrid
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
}

interface ImportResult {
  summary: { totalProcessed: number; successful: number; failed: number }
  results: Array<{
    rowNum: number; itemName: string; quantity: number;
    unitType: string; vendor: string; totalCost: string; status: string
  }>
  errors: string[]
}

// ── Searchable Dropdown Component ──────────────────────────────────────────
function SearchableDropdown({
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
          "flex items-center h-14 w-full rounded-2xl border bg-background px-4 text-sm cursor-pointer hover:border-primary/40 transition-all duration-300 group shadow-sm",
          open ? "ring-2 ring-primary/20 border-primary" : "border-border/50",
          className
        )}
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
      >
        {Icon && <Icon className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary transition-colors" />}
        {value ? (
          <span className="truncate font-black text-foreground uppercase tracking-tight">{value}</span>
        ) : (
          <span className="text-muted-foreground/40 truncate font-bold uppercase tracking-widest text-[10px]">{placeholder}</span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0 group-hover:text-primary transition-colors" />
      </div>

      {open && (
        <div className="absolute z-[100] top-full left-0 mt-2 w-full min-w-[280px] bg-background border border-border/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-border/50 bg-muted/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full h-10 pl-10 pr-4 text-sm bg-background rounded-xl border-border/50 border focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/30 font-bold"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto py-2 custom-scrollbar">
            {filtered.length === 0 && !allowNew && (
              <div className="px-4 py-8 text-xs text-muted-foreground text-center font-black uppercase tracking-widest opacity-40 italic">No Database Matches</div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelect(opt, false)}
                className="w-full text-left px-5 py-4 text-sm hover:bg-primary/5 transition-colors truncate font-black text-foreground/70 hover:text-primary flex items-center gap-3 uppercase tracking-tight border-b border-border/5 last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-primary/20" />
                {opt}
              </button>
            ))}
            {allowNew && search.trim() && !exactMatch && (
              <button
                onClick={() => handleSelect(search.trim(), true)}
                className="w-full text-left px-5 py-4 text-sm bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors flex items-center gap-3 border-t border-border/50 text-emerald-500 font-black tracking-tighter uppercase"
              >
                <Plus className="w-5 h-5" />
                {newLabel || "Create"}: &ldquo;{search.trim()}&rdquo;
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
}: {
  existingItems: CatalogItem[]
  existingCategories: string[]
  existingVendors: VendorInfo[]
}) {
  // State
  const [rows, setRows] = useState<ManualRow[]>([])
  const [editingRow, setEditingRow] = useState<ManualRow | null>(null)
  const [editorStep, setEditorStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>(existingCategories)
  const [allVendors, setAllVendors] = useState<string[]>(existingVendors.map(v => v.name))

  const itemNames = existingItems.map(i => i.name)

  // Handlers
  const openEditor = (row?: ManualRow) => {
    if (row) {
      setEditingRow({ ...row })
    } else {
      setEditingRow({
        id: `row-${Date.now()}`,
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
      })
    }
    setEditorStep(1)
    document.body.style.overflow = "hidden" // Prevent background scroll
  }

  const closeEditor = () => {
    setEditingRow(null)
    document.body.style.overflow = "auto"
  }

  const saveToCart = () => {
    if (!editingRow || !editingRow.itemName) {
      toast.error("Product name is required.")
      return
    }
    if (!editingRow.addStock || Number(editingRow.addStock) <= 0) {
      toast.error("Valid quantity is required.")
      return
    }

    setRows(prev => {
      const exists = prev.find(r => r.id === editingRow.id)
      if (exists) {
        return prev.map(r => r.id === editingRow.id ? editingRow : r)
      }
      return [...prev, editingRow]
    })
    closeEditor()
    toast.success("Added to intake basket")
  }

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
    toast.info("Removed from basket")
  }

  const handleItemSelect = (itemName: string, isNew: boolean) => {
    if (!editingRow) return
    if (isNew) {
      setEditingRow({ ...editingRow, itemName, selectedItemId: null, isNew: true })
      setEditorStep(2)
      return
    }
    const item = existingItems.find(i => i.name === itemName)
    if (!item) return
    setEditingRow({
      ...editingRow,
      itemName: item.name,
      selectedItemId: item.id,
      category: item.category || "",
      unitType: item.unit || "pcs",
      costPerUnit: item.costPerUnit ?? "",
      sellPrice: item.sellPrice ?? "",
      multiplier: item.piecesPerBox ?? "",
      isNew: false,
    })
    setEditorStep(3) // Jump to qty if item exists
  }

  const handleCategorySelect = (cat: string, isNew: boolean) => {
    if (!editingRow) return
    setEditingRow({ ...editingRow, category: cat })
    if (isNew && !allCategories.includes(cat)) setAllCategories(prev => [...prev, cat])
    setEditorStep(3)
  }

  const handleVendorSelect = (vendorName: string, isNew: boolean) => {
    if (!editingRow) return
    const v = existingVendors.find(vend => vend.name === vendorName)
    setEditingRow({
      ...editingRow,
      vendorName,
      selectedVendorId: v?.id || null,
      isNewVendor: isNew,
    })
    if (isNew && !allVendors.includes(vendorName)) setAllVendors(prev => [...prev, vendorName])
    setEditorStep(4)
  }

  const handleSubmitBatch = async () => {
    if (rows.length === 0) {
      toast.error("Intake basket is empty.")
      return
    }

    setIsSubmitting(true)
    setImportResult(null)

    try {
      const response = await fetch("/api/inventory/bulk-stock/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
      if (!response.ok) throw new Error("Processing failed")
      const result: ImportResult = await response.json()
      setImportResult(result)
      if (result.summary.successful > 0) {
        toast.success(`Success: ${result.summary.successful} items synced!`)
        if (result.summary.failed === 0) setRows([])
      }
    } catch (error) {
      toast.error("Submit failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Stats
  const grandTotal = useMemo(() => rows.reduce((sum, r) => sum + (Number(r.addStock) || 0) * (Number(r.costPerUnit) || 0), 0), [rows])

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-4xl mx-auto">
      
      {/* --- CART OVERVIEW HEADER --- */}
      <div className="glass-panel p-8 rounded-[2.5rem] border-2 border-primary/20 bg-primary/[0.03] shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
           <ShoppingCart className="w-32 h-32 text-primary" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="space-y-2">
              <div className="flex items-center gap-3">
                 <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                    <LayoutGrid className="w-7 h-7 text-white" />
                 </div>
                 <div>
                    <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase">Intake <span className="text-primary italic">Basket</span></h3>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Mobile-optimized warehouse load</p>
                 </div>
              </div>
           </div>

           <div className="flex flex-wrap gap-4">
              <div className="px-6 py-4 bg-background/50 rounded-2xl border border-border/50 text-right min-w-[120px]">
                 <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Items</div>
                 <div className="text-2xl font-black text-foreground">{rows.length}</div>
              </div>
              <div className="px-6 py-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-right min-w-[150px]">
                 <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest opacity-60">Total Obligation</div>
                 <div className="text-2xl font-black text-amber-600 dark:text-amber-400">₹{grandTotal.toLocaleString()}</div>
              </div>
           </div>
        </div>
      </div>

      {/* --- BASKET CONTENT --- */}
      <div className="space-y-4">
        {rows.length === 0 ? (
          <div className="glass-panel p-20 rounded-[3rem] border-4 border-dashed border-border/30 bg-muted/5 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-500">
             <div className="h-24 w-24 bg-background rounded-[2rem] border border-border/50 shadow-inner flex items-center justify-center">
                <PackageOpen className="w-12 h-12 text-muted-foreground/20" />
             </div>
             <div>
                <h4 className="text-2xl font-black text-foreground/40 uppercase tracking-[0.2em]">Basket is Empty</h4>
                <p className="text-muted-foreground/30 text-sm font-bold uppercase tracking-widest mt-2">Ready to start the intake sequence?</p>
             </div>
             <Button onClick={() => openEditor()} className="h-14 px-10 rounded-2xl bg-primary hover:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
                <Plus className="w-5 h-5 mr-3" /> Initialize First Item
             </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
             {rows.map((row, idx) => (
               <div key={row.id} className="glass-panel p-5 rounded-[2rem] border-border/50 bg-background/40 hover:bg-background/60 transition-all duration-300 group flex items-center gap-5 shadow-sm border-2">
                  <div className="h-12 w-12 bg-muted/30 rounded-2xl flex items-center justify-center font-black text-xs text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                     #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-3">
                        <h5 className="text-lg font-black text-foreground uppercase tracking-tight truncate">{row.itemName}</h5>
                        {row.isNew && (
                          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">New</span>
                        )}
                     </div>
                     <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                           <Layers className="w-3 h-3" /> {row.category || "Uncategorized"}
                        </span>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                           <Plus className="w-3 h-3" /> {row.addStock} {row.unitType}
                        </span>
                        {row.vendorName && (
                          <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-1 truncate max-w-[150px]">
                             <Truck className="w-3 h-3" /> {row.vendorName}
                          </span>
                        )}
                     </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end px-4">
                     <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Cost</div>
                     <div className="text-lg font-black text-amber-500">₹{((Number(row.addStock) || 0) * (Number(row.costPerUnit) || 0)).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                     <Button variant="ghost" size="icon" onClick={() => openEditor(row)} className="h-12 w-12 rounded-xl text-primary/40 hover:text-primary hover:bg-primary/10">
                        <Edit3 className="w-5 h-5" />
                     </Button>
                     <Button variant="ghost" size="icon" onClick={() => removeRow(row.id)} className="h-12 w-12 rounded-xl text-red-500/30 hover:text-red-500 hover:bg-red-500/10">
                        <Trash2 className="w-5 h-5" />
                     </Button>
                  </div>
               </div>
             ))}
             
             {/* Desktop Buttons */}
             <div className="hidden sm:flex flex-col sm:flex-row gap-4 mt-8 animate-in fade-in duration-500">
                <Button onClick={() => openEditor()} className="flex-1 h-16 rounded-[2rem] bg-background border-2 border-dashed border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 font-black uppercase tracking-widest transition-all active:scale-95">
                   <Plus className="w-6 h-6 mr-3" /> Add Another Item
                </Button>
                <Button onClick={handleSubmitBatch} disabled={isSubmitting} className="flex-1 h-16 rounded-[2rem] bg-primary hover:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
                   {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Save className="w-6 h-6 mr-3" />} Sync Basket to Inventory
                </Button>
             </div>

             {/* Clear Basket Option (Subtle Cancel) */}
             <div className="flex justify-center mt-6">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    if (confirm("Are you sure you want to clear the entire intake basket?")) {
                      setRows([])
                    }
                  }}
                  className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 hover:opacity-100 text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                >
                   <X className="w-4 h-4" /> Cancel Batch / Clear Basket
                </Button>
             </div>
          </div>
        )}
      </div>

      {/* --- RESULTS REPORT --- */}
      {importResult && (
        <div className="glass-panel p-8 rounded-[3rem] border-2 border-emerald-500/20 bg-emerald-500/[0.02] backdrop-blur-2xl animate-in zoom-in-95 duration-500 shadow-2xl">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6 text-white" />
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

      {/* --- STEPPED EDITOR (MODAL/OVERLAY) --- */}
      {editingRow && (
        <div className="fixed inset-0 z-[999] bg-background flex flex-col animate-in slide-in-from-bottom duration-500 md:rounded-[3rem] md:inset-4 md:shadow-[0_0_100px_rgba(0,0,0,0.5)] md:border-2 md:border-border/50 overflow-hidden">
           {/* Header */}
           <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-4">
                 <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                 </div>
                 <div>
                    <h4 className="text-lg font-black text-foreground uppercase tracking-tight">Intake Sequence</h4>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Step {editorStep} of 4</p>
                 </div>
              </div>
              <Button variant="ghost" size="icon" onClick={closeEditor} className="h-12 w-12 rounded-full hover:bg-red-500/10 hover:text-red-500">
                 <X className="w-6 h-6" />
              </Button>
           </div>

           {/* Progress Bar */}
           <div className="h-1.5 w-full bg-muted flex">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={cn(
                  "flex-1 h-full transition-all duration-500",
                  s <= editorStep ? "bg-primary" : "bg-transparent"
                )} />
              ))}
           </div>

           {/* Editor Content */}
           <div className="flex-1 overflow-y-auto p-8 space-y-12 pb-32">
              
              {/* STEP 1: Product Identity */}
              {editorStep === 1 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div className="space-y-4 text-center sm:text-left">
                      <div className="h-16 w-16 bg-blue-500/10 rounded-[1.5rem] flex items-center justify-center mb-4 mx-auto sm:mx-0 border border-blue-500/20">
                         <Search className="w-8 h-8 text-blue-500" />
                      </div>
                      <h5 className="text-3xl font-black text-foreground tracking-tighter uppercase">Identify Product</h5>
                      <p className="text-muted-foreground font-bold text-sm tracking-wide">Which product has arrived at the warehouse? Start typing to find or create.</p>
                   </div>
                   
                   <SearchableDropdown
                      options={itemNames}
                      value={editingRow.itemName}
                      onChange={(val, isNew) => handleItemSelect(val, isNew)}
                      placeholder="Start typing product name..."
                      allowNew
                      newLabel="Onboard New Product"
                      icon={Package}
                      className="h-20 text-xl border-blue-500/20 shadow-lg"
                   />

                   <div className="flex justify-between items-center">
                      <Button variant="ghost" onClick={closeEditor} className="font-black uppercase tracking-widest text-xs opacity-40 hover:opacity-100 text-red-500">
                         Cancel Editor
                      </Button>
                      {editingRow.itemName && (
                        <Button onClick={() => setEditorStep(2)} className="h-14 px-8 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">
                           Next Step <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      )}
                   </div>
                </div>
              )}

              {/* STEP 2: Category Taxonomy */}
              {editorStep === 2 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div className="space-y-4 text-center sm:text-left">
                      <div className="h-16 w-16 bg-purple-500/10 rounded-[1.5rem] flex items-center justify-center mb-4 mx-auto sm:mx-0 border border-purple-500/20">
                         <Layers className="w-8 h-8 text-purple-500" />
                      </div>
                      <h5 className="text-3xl font-black text-foreground tracking-tighter uppercase">Taxonomy Group</h5>
                      <p className="text-muted-foreground font-bold text-sm tracking-wide">Assign <span className="text-foreground font-black">&ldquo;{editingRow.itemName}&rdquo;</span> to a category for organization.</p>
                   </div>
                   
                   <SearchableDropdown
                      options={allCategories}
                      value={editingRow.category}
                      onChange={(val, isNew) => handleCategorySelect(val, isNew)}
                      placeholder="Select or Create Category..."
                      allowNew
                      newLabel="New Category"
                      icon={Layers}
                      className="h-20 text-xl border-purple-500/20 shadow-lg"
                   />

                   <div className="flex justify-between items-center">
                      <Button variant="ghost" onClick={() => setEditorStep(1)} className="font-black uppercase tracking-widest text-xs opacity-40 hover:opacity-100">
                         <ArrowLeft className="w-4 h-4 mr-2" /> Back
                      </Button>
                      <Button onClick={() => setEditorStep(3)} className="h-14 px-8 rounded-2xl bg-purple-500 hover:bg-purple-600 text-white font-black uppercase tracking-widest shadow-lg shadow-purple-500/20">
                         Inventory Load <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                   </div>
                </div>
              )}

              {/* STEP 3: Quantity & Loading */}
              {editorStep === 3 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div className="space-y-4 text-center sm:text-left">
                      <div className="h-16 w-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center mb-4 mx-auto sm:mx-0 border border-emerald-500/20">
                         <TrendingUp className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h5 className="text-3xl font-black text-foreground tracking-tighter uppercase">Inventory Load</h5>
                      <p className="text-muted-foreground font-bold text-sm tracking-wide">How many units were delivered? Specify quantity and packaging.</p>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Volume Received</label>
                         <Input
                            type="number"
                            placeholder="0"
                            value={editingRow.addStock}
                            onChange={(e) => setEditingRow({ ...editingRow, addStock: e.target.value === "" ? "" : Number(e.target.value) })}
                            className="h-20 bg-background border-emerald-500/20 text-emerald-500 font-black text-4xl rounded-[1.5rem] shadow-lg text-center"
                            autoFocus
                         />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Packaging Unit</label>
                         <div className="relative group/select">
                            <select
                              value={editingRow.unitType}
                              onChange={(e) => setEditingRow({ ...editingRow, unitType: e.target.value })}
                              className="w-full h-20 px-8 rounded-[1.5rem] border border-border/50 bg-background text-2xl font-black uppercase tracking-tight text-foreground appearance-none shadow-lg outline-none focus:ring-2 focus:ring-primary/20"
                            >
                              <option value="pcs">Pieces</option>
                              <option value="kg">Kilograms</option>
                              <option value="gm">Grams</option>
                              <option value="liter">Liters</option>
                              <option value="packet">Packets</option>
                              <option value="box">Boxes</option>
                              <option value="plate">Plates</option>
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-hover/select:text-primary transition-colors pointer-events-none" />
                         </div>
                      </div>
                   </div>

                   {(editingRow.unitType === "box" || editingRow.unitType === "packet" || editingRow.unitType === "plate") && (
                     <div className="p-8 rounded-[2rem] bg-blue-500/5 border border-blue-500/10 space-y-4 animate-in zoom-in-95">
                        <div className="flex items-center gap-2">
                           <Info className="w-4 h-4 text-blue-500" />
                           <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Container Multiplier</label>
                        </div>
                        <p className="text-xs font-bold text-muted-foreground">How many individual items are inside each <span className="text-foreground uppercase">{editingRow.unitType}</span>?</p>
                        <Input
                          type="number"
                          placeholder="e.g. 24 items per pack"
                          value={editingRow.multiplier}
                          onChange={(e) => setEditingRow({ ...editingRow, multiplier: e.target.value === "" ? "" : Number(e.target.value) })}
                          className="h-14 bg-background border-blue-500/20 text-blue-500 font-black text-xl rounded-2xl"
                        />
                     </div>
                   )}

                   <div className="flex justify-between items-center">
                      <Button variant="ghost" onClick={() => setEditorStep(2)} className="font-black uppercase tracking-widest text-xs opacity-40 hover:opacity-100">
                         <ArrowLeft className="w-4 h-4 mr-2" /> Back
                      </Button>
                      <Button 
                        onClick={() => {
                          if (!editingRow.addStock || Number(editingRow.addStock) <= 0) {
                            toast.error("Please enter a valid quantity.")
                            return
                          }
                          setEditorStep(4)
                        }} 
                        className="h-14 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                      >
                         Financials & Sourcing <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                   </div>
                </div>
              )}

              {/* STEP 4: Financials & Vendor */}
              {editorStep === 4 && (
                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
                   <div className="space-y-4 text-center sm:text-left">
                      <div className="h-16 w-16 bg-amber-500/10 rounded-[1.5rem] flex items-center justify-center mb-4 mx-auto sm:mx-0 border border-amber-500/20">
                         <IndianRupee className="w-8 h-8 text-amber-500" />
                      </div>
                      <h5 className="text-3xl font-black text-foreground tracking-tighter uppercase">Financial Control</h5>
                      <p className="text-muted-foreground font-bold text-sm tracking-wide">Finalize the buy/sell prices and identify the supply source.</p>
                   </div>
                   
                   {/* Prices */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                            <ArrowDown className="w-3 h-3 text-red-500" /> Cost (Buy Price / Unit)
                         </label>
                         <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/30 font-black text-lg">₹</span>
                            <Input
                               type="number"
                               placeholder="0.00"
                               value={editingRow.costPerUnit}
                               onChange={(e) => setEditingRow({ ...editingRow, costPerUnit: e.target.value === "" ? "" : Number(e.target.value) })}
                               className="h-20 pl-12 bg-background border-amber-500/20 text-foreground font-black text-3xl rounded-[1.5rem] shadow-lg"
                               autoFocus
                            />
                         </div>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                            <ArrowUp className="w-3 h-3 text-emerald-500" /> List (Sell Price)
                         </label>
                         <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/30 font-black text-lg">₹</span>
                            <Input
                               type="number"
                               placeholder="0.00"
                               value={editingRow.sellPrice}
                               onChange={(e) => setEditingRow({ ...editingRow, sellPrice: e.target.value === "" ? "" : Number(e.target.value) })}
                               className="h-20 pl-12 bg-background border-border/50 text-foreground font-black text-3xl rounded-[1.5rem] shadow-lg"
                            />
                         </div>
                      </div>
                   </div>

                   {/* Vendor */}
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                         <Truck className="w-3.5 h-3.5" /> Supplier Source (Vendor)
                      </label>
                      <SearchableDropdown
                         options={allVendors}
                         value={editingRow.vendorName}
                         onChange={(val, isNew) => handleVendorSelect(val, isNew)}
                         placeholder="Which vendor supplied this?"
                         allowNew
                         newLabel="Onboard Vendor"
                         icon={Truck}
                         className="h-20 text-xl border-purple-500/20 shadow-lg"
                      />
                   </div>

                   {/* Remarks */}
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                         <Info className="w-3.5 h-3.5" /> Internal Delivery Notes
                      </label>
                      <Input
                         placeholder="Invoice #, Delivery remarks, Batch code..."
                         value={editingRow.notes}
                         onChange={(e) => setEditingRow({ ...editingRow, notes: e.target.value })}
                         className="h-16 bg-muted/20 border-border/50 rounded-2xl font-bold px-6"
                      />
                   </div>

                   <div className="flex justify-between items-center pt-8">
                      <Button variant="ghost" onClick={() => setEditorStep(3)} className="font-black uppercase tracking-widest text-xs opacity-40 hover:opacity-100">
                         <ArrowLeft className="w-4 h-4 mr-2" /> Back
                      </Button>
                      <Button 
                        onClick={saveToCart} 
                        className="h-20 px-12 rounded-[2rem] bg-gradient-to-r from-primary to-emerald-600 hover:from-emerald-600 hover:to-primary text-white font-black uppercase tracking-widest shadow-[0_20px_50px_rgba(16,185,129,0.3)] transition-all active:scale-95 text-lg"
                      >
                         <Check className="w-6 h-6 mr-3" /> Add to Basket
                      </Button>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}

      {/* --- FLOATING MOBILE ACTION BAR --- */}
      {rows.length > 0 && !editingRow && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] md:hidden w-[90%] flex flex-col gap-3 animate-in slide-in-from-bottom duration-700">
           <div className="flex gap-3">
              <Button 
                onClick={() => openEditor()}
                className="h-16 flex-1 rounded-2xl bg-background border-2 border-primary/40 text-primary font-black uppercase tracking-widest text-[10px] shadow-2xl backdrop-blur-xl transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 mr-2" /> Add Next Product
              </Button>
           </div>
           <Button 
             onClick={handleSubmitBatch} 
             disabled={isSubmitting}
             className="h-20 w-full rounded-3xl bg-primary hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-sm shadow-[0_20px_60px_rgba(16,185,129,0.6)] active:scale-95 transition-all flex items-center justify-center gap-4"
           >
             {isSubmitting ? <Loader2 className="w-8 h-8 animate-spin" /> : <Save className="w-8 h-8" />} 
             Finalize & Sync {rows.length} Items
           </Button>
        </div>
      )}
    </div>
  )
}

function ArrowDown(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  )
}

function ArrowUp(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  )
}
