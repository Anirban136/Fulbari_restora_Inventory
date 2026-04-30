"use client"

import { useState, useMemo, useEffect } from "react"
import { Truck, Loader2, AlertCircle, CheckCircle2, Tag, Layers, IndianRupee, Info, Plus, ChevronDown, Package } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ItemSearchableSelect } from "@/components/inventory/ItemSearchableSelect"
import { AddVendorDialog } from "../AddVendorDialog"
import { AddItemDialog } from "../AddItemDialog"
import { logStockIn } from "./actions"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Item {
  id: string
  name: string
  category?: string
  unit: string
  piecesPerBox?: number | null
}

interface Vendor {
  id: string
  name: string
}

export function StockInForm({ items, vendors }: { items: Item[], vendors: Vendor[] }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ error?: string; success?: boolean } | null>(null)
  
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [unitType, setUnitType] = useState<string>("pieces")

  useEffect(() => {
    if (!selectedCategory && items.length > 0) {
      setSelectedCategory("All Categories")
    }
  }, [items, selectedCategory])

  const sortedCategories = useMemo(() => {
    const cats = Array.from(new Set(items.map(i => i.category || 'Uncategorized')))
    return cats.sort((a,b) => a.localeCompare(b))
  }, [items])

  const filteredItems = useMemo(() => {
    if (selectedCategory === "All Categories" || !selectedCategory) return items;
    return items.filter(item => (item.category || "Uncategorized") === selectedCategory)
  }, [items, selectedCategory])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setStatus(null)
    try {
      const result = await logStockIn(formData)
      if (result?.error) {
        setStatus({ error: result.error })
        toast.error(result.error)
      } else {
        setStatus({ success: true })
        toast.success("Inventory synchronization successful!", {
          description: `Logged delivery for ${selectedItem?.name || "Product"}`,
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        })
        setSelectedItem(null)
        setTimeout(() => setStatus(null), 3000)
        const form = document.getElementById("stock-in-form") as HTMLFormElement
        form?.reset()
      }
    } catch (err) {
      setStatus({ error: "A network error occurred." })
      toast.error("Network synchronization failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative group animate-in fade-in zoom-in-95 duration-700">
      {/* Decorative background glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-emerald-500/10 to-blue-500/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000 -z-10" />

      <div className="glass-panel p-8 sm:p-10 rounded-[3rem] border-2 border-border/50 bg-background/40 backdrop-blur-3xl shadow-2xl overflow-hidden relative">
        
        {/* Colorful top bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-emerald-500 to-blue-500 opacity-80" />

        <div className="flex items-center gap-5 mb-10">
          <div className="h-14 w-14 bg-gradient-to-br from-primary to-emerald-600 rounded-2xl flex items-center justify-center border border-white/20 shadow-[0_10px_30px_-5px_rgba(16,185,129,0.4)]">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-foreground tracking-tight uppercase">Single Entry <span className="text-emerald-500">Intake</span></h3>
            <p className="text-muted-foreground text-[10px] font-black tracking-[0.3em] uppercase opacity-60">Precision warehouse delivery log</p>
          </div>
        </div>
        
        <form id="stock-in-form" action={handleSubmit} className="space-y-8">
          {status?.error && (
            <div className="p-5 bg-red-500/10 border-2 border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500 animate-in slide-in-from-top-2 shadow-sm">
              <div className="h-10 w-10 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-black uppercase tracking-tight">{status.error}</p>
            </div>
          )}

          {status?.success && (
            <div className="p-5 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-2xl flex items-center gap-4 text-emerald-500 animate-in slide-in-from-top-2 shadow-sm">
              <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-black uppercase tracking-tight">Delivery verified and logged!</p>
            </div>
          )}

          {/* Section 1: Item Identity (Blue/Purple theme) */}
          <div className="space-y-6 p-6 rounded-[2rem] bg-blue-500/[0.03] border border-blue-500/10 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-5">
               <Tag className="w-20 h-20 text-blue-500" />
            </div>
            
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-blue-500/60 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <Layers className="w-3 h-3" /> Step 1: Product Selection
              </Label>
              <div className="grid grid-cols-1 gap-4">
                <div className="relative group/select">
                  <select
                    id="categoryFilter"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full h-14 pl-5 pr-10 rounded-2xl border border-border/50 bg-background/50 hover:bg-background transition-all shadow-inner font-bold text-foreground appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none"
                  >
                    <option value="All Categories">All Departments</option>
                    {sortedCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-hover/select:text-blue-500 transition-colors pointer-events-none" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Specific Product</span>
                    <AddItemDialog existingCategories={sortedCategories} variant="compact" />
                  </div>
                  <ItemSearchableSelect 
                    key={selectedCategory}
                    items={filteredItems} 
                    name="itemId" 
                    placeholder="Type name to find..." 
                    onSelect={(item) => setSelectedItem(item)}
                  />
                </div>
              </div>
            </div>

            {selectedItem && selectedItem.piecesPerBox && (
              <div className="p-5 rounded-2xl bg-blue-500/10 border-2 border-blue-500/20 flex items-center justify-between animate-in zoom-in-95">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Box Config</span>
                  <span className="text-xs font-bold text-foreground/80 mt-1">Multi-unit packing</span>
                </div>
                <div className="px-5 py-3 rounded-xl bg-blue-500 text-white font-black tracking-tighter text-xl shadow-lg shadow-blue-500/30">
                  {selectedItem.piecesPerBox} <span className="text-xs opacity-80 uppercase font-black ml-1">pcs</span> / UNIT
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Supply Chain (Purple theme) */}
          <div className="space-y-4 p-6 rounded-[2rem] bg-purple-500/[0.03] border border-purple-500/10 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-5">
               <Truck className="w-20 h-20 text-purple-500" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <Label className="text-[10px] font-black text-purple-500/60 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Truck className="w-3 h-3" /> Step 2: Vendor Origin
                </Label>
                <AddVendorDialog />
              </div>
              <div className="relative group/select">
                <select
                  id="vendorId"
                  name="vendorId"
                  className="w-full h-14 pl-5 pr-10 rounded-2xl border border-purple-500/20 bg-background/50 hover:bg-background transition-all shadow-inner font-bold text-foreground appearance-none focus:ring-2 focus:ring-purple-500/20 outline-none"
                >
                  <option value="">No Direct Vendor Assigned</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-hover/select:text-purple-500 transition-colors pointer-events-none" />
              </div>
            </div>
          </div>
          
          {/* Section 3: Quantity & Financials (Emerald theme) */}
          <div className="p-6 rounded-[2rem] bg-emerald-500/[0.03] border border-emerald-500/10 space-y-6">
            <Label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <Package className="w-3 h-3" /> Step 3: Intake Volume & Cost
            </Label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Total Quantity</Label>
                <Input id="quantity" name="quantity" type="number" step="0.01" min="0.01" placeholder="0.00" required className="h-14 bg-background border-emerald-500/20 text-emerald-600 rounded-2xl focus-visible:ring-emerald-500/20 shadow-inner font-black text-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Unit Type</Label>
                <div className="relative group/select">
                  <select
                    id="unitType"
                    name="unitType"
                    required
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    className="w-full h-14 pl-5 pr-10 rounded-2xl border border-border/50 bg-background focus:ring-2 focus:ring-primary/50 transition-all shadow-inner font-black text-sm text-foreground appearance-none outline-none"
                  >
                    <option value="pieces" className="italic capitalize">Pieces ({selectedItem?.unit || 'pcs'})</option>
                    <option value="box" className="font-bold" disabled={!selectedItem?.piecesPerBox}>Boxes (Box)</option>
                    <option value="packet" className="font-bold" disabled={!selectedItem?.piecesPerBox}>Packets (Packet)</option>
                    <option value="plate" className="font-bold" disabled={!selectedItem?.piecesPerBox}>Plates (Plate)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-hover/select:text-primary transition-colors pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Net Unit Cost (₹)
              </Label>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 h-8 w-8 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20">
                  <IndianRupee className="w-4 h-4 text-amber-500" />
                </div>
                <Input id="cost" name="cost" type="number" step="0.01" min="0" placeholder="0.00" className="h-14 pl-16 bg-background border-amber-500/20 text-foreground font-black text-xl rounded-2xl focus-visible:ring-amber-500/20 shadow-inner" />
              </div>
            </div>
          </div>

          {/* Notes & Submit (Amber theme) */}
          <div className="space-y-6">
            <div className="space-y-2 px-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                <Info className="w-3.5 h-3.5" /> Delivery Remarks
              </Label>
              <Input id="notes" name="notes" placeholder="Invoice #, Delivery note, Batch code..." className="h-14 bg-background border-border/50 text-foreground rounded-2xl focus-visible:ring-primary/20 shadow-inner font-bold" />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 text-lg font-black uppercase tracking-widest bg-gradient-to-r from-primary to-emerald-600 hover:from-emerald-600 hover:to-primary text-white shadow-[0_15px_40px_-10px_rgba(16,185,129,0.5)] rounded-2xl transition-all active:scale-95 disabled:opacity-50 group/btn"
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" /> Verifying...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  Confirm & Sync Inventory <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ArrowRight(props: any) {
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
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}
