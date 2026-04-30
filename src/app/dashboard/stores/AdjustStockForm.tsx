"use client"

import { useState, useMemo } from "react"
import { Store, Layers, Package, ArrowDownCircle, AlertCircle, ChevronRight, CheckCircle2, Plus, Minus, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { adjustOutletStock } from "../inventory/actions"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function AdjustStockForm({ outlets, onSuccess }: { outlets: any[], onSuccess?: () => void }) {
  const [mode, setMode] = useState<'ADD' | 'REMOVE'>('REMOVE')
  const [selectedOutletId, setSelectedOutletId] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedItemId, setSelectedItemId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // 1. Get current outlet
  const currentOutlet = useMemo(() => 
    outlets.find(o => o.id === selectedOutletId),
    [outlets, selectedOutletId]
  )

  // 2. Derive categories from outlet stock
  const availableCategories = useMemo<string[]>(() => {
    if (!currentOutlet) return []
    const cats = new Set(currentOutlet.Stock.map((s: any) => s.Item.category || "General"))
    return Array.from(cats).sort() as string[]
  }, [currentOutlet])

  // 3. Derive items from category
  const availableItems = useMemo<any[]>(() => {
    if (!currentOutlet || !selectedCategory) return []
    return currentOutlet.Stock.filter((s: any) => 
      (s.Item.category || "General") === selectedCategory
    ).map((s: any) => s.Item)
  }, [currentOutlet, selectedCategory])

  // 4. Get current stock for selected item
  const selectedStock = useMemo(() => {
    if (!currentOutlet || !selectedItemId) return null
    return currentOutlet.Stock.find((s: any) => s.itemId === selectedItemId)
  }, [currentOutlet, selectedItemId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOutletId || !selectedItemId || !quantity) return

    setIsSubmitting(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append("outletId", selectedOutletId)
      formData.append("itemId", selectedItemId)
      formData.append("quantity", quantity)
      formData.append("mode", mode)

      await adjustOutletStock(formData)
      
      const itemName = availableItems.find(i => i.id === selectedItemId)?.name || "Product"
      toast.success("Stock adjustment successful!", {
        description: `${mode === 'ADD' ? 'Added' : 'Removed'} ${quantity} units for ${itemName}.`,
        icon: mode === 'ADD' ? <Plus className="w-5 h-5 text-emerald-500" /> : <Minus className="w-5 h-5 text-purple-500" />
      })

      setMessage({ type: 'success', text: `Stock ${mode === 'ADD' ? 'added' : 'removed'} successfully` })
      setQuantity("")
      setSelectedItemId("")
      
      // Notify parent of success (e.g., to close dialog)
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000)
      }

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      const errorMsg = error.message || "Adjustment failed"
      setMessage({ type: 'error', text: errorMsg })
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn(
      "glass-panel p-6 lg:p-8 rounded-[2rem] border transition-all duration-700 bg-white/[0.02] shadow-2xl relative overflow-hidden backdrop-blur-3xl lg:sticky lg:top-8",
      mode === 'ADD' ? "border-emerald-500/20" : "border-white/5"
    )}>
      {/* Background Decor */}
      <div className={cn(
        "absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] -z-10 transition-colors duration-700",
        mode === 'ADD' ? "bg-emerald-500/10" : "bg-purple-500/5"
      )}></div>
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-2xl border shadow-[0_0_20px_rgba(0,0,0,0.1)] transition-all duration-500",
            mode === 'ADD' 
              ? "bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
              : "bg-purple-500/10 border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
          )}>
            {mode === 'ADD' ? (
              <Plus className="w-6 h-6 text-emerald-400" />
            ) : (
              <Minus className="w-6 h-6 text-purple-400" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground tracking-tight uppercase">
              {mode === 'ADD' ? 'Add Stock' : 'Remove Stock'}
            </h3>
            <p className="text-[10px] text-muted-foreground font-black tracking-widest uppercase opacity-60">
              {mode === 'ADD' ? 'Replenish Inventory' : 'Log Consumption / Waste'}
            </p>
          </div>
        </div>
      </div>

      {/* Mode Toggle Selection */}
      <div className="grid grid-cols-2 gap-2 mb-8 p-1.5 bg-muted rounded-2xl border border-border">
        <button
          onClick={() => setMode('REMOVE')}
          type="button"
          className={cn(
            "flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            mode === 'REMOVE' 
              ? "bg-purple-600 text-white shadow-lg" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Minus className="w-3 h-3" /> Remove
        </button>
        <button
          onClick={() => setMode('ADD')}
          type="button"
          className={cn(
            "flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            mode === 'ADD' 
              ? "bg-emerald-600 text-white shadow-lg" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {message && (
        <div className={cn(
          "mb-6 p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300",
          message.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
        )}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-[10px] font-black uppercase tracking-widest">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Outlet Selection */}
        <div className="space-y-2">
          <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
            <Store className="w-3 h-3 text-purple-500" /> 1. Select Outlet
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {outlets.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setSelectedOutletId(o.id)
                  setSelectedCategory("")
                  setSelectedItemId("")
                }}
                className={cn(
                  "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95",
                  selectedOutletId === o.id 
                    ? (mode === 'ADD' ? "bg-emerald-600 border-emerald-400 text-white" : "bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]")
                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                )}
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Category Selection */}
        <div className={cn("space-y-2 transition-all duration-500", !selectedOutletId && "opacity-20 pointer-events-none grayscale")}>
          <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
            <Layers className="w-3 h-3 text-purple-500" /> 2. Category
          </Label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setSelectedItemId("")
            }}
            className="w-full h-12 bg-muted border border-border rounded-xl px-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-purple-500/50 transition-all text-foreground appearance-none cursor-pointer"
          >
            <option value="">Select Category</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Step 3: Item Selection */}
        <div className={cn("space-y-2 transition-all duration-500", !selectedCategory && "opacity-20 pointer-events-none grayscale")}>
          <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
            <Package className="w-3 h-3 text-purple-500" /> 3. Select Item
          </Label>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full h-12 bg-muted border border-border rounded-xl px-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-purple-500/50 transition-all text-foreground appearance-none cursor-pointer"
          >
            <option value="">Select Item</option>
            {availableItems.map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        {/* Step 4: Adjustment Quantity */}
        <div className={cn(
          "group p-5 rounded-2xl bg-foreground/5 border transition-all duration-500",
          !selectedItemId && "opacity-20 pointer-events-none grayscale",
          mode === 'ADD' ? "border-emerald-500/20" : "border-border"
        )}>
          <div className="flex justify-between items-end mb-4">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
              Quantity to {mode === 'ADD' ? 'Add' : 'Remove'}
            </Label>
            {selectedStock && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest leading-none">In Stock</span>
                <span className={cn(
                  "text-xl font-black tracking-tighter transition-colors",
                  mode === 'ADD' ? "text-emerald-400" : "text-purple-400"
                )}>
                  {selectedStock.quantity} <span className="text-[10px] opacity-60 uppercase">{selectedStock.Item.piecesPerBox ? 'pcs' : selectedStock.Item.unit}</span>
                </span>
              </div>
            )}
          </div>
          
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              className={cn(
                "h-14 bg-foreground/5 border-border text-xl font-black tracking-tight text-foreground rounded-xl shadow-inner placeholder:text-foreground/20 transition-all",
                mode === 'ADD' ? "focus-visible:ring-emerald-500/50" : "focus-visible:ring-purple-500/50"
              )}
              required
            />
            {selectedStock && (
               <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{selectedStock.Item.unit}</span>
               </div>
            )}
          </div>

          {selectedStock && quantity && parseFloat(quantity) > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Post-Adjustment</span>
              <div className={cn(
                "flex items-center gap-2 transition-colors",
                mode === 'ADD' ? "text-emerald-400" : "text-amber-400"
              )}>
                <ChevronRight className="w-3 h-3" />
                <span className="text-sm font-black tracking-tighter">
                  {mode === 'ADD' 
                    ? (selectedStock.quantity + parseFloat(quantity)) 
                    : Math.max(0, selectedStock.quantity - parseFloat(quantity))} {selectedStock.Item.unit}
                </span>
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !selectedItemId || !quantity || parseFloat(quantity) <= 0}
          className={cn(
            "w-full h-14 text-white font-black uppercase tracking-[0.2em] rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-2xl",
            mode === 'ADD' 
              ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20" 
              : "bg-purple-600 hover:bg-purple-500 shadow-purple-500/20"
          )}
        >
          {isSubmitting ? "Updating..." : `Confirm ${mode === 'ADD' ? 'Addition' : 'Removal'}`}
        </Button>
      </form>

      <div className={cn(
        "mt-6 flex items-start gap-4 p-4 rounded-2xl border transition-all duration-500",
        mode === 'ADD' ? "bg-emerald-500/5 border-emerald-500/10" : "bg-amber-500/5 border-amber-500/10"
      )}>
        <Info className={cn("w-5 h-5 shrink-0 mt-0.5 opacity-50", mode === 'ADD' ? "text-emerald-500" : "text-amber-500")} />
        <p className={cn(
          "text-[10px] font-medium leading-relaxed opacity-60",
          mode === 'ADD' ? "text-emerald-500" : "text-amber-500"
        )}>
          {mode === 'ADD' 
            ? "Replenish stock levels directly for this outlet. This is usually for corrected entry or local returns."
            : "Log kitchen use or waste here. This will immediately reduce the outlet's live stock and record an entry."}
        </p>
      </div>
    </div>
  )
}

