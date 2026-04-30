"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Save, Loader2, Package, TrendingUp, CheckCircle2, AlertCircle, ChevronDown, Search, Sparkles, IndianRupee } from "lucide-react"
import { toast } from "sonner"

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
}: {
  options: string[]
  value: string
  onChange: (val: string, isNew: boolean) => void
  placeholder: string
  allowNew?: boolean
  newLabel?: string
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
        className="flex items-center h-10 w-full rounded-xl border border-input bg-background px-3 text-sm cursor-pointer hover:border-primary/40 transition-colors"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
      >
        {value ? (
          <span className="truncate font-medium text-foreground">{value}</span>
        ) : (
          <span className="text-muted-foreground/50 truncate">{placeholder}</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto flex-shrink-0" />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full min-w-[220px] bg-background border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search..."
                className="w-full h-8 pl-8 pr-3 text-sm bg-muted/30 rounded-lg border-0 outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto py-1">
            {filtered.length === 0 && !allowNew && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">No results found</div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelect(opt, false)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors truncate"
              >
                {opt}
              </button>
            ))}
            {allowNew && search.trim() && !exactMatch && (
              <button
                onClick={() => handleSelect(search.trim(), true)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-500/10 transition-colors flex items-center gap-2 border-t border-border text-emerald-500 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
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

// ── Cost Calculator ─────────────────────────────────────────────────────────
function calcRowTotal(row: ManualRow): number {
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

  // Pick existing item → auto-fill
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

  // Pick or create category
  const handleCategorySelect = (rowId: string, cat: string, isNew: boolean) => {
    updateRow(rowId, { category: cat })
    if (isNew && !allCategories.includes(cat)) {
      setAllCategories(prev => [...prev, cat])
    }
  }

  // Pick or create vendor
  const handleVendorSelect = (rowId: string, vendorName: string, isNew: boolean) => {
    const existingVendor = existingVendors.find(v => v.name === vendorName)
    updateRow(rowId, {
      vendorName,
      selectedVendorId: existingVendor?.id || null,
      isNewVendor: isNew,
    })
    if (isNew && !allVendors.includes(vendorName)) {
      setAllVendors(prev => [...prev, vendorName])
    }
  }

  // Grand total across all rows
  const grandTotal = rows.reduce((sum, r) => sum + calcRowTotal(r), 0)

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r.itemName.trim() !== "")
    if (validRows.length === 0) {
      toast.error("Please add at least one item with a name.")
      return
    }
    const missingQty = validRows.filter(r => !r.addStock || Number(r.addStock) <= 0)
    if (missingQty.length > 0) {
      toast.error(`${missingQty.length} row(s) are missing a quantity. Please fill "Add Stock" for every item.`)
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result: ImportResult = await response.json()
      setImportResult(result)

      if (result.summary.successful > 0) {
        toast.success(`✅ ${result.summary.successful} item(s) stocked in successfully!`)
        if (result.summary.failed === 0) setRows([makeRow()])
      }
      if (result.summary.failed > 0) {
        toast.error(`${result.summary.failed} item(s) failed. Check results below.`)
      }
    } catch (error) {
      console.error("Submit error:", error)
      toast.error(`Submit failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const showMultiplier = (unit: string) => ["box", "packet", "plate"].includes(unit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
            <Package className="w-6 h-6 text-primary" />
            Bulk Stock Entry
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Add multiple stock items at once — pick existing products or add new ones
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={handleAddRow} className="border-primary/20 hover:bg-primary/10 flex-1 sm:flex-initial">
            <Plus className="w-4 h-4 mr-2" />
            Add Row
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-emerald-500 text-primary-foreground flex-1 sm:flex-initial">
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save All
          </Button>
        </div>
      </div>

      {/* Grand Total Banner */}
      {grandTotal > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <IndianRupee className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider">Estimated Total Cost</p>
            <p className="text-2xl font-black text-foreground tracking-tighter">
              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <span className="ml-auto text-[10px] font-black text-amber-500/60 uppercase tracking-wider">
            {rows.filter(r => r.vendorName).length > 0 ? "Will reflect in Vendor Ledger" : "No vendor assigned"}
          </span>
        </div>
      )}

      {/* Row Cards */}
      <div className="space-y-4">
        {rows.map((row, index) => {
          const rowTotal = calcRowTotal(row)
          return (
            <div
              key={row.id}
              className="glass-panel rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm p-4 sm:p-5 hover:border-primary/20 transition-all relative group"
            >
              {/* Row header badges */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border">
                    #{index + 1}
                  </span>
                  {row.isNew && row.itemName && (
                    <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> NEW PRODUCT
                    </span>
                  )}
                  {!row.isNew && row.itemName && (
                    <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                      EXISTING · Stock: {existingItems.find(i => i.name === row.itemName)?.currentStock ?? 0}
                    </span>
                  )}
                  {row.isNewVendor && row.vendorName && (
                    <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> NEW VENDOR
                    </span>
                  )}
                  {rowTotal > 0 && (
                    <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" /> ₹{rowTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveRow(row.id)}
                  disabled={rows.length === 1}
                  className="h-8 w-8 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Row 1: Item + Category + Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Product *</label>
                  <SearchableDropdown
                    options={itemNames}
                    value={row.itemName}
                    onChange={(val, isNew) => handleItemSelect(row.id, val, isNew)}
                    placeholder="Search or add product..."
                    allowNew
                    newLabel="Add new product"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Category {row.isNew ? "*" : ""}</label>
                  <SearchableDropdown
                    options={allCategories}
                    value={row.category}
                    onChange={(val, isNew) => handleCategorySelect(row.id, val, isNew)}
                    placeholder="Select or create..."
                    allowNew
                    newLabel="Create category"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Unit</label>
                  <select
                    value={row.unitType}
                    onChange={(e) => updateRow(row.id, { unitType: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="gm">Gram (gm)</option>
                    <option value="liter">Litre (l)</option>
                    <option value="ml">Millilitre (ml)</option>
                    <option value="packet">Packet</option>
                    <option value="box">Box</option>
                    <option value="plate">Plate</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Qty + Buy + Sell + Multiplier */}
              <div className={`grid gap-3 mb-3 ${showMultiplier(row.unitType) ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Add Stock *</label>
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={row.addStock}
                    onChange={(e) => updateRow(row.id, { addStock: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="h-10 bg-emerald-500/5 border-emerald-500/20 text-emerald-500 font-bold rounded-xl placeholder:text-emerald-500/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Buy Price (₹)</label>
                  <Input
                    type="number"
                    placeholder="Cost per unit"
                    value={row.costPerUnit}
                    onChange={(e) => updateRow(row.id, { costPerUnit: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Sell Price (₹)</label>
                  <Input
                    type="number"
                    placeholder="Sell per unit"
                    value={row.sellPrice}
                    onChange={(e) => updateRow(row.id, { sellPrice: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="h-10 rounded-xl"
                  />
                </div>
                {showMultiplier(row.unitType) && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Pcs / {row.unitType}</label>
                    <Input
                      type="number"
                      placeholder="e.g. 20"
                      value={row.multiplier}
                      onChange={(e) => updateRow(row.id, { multiplier: e.target.value === "" ? "" : Number(e.target.value) })}
                      className="h-10 bg-blue-500/5 border-blue-500/20 text-blue-400 font-bold rounded-xl placeholder:text-blue-400/30"
                    />
                  </div>
                )}
              </div>

              {/* Row 3: Vendor + Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-wider">Vendor</label>
                  <SearchableDropdown
                    options={allVendors}
                    value={row.vendorName}
                    onChange={(val, isNew) => handleVendorSelect(row.id, val, isNew)}
                    placeholder="Select or add vendor..."
                    allowNew
                    newLabel="Create vendor"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Notes / Invoice</label>
                  <Input
                    placeholder="Invoice ref, delivery note..."
                    value={row.notes}
                    onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Add */}
      <button
        onClick={handleAddRow}
        className="w-full py-3 border-2 border-dashed border-border/50 rounded-2xl text-muted-foreground hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Add Another Item
      </button>

      {/* Results */}
      {importResult && (
        <div className="glass-panel p-6 rounded-3xl border-border/50 bg-background/50 backdrop-blur-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-foreground">Entry Results</h4>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{importResult.summary.totalProcessed}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div className="text-2xl font-bold text-emerald-500">{importResult.summary.successful}</div>
                <div className="text-xs text-muted-foreground">Success</div>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="text-2xl font-bold text-red-500">{importResult.summary.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            {importResult.results.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-foreground text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Successfully Saved
                </h5>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importResult.results.map((result, i) => (
                    <div key={i} className="text-xs bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 flex justify-between">
                      <div>
                        <span className="font-medium text-emerald-600">#{result.rowNum}</span> {result.itemName}
                        <span className="text-muted-foreground"> → {result.quantity} {result.unitType}</span>
                        {result.vendor !== "No Vendor" && (
                          <span className="text-purple-400 ml-1">· {result.vendor}</span>
                        )}
                        {Number(result.totalCost) > 0 && (
                          <span className="text-amber-500 ml-1 font-semibold">· ₹{result.totalCost}</span>
                        )}
                      </div>
                      <span className="text-muted-foreground text-[10px]">{result.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-foreground text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Errors
                </h5>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importResult.errors.map((error, i) => (
                    <div key={i} className="text-xs bg-red-500/5 border border-red-500/10 rounded-lg p-2 text-red-400">
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
