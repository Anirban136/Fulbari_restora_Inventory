"use client"

import { useActionState, useState, useMemo, useEffect } from "react"
import { dispatchStock } from "./actions"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, AlertTriangle, CheckCircle2 } from "lucide-react"
import { ItemSearchableSelect } from "@/components/inventory/ItemSearchableSelect"
import { toast } from "sonner"

type Item = {
  id: string
  name: string
  category: string
  currentStock: number
  unit: string
  piecesPerBox?: number | null
}

type Outlet = {
  id: string
  name: string
}

const initialState = { error: undefined as string | undefined }

export function DispatchForm({ items, outlets }: { items: Item[]; outlets: Outlet[] }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await dispatchStock(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Dispatch approved successfully!", {
          description: `Shipment for ${selectedItem?.name || "Product"} is now in transit.`,
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        })
      }
      return { error: result.error }
    },
    initialState
  )

  const isSuccess = !state.error && state !== initialState
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  // Only reset if it is a brand new loaded list to avoid unneeded renders
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

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl self-start hover:border-primary/20 transition-all">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]">
          <ArrowLeftRight className="w-6 h-6 text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Send Shipment</h3>
      </div>

      <form action={formAction} className="space-y-6">
        
        <div className="space-y-2">
          <Label htmlFor="categoryFilter" className="text-xs font-black text-foreground/70 uppercase tracking-widest">
            Select Category
          </Label>
          <select
            id="categoryFilter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-12 px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner font-medium text-foreground"
          >
            <option value="All Categories" className="bg-card text-foreground font-bold">-- All Categories --</option>
            {sortedCategories.map(cat => (
              <option key={cat} value={cat} className="bg-card text-foreground">{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="itemId" className="text-xs font-black text-foreground/70 uppercase tracking-widest">
            Select Item
          </Label>
          <ItemSearchableSelect 
            key={selectedCategory}
            items={filteredItems} 
            name="itemId" 
            placeholder={filteredItems.length === 0 ? "No items in category..." : "Search item to dispatch..."} 
            showStock={true} 
            onSelect={(item) => setSelectedItem(item as Item)}
          />
          
          {selectedItem && selectedItem.piecesPerBox && (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between animate-in fade-in slide-in-from-left-2 transition-all">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest whitespace-nowrap">Container Configuration</span>
                <span className="text-sm font-bold text-foreground mt-0.5 whitespace-nowrap">{selectedItem.unit} conversion active</span>
              </div>
              <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-100 font-black tracking-tighter text-lg whitespace-nowrap shadow-sm">
                {selectedItem.piecesPerBox} <span className="text-xs opacity-60 uppercase font-black ml-1">pcs</span> / {selectedItem.unit.toUpperCase()}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="outletId" className="text-xs font-black text-foreground/70 uppercase tracking-widest">
            Destination Outlet
          </Label>
          <select
            name="outletId"
            id="outletId"
            required
            defaultValue=""
            className="w-full h-12 px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner font-medium text-foreground"
          >
            <option value="" disabled className="bg-card text-muted-foreground">
              Select an outlet...
            </option>
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id} className="bg-card text-foreground">
                {outlet.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-xs font-black text-foreground/70 uppercase tracking-widest">
              Quantity to Dispatch
            </Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 10"
              required
              className="h-12 bg-background border-border text-foreground rounded-xl focus-visible:ring-blue-500/50 shadow-inner"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitType" className="text-xs font-black text-foreground/70 uppercase tracking-widest">Unit Type</Label>
            <select
              id="unitType"
              name="unitType"
              required
              className="w-full h-12 px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner font-medium text-foreground"
            >
              <option value="pieces" className="bg-card text-foreground italic capitalize">Pieces ({selectedItem?.unit || 'pcs'})</option>
              {selectedItem?.piecesPerBox && (
                <>
                  <option value="box" className="bg-card text-foreground font-bold">Boxes (Box)</option>
                  <option value="packet" className="bg-card text-foreground font-bold">Packets (Packet)</option>
                  <option value="plate" className="bg-card text-foreground font-bold">Plates (Plate)</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Error Message */}
        {state.error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <span>{state.error}</span>
          </div>
        )}

        {/* Success Message */}
        {isSuccess && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-sm font-bold animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            Dispatch approved successfully!
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-14 mt-4 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_5px_rgba(59,130,246,0.3)] rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? "Processing…" : "Approve Dispatch"}
        </Button>
      </form>

      {items.length === 0 && (
        <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium animate-pulse">
          Cannot dispatch. Central catalog has zero stock available.
        </div>
      )}
    </div>
  )
}
