"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Save, Loader2, Package, TrendingUp, CheckCircle2, AlertCircle, ChevronDown, Search, Sparkles, IndianRupee, Tag, Truck, Info, Layers } from "lucide-react"
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
          "flex items-center h-12 w-full rounded-2xl border bg-background/50 px-4 text-sm cursor-pointer hover:border-primary/40 transition-all duration-300 group shadow-sm",
          open ? "ring-2 ring-primary/20 border-primary" : "border-border/50",
          className
        )}
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
      >
        {Icon && <Icon className="w-4 h-4 mr-3 text-muted-foreground group-hover:text-primary transition-colors" />}
        {value ? (
          <span className="truncate font-bold text-foreground">{value}</span>
        ) : (
          <span className="text-muted-foreground/50 truncate font-medium">{placeholder}</span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0 group-hover:text-primary transition-colors" />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-2 w-full min-w-[260px] bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-border/50 bg-muted/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search database..."
                className="w-full h-10 pl-10 pr-4 text-sm bg-background rounded-xl border-border/50 border focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/40 font-medium"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto py-2 custom-scrollbar">
            {filtered.length === 0 && !allowNew && (
              <div className="px-4 py-8 text-xs text-muted-foreground text-center font-medium italic">No matches found</div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelect(opt, false)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-primary/10 transition-colors truncate font-bold text-foreground/80 hover:text-primary flex items-center gap-3"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                {opt}
              </button>
            ))}
            {allowNew && search.trim() && !exactMatch && (
              <button
                onClick={() => handleSelect(search.trim(), true)}
                className="w-full text-left px-4 py-3 text-sm bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors flex items-center gap-2 border-t border-border/50 text-emerald-500 font-black tracking-tight"
              >
                <Plus className="w-4 h-4" />
                {newLabel || "Add new"}: &ldquo;{search.trim()}&rdquo;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────
let rowCounter = 0
const makeRow = (): ManualRow => ({
  id: `row-${++rowCounter}-${Date.now()}`,
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

const calcRowTotal = (row: ManualRow): number => {
  const qty = Number(row.addStock) || 0
  const cost = Number(row.costPerUnit) || 0
  return qty * cost
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
  const [rows, setRows] = useState<ManualRow[]>([makeRow()])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>(existingCategories)
  const [allVendors, setAllVendors] = useState<string[]>(existingVendors.map(v => v.name))

  const itemNames = existingItems.map(i => i.name)

  const handleAddRow = () => setRows(prev => [...prev, makeRow()])
  const handleRemoveRow = (id: string) => {
    if (rows.length > 1) setRows(prev => prev.filter(r => r.id !== id))
  }
  const updateRow = (id: string, patch: Partial<ManualRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  const handleItemSelect = (rowId: string, itemName: string, isNew: boolean) => {
    if (isNew) {
      updateRow(rowId, { itemName, selectedItemId: null, isNew: true })
      return
    }
    const item = existingItems.find(i => i.name === itemName)
    if (!item) return
    updateRow(rowId, {
      itemName: item.name,
      selectedItemId: item.id,
      category: item.category || "",
      unitType: item.unit || "pcs",
      costPerUnit: item.costPerUnit ?? "",
      sellPrice: item.sellPrice ?? "",
      multiplier: item.piecesPerBox ?? "",
      isNew: false,
    })
  }

  const handleCategorySelect = (rowId: string, cat: string, isNew: boolean) => {
    updateRow(rowId, { category: cat })
    if (isNew && !allCategories.includes(cat)) setAllCategories(prev => [...prev, cat])
  }

  const handleVendorSelect = (rowId: string, vendorName: string, isNew: boolean) => {
    const existingVendor = existingVendors.find(v => v.name === vendorName)
    updateRow(rowId, {
      vendorName,
      selectedVendorId: existingVendor?.id || null,
      isNewVendor: isNew,
    })
    if (isNew && !allVendors.includes(vendorName)) setAllVendors(prev => [...prev, vendorName])
  }

  const grandTotal = rows.reduce((sum, r) => sum + calcRowTotal(r), 0)

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r.itemName.trim() !== "")
    if (validRows.length === 0) { toast.error("Add at least one product name."); return }
    const missingQty = validRows.filter(r => !r.addStock || Number(r.addStock) <= 0)
    if (missingQty.length > 0) { toast.error(`${missingQty.length} row(s) missing quantity.`); return }

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
        toast.success(`Success: ${result.summary.successful} items stocked!`)
        if (result.summary.failed === 0) setRows([makeRow()])
      }
    } catch (error) {
      toast.error("Submit failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const showMultiplier = (unit: string) => ["box", "packet", "plate"].includes(unit)

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-primary/5 p-6 rounded-[2rem] border border-primary/10 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
          <Package className="w-24 h-24 text-primary" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-foreground tracking-tight uppercase">Bulk Entry <span className="text-primary italic">Wizard</span></h3>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.2em] opacity-60">High-speed warehouse inventory intake</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 relative z-10">
          <Button 
            variant="outline" 
            onClick={handleAddRow} 
            className="h-14 px-8 rounded-2xl border-primary/20 bg-background/50 hover:bg-primary/10 hover:border-primary/40 font-black uppercase tracking-widest text-xs transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2 text-primary" /> Add Product
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting} 
            className="h-14 px-8 rounded-2xl bg-primary hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />} Submit Batch
          </Button>
        </div>
      </div>

      {/* Summary Banner */}
      {grandTotal > 0 && (
        <div className="flex flex-col sm:flex-row items-center gap-6 p-8 rounded-[2.5rem] bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-300 shadow-[0_20px_50px_-12px_rgba(245,158,11,0.3)] animate-in slide-in-from-bottom-4 duration-500">
          <div className="h-16 w-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/30">
            <IndianRupee className="w-8 h-8 text-white drop-shadow-md" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em] mb-1">Batch Total Obligations</p>
            <h4 className="text-5xl font-black text-white tracking-tighter drop-shadow-xl">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
          </div>
          <div className="sm:ml-auto p-4 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
            <div className="flex items-center gap-2">
               <Info className="w-3.5 h-3.5 text-white/60" />
               <span className="text-[10px] font-black text-white uppercase tracking-widest">Billing Breakdown</span>
            </div>
            <p className="text-xs font-bold text-white/80 mt-1">{rows.filter(r => r.vendorName).length} items assigned to vendors</p>
          </div>
        </div>
      )}

      {/* Entry Cards Grid */}
      <div className="space-y-6">
        {rows.map((row, index) => {
          const rowTotal = calcRowTotal(row)
          return (
            <div
              key={row.id}
              className="relative group animate-in fade-in slide-in-from-left-4 duration-500"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn(
                "glass-panel rounded-[2.5rem] border-2 bg-background/40 backdrop-blur-xl p-6 sm:p-8 transition-all duration-500 shadow-xl overflow-hidden",
                row.isNew && row.itemName ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "border-border/50",
                !row.isNew ? "border-blue-500/20 bg-blue-500/[0.02]" : ""
              )}>
                
                {/* Visual Accent */}
                <div className={cn(
                  "absolute top-0 left-0 w-2 h-full transition-colors",
                  row.isNew && row.itemName ? "bg-emerald-500/40" : "bg-primary/20",
                  !row.isNew ? "bg-blue-500/40" : ""
                )} />

                {/* Header Row */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-foreground/5 border border-border/50 flex items-center justify-center font-black text-xs text-muted-foreground shadow-inner">
                      #{index + 1}
                    </div>
                    {row.isNew && row.itemName && (
                      <span className="px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-emerald-500/20 flex items-center gap-2 animate-pulse">
                        <Sparkles className="w-3 h-3" /> New Item Detected
                      </span>
                    )}
                    {!row.isNew && row.itemName && (
                      <span className="px-4 py-1.5 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-blue-500/20">
                        Live Catalog Sync
                      </span>
                    )}
                    {rowTotal > 0 && (
                      <div className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                        <IndianRupee className="w-3 h-3" /> Row: ₹{rowTotal.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRow(row.id)}
                    disabled={rows.length === 1}
                    className="h-12 w-12 rounded-2xl text-red-500/30 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-75"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>

                {/* Main Inputs Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: Product Identity */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="space-y-3 p-6 rounded-3xl bg-white/5 border border-white/10 shadow-inner">
                      <div className="flex items-center gap-2 px-1">
                        <Tag className="w-3.5 h-3.5 text-primary" />
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Identity & Taxonomy</label>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <SearchableDropdown
                          options={itemNames}
                          value={row.itemName}
                          onChange={(val, isNew) => handleItemSelect(row.id, val, isNew)}
                          placeholder="What product arrived?"
                          allowNew
                          newLabel="Create new product"
                          icon={Package}
                          className="bg-background h-14"
                        />
                        <SearchableDropdown
                          options={allCategories}
                          value={row.category}
                          onChange={(val, isNew) => handleCategorySelect(row.id, val, isNew)}
                          placeholder="Select Category"
                          allowNew
                          newLabel="New Category"
                          icon={Layers}
                          className="bg-background h-14"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 p-6 rounded-3xl bg-purple-500/5 border border-purple-500/10 shadow-inner">
                      <div className="flex items-center gap-2 px-1">
                        <Truck className="w-3.5 h-3.5 text-purple-500" />
                        <label className="text-[10px] font-black text-purple-500/60 uppercase tracking-widest">Sourcing (Vendor)</label>
                      </div>
                      <SearchableDropdown
                        options={allVendors}
                        value={row.vendorName}
                        onChange={(val, isNew) => handleVendorSelect(row.id, val, isNew)}
                        placeholder="Supplier source..."
                        allowNew
                        newLabel="Onboard Vendor"
                        icon={Truck}
                        className="bg-background h-14 border-purple-500/20"
                      />
                    </div>
                  </div>

                  {/* Right Column: Qty & Finance */}
                  <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Qty Group */}
                    <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 shadow-inner flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <Plus className="w-3.5 h-3.5 text-emerald-500" />
                          <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">Inventory Load</label>
                        </div>
                        <div className="flex gap-3">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={row.addStock}
                            onChange={(e) => updateRow(row.id, { addStock: e.target.value === "" ? "" : Number(e.target.value) })}
                            className="h-14 bg-background border-emerald-500/20 text-emerald-600 font-black text-xl rounded-2xl focus-visible:ring-emerald-500/30"
                          />
                          <select
                            value={row.unitType}
                            onChange={(e) => updateRow(row.id, { unitType: e.target.value })}
                            className="w-32 h-14 px-3 rounded-2xl border border-border/50 bg-background text-xs font-black uppercase tracking-tighter text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none"
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
                      
                      {showMultiplier(row.unitType) && (
                        <div className="animate-in zoom-in-95 duration-300">
                          <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 block ml-1">Pack Size (Items / {row.unitType})</label>
                          <Input
                            type="number"
                            placeholder="e.g. 24"
                            value={row.multiplier}
                            onChange={(e) => updateRow(row.id, { multiplier: e.target.value === "" ? "" : Number(e.target.value) })}
                            className="h-12 bg-blue-500/5 border-blue-500/20 text-blue-500 font-bold rounded-xl"
                          />
                        </div>
                      )}
                    </div>

                    {/* Pricing Group */}
                    <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 shadow-inner space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <IndianRupee className="w-3.5 h-3.5 text-amber-500" />
                          <label className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest">Financials (INR)</label>
                        </div>
                        <div className="space-y-4">
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 font-black text-sm">BUY</span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={row.costPerUnit}
                              onChange={(e) => updateRow(row.id, { costPerUnit: e.target.value === "" ? "" : Number(e.target.value) })}
                              className="h-14 pl-14 bg-background border-amber-500/20 text-foreground font-black text-lg rounded-2xl focus-visible:ring-amber-500/30"
                            />
                          </div>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 font-black text-sm">SELL</span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={row.sellPrice}
                              onChange={(e) => updateRow(row.id, { sellPrice: e.target.value === "" ? "" : Number(e.target.value) })}
                              className="h-14 pl-14 bg-background border-border/50 text-foreground font-black text-lg rounded-2xl focus-visible:ring-primary/20"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes (Full width on md+) */}
                    <div className="md:col-span-2 p-4 rounded-2xl bg-foreground/5 border border-border/50 flex items-center gap-4">
                      <Info className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                      <Input
                        placeholder="Log internal notes, invoice numbers or delivery remarks here..."
                        value={row.notes}
                        onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                        className="bg-transparent border-0 h-8 focus-visible:ring-0 text-xs font-medium placeholder:text-muted-foreground/30 p-0 shadow-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Add Row */}
      <button
        onClick={handleAddRow}
        className="w-full py-8 border-4 border-dashed border-primary/10 rounded-[2.5rem] bg-primary/[0.02] text-primary/40 hover:text-primary hover:bg-primary/[0.05] hover:border-primary/30 transition-all duration-500 flex flex-col items-center justify-center gap-3 active:scale-[0.99] group"
      >
        <div className="p-4 bg-background rounded-full shadow-lg group-hover:shadow-primary/20 transition-all border border-border/50">
          <Plus className="w-6 h-6" />
        </div>
        <span className="text-xs font-black uppercase tracking-[0.4em] opacity-80">Append Row to Batch</span>
      </button>

      {/* Results HUD */}
      {importResult && (
        <div className="glass-panel p-8 rounded-[3rem] border-2 border-emerald-500/20 bg-emerald-500/[0.02] backdrop-blur-2xl animate-in zoom-in-95 duration-500 shadow-2xl shadow-emerald-500/10">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-foreground uppercase tracking-tight">Processing Report</h4>
                  <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-60">Session results overview</p>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setImportResult(null)} className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">Dismiss</Button>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-background/50 border border-border/50 p-6 rounded-[2rem] text-center shadow-sm">
                <div className="text-3xl font-black text-foreground">{importResult.summary.totalProcessed}</div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Processed</div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] text-center shadow-sm">
                <div className="text-3xl font-black text-emerald-500">{importResult.summary.successful}</div>
                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Deployed</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] text-center shadow-sm">
                <div className="text-3xl font-black text-red-500">{importResult.summary.failed}</div>
                <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">Faulted</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-4">
                <h5 className="font-black text-red-500 text-[10px] uppercase tracking-widest flex items-center gap-2 bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                  <AlertCircle className="w-4 h-4" /> Error Log (Critical Exceptions)
                </h5>
                <div className="space-y-2">
                  {importResult.errors.map((error, i) => (
                    <div key={i} className="text-xs font-bold bg-background border border-red-500/20 rounded-2xl p-4 text-red-500/80 shadow-sm flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
