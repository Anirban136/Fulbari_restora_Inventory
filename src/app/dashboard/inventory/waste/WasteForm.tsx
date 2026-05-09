"use client"

import { useState, useMemo, useEffect } from "react"
import { Trash2, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ItemSearchableSelect } from "@/components/inventory/ItemSearchableSelect"
import { logWaste } from "./actions"
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

interface Outlet {
  id: string
  name: string
  Stock: {
    itemId: string
    quantity: number
    Item: Item
  }[]
}

export function WasteForm({ items, vendors, outlets }: { items: Item[], vendors: Vendor[], outlets: Outlet[] }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ error?: string; success?: boolean } | null>(null)
  
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [unitType, setUnitType] = useState<string>("pieces")
  const [selectedOutletId, setSelectedOutletId] = useState<string>("global") // "global" or outletId

  useEffect(() => {
    if (!selectedCategory && items.length > 0) {
      setSelectedCategory("All Categories")
    }
  }, [items, selectedCategory])

  const sortedCategories = useMemo(() => {
    const currentItems = selectedOutletId === "global" 
      ? items 
      : outlets.find(o => o.id === selectedOutletId)?.Stock.map(s => s.Item) || []
    const cats = Array.from(new Set(currentItems.map(i => i.category || 'Uncategorized')))
    return cats.sort((a,b) => a.localeCompare(b))
  }, [items, outlets, selectedOutletId])

  const filteredItems = useMemo(() => {
    const currentItems = selectedOutletId === "global" 
      ? items 
      : outlets.find(o => o.id === selectedOutletId)?.Stock.map(s => s.Item) || []
    if (selectedCategory === "All Categories" || !selectedCategory) return currentItems;
    return currentItems.filter(item => (item.category || "Uncategorized") === selectedCategory)
  }, [items, outlets, selectedCategory, selectedOutletId])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setStatus(null)
    
    try {
      const result = await logWaste(formData)
      if (result?.error) {
        setStatus({ error: result.error })
        toast.error(result.error)
      } else {
        setStatus({ success: true })
        toast.success("Waste logged successfully!", {
          description: `Recorded waste for ${selectedItem?.name || "Product"}.`,
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        })
        setSelectedItem(null)
        setTimeout(() => setStatus(null), 3000)
        const form = document.getElementById("waste-form") as HTMLFormElement
        form?.reset()
      }
    } catch (err) {
      setStatus({ error: "A network error occurred. Please check your connection." })
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl self-start hover:border-red-500/20 transition-all border border-red-500/10">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-foreground tracking-tight">Log Waste / Damage</h3>
      </div>
      
      <form id="waste-form" action={handleSubmit} className="space-y-6">
        {status?.error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{status.error}</p>
          </div>
        )}

        {status?.success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">Waste logged successfully!</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="stockLocation" className="text-xs font-black text-foreground uppercase tracking-widest opacity-80 dark:opacity-70">
            Stock Location
          </Label>
          <select
            id="stockLocation"
            name="outletId"
            value={selectedOutletId}
            onChange={(e) => {
              setSelectedOutletId(e.target.value)
              setSelectedItem(null)
              setSelectedCategory("All Categories")
            }}
            className="w-full h-12 px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-red-500/50 transition-all shadow-inner font-medium text-foreground"
          >
            <option value="global" className="bg-card text-foreground font-bold">Global Catalog Stock</option>
            {outlets.map(o => (
              <option key={o.id} value={o.id} className="bg-card text-foreground">{o.name} Stock</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoryFilter" className="text-xs font-black text-foreground uppercase tracking-widest opacity-80 dark:opacity-70">
            Select Category
          </Label>
          <select
            id="categoryFilter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-12 px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-red-500/50 transition-all shadow-inner font-medium text-foreground"
          >
            <option value="All Categories" className="bg-card text-foreground font-bold">-- All Categories --</option>
            {sortedCategories.map(cat => (
              <option key={cat} value={cat} className="bg-card text-foreground">{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          <Label htmlFor="itemId" className="text-xs font-black text-foreground uppercase tracking-widest opacity-80 dark:opacity-70">Item Name (Type to search)</Label>
          <ItemSearchableSelect 
            key={selectedCategory}
            items={filteredItems} 
            name="itemId" 
            placeholder={filteredItems.length === 0 ? "No items in category..." : "Type product name..."} 
            onSelect={(item) => setSelectedItem(item)}
          />
          
          {selectedItem && selectedItem.piecesPerBox && (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between animate-in fade-in slide-in-from-left-2 transition-all">
               <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest whitespace-nowrap">Box Configuration</span>
                <span className="text-sm font-bold text-foreground mt-0.5 whitespace-nowrap">Non-updateable catalog data</span>
              </div>
              <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-100 font-black tracking-tighter text-lg whitespace-nowrap shadow-sm">
                {selectedItem.piecesPerBox} <span className="text-xs opacity-80 dark:opacity-60 uppercase font-black ml-1">pcs</span> / BOX
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="vendorId" className="text-xs font-black text-foreground uppercase tracking-widest opacity-80 dark:opacity-70">Select Vendor (Optional - To claim deduction)</Label>
          </div>
          <select
            id="vendorId"
            name="vendorId"
            className="w-full h-12 px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-red-500/50 transition-all shadow-inner font-medium text-foreground"
          >
            <option value="" className="bg-card text-muted-foreground font-bold">-- No Vendor (Internal Loss) --</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id} className="bg-card text-foreground">{v.name}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-xs font-black text-foreground uppercase tracking-widest opacity-80 dark:opacity-70">Discard Quantity</Label>
            <Input id="quantity" name="quantity" type="number" step="0.01" min="0.01" placeholder="e.g. 5" required className="h-12 bg-background border-border text-foreground rounded-xl focus-visible:ring-red-500/50 shadow-inner" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitType" className="text-xs font-black text-foreground uppercase tracking-widest opacity-80 dark:opacity-70">Unit Type</Label>
            <select
              id="unitType"
              name="unitType"
              required
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              className="w-full h-12 px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-red-500/50 transition-all shadow-inner font-medium text-foreground"
            >
              <option value="pieces" className="bg-card text-foreground italic capitalize">Pieces ({selectedItem?.unit || 'pcs'})</option>
              <option value="box" className="bg-card text-foreground font-bold" disabled={!selectedItem?.piecesPerBox}>Boxes (Box)</option>
              <option value="packet" className="bg-card text-foreground font-bold" disabled={!selectedItem?.piecesPerBox}>Packets (Packet)</option>
              <option value="plate" className="bg-card text-foreground font-bold" disabled={!selectedItem?.piecesPerBox}>Plates (Plate)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-xs font-black text-foreground uppercase tracking-widest opacity-80 dark:opacity-70">Reason for Waste</Label>
          <Input id="notes" name="notes" placeholder="e.g. Broken packages, expired..." required className="h-12 bg-background border-border text-foreground rounded-xl focus-visible:ring-red-500/50 shadow-inner block" />
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full h-14 mt-4 text-lg font-bold bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)] rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Logging Waste...
            </span>
          ) : (
            "Confirm Log Waste"
          )}
        </Button>
      </form>
    </div>
  )
}
