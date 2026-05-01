"use client"

import { useState, useMemo } from "react"
import { 
  Store, 
  Layers, 
  Package, 
  ArrowDownCircle, 
  AlertCircle, 
  ChevronRight, 
  CheckCircle2, 
  Plus, 
  Minus, 
  Info,
  Building2,
  ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { adjustOutletStock } from "../inventory/actions"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function AdjustStockForm({ outlets, onSuccess }: { outlets: any[], onSuccess?: () => void }) {
  const [mode, setMode] = useState<'ADD' | 'REMOVE'>('REMOVE')
  const [selectedType, setSelectedType] = useState<string>("")
  const [selectedOutletId, setSelectedOutletId] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedItemId, setSelectedItemId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Group outlets by type
  const groupedOutlets = useMemo(() => {
    const groups: Record<string, any[]> = {}
    outlets.forEach(o => {
      const type = o.type?.toUpperCase() || "UNCATEGORIZED"
      if (!groups[type]) groups[type] = []
      groups[type].push(o)
    })
    return groups
  }, [outlets])

  const businessTypes = Object.keys(groupedOutlets).sort()

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
      
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000)
      }

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
      "p-6 lg:p-8 space-y-8 relative overflow-hidden",
      mode === 'ADD' ? "bg-emerald-950/5" : "bg-purple-950/5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-2xl border shadow-lg transition-all duration-500",
            mode === 'ADD' 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-purple-500/10 border-purple-500/20 text-purple-400"
          )}>
            {mode === 'ADD' ? <Plus className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground tracking-tight uppercase">
              {mode === 'ADD' ? 'Restock Item' : 'Log Consumption'}
            </h3>
            <p className="text-[10px] text-muted-foreground font-black tracking-widest uppercase opacity-60">
              {mode === 'ADD' ? 'Increasing stock levels' : 'Decreasing stock levels'}
            </p>
          </div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex p-1.5 bg-muted rounded-2xl border border-border">
        <button
          onClick={() => setMode('REMOVE')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            mode === 'REMOVE' ? "bg-purple-600 text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Minus className="w-3 h-3" /> Remove
        </button>
        <button
          onClick={() => setMode('ADD')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            mode === 'ADD' ? "bg-emerald-600 text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Business Type & Outlet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">1. Business Type</Label>
            <Select value={selectedType} onValueChange={(val) => {
              setSelectedType(val)
              setSelectedOutletId("")
              setSelectedCategory("")
              setSelectedItemId("")
            }}>
              <SelectTrigger className="h-12 bg-background border-border rounded-xl px-4 text-[10px] font-black uppercase tracking-widest">
                <SelectValue placeholder="SELECT TYPE" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border rounded-xl">
                {businessTypes.map(type => (
                  <SelectItem key={type} value={type} className="text-[10px] font-black uppercase tracking-widest">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={cn("space-y-2 transition-all", !selectedType && "opacity-30 pointer-events-none")}>
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">2. Outlet</Label>
            <Select value={selectedOutletId} onValueChange={(val) => {
              setSelectedOutletId(val)
              setSelectedCategory("")
              setSelectedItemId("")
            }}>
              <SelectTrigger className="h-12 bg-background border-border rounded-xl px-4 text-[10px] font-black uppercase tracking-widest">
                <SelectValue placeholder="SELECT OUTLET" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border rounded-xl">
                {selectedType && groupedOutlets[selectedType]?.map(o => (
                  <SelectItem key={o.id} value={o.id} className="text-[10px] font-black uppercase tracking-widest">{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Step 2: Category & Item */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={cn("space-y-2 transition-all", !selectedOutletId && "opacity-30 pointer-events-none")}>
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">3. Category</Label>
            <Select value={selectedCategory} onValueChange={(val) => {
              setSelectedCategory(val)
              setSelectedItemId("")
            }}>
              <SelectTrigger className="h-12 bg-background border-border rounded-xl px-4 text-[10px] font-black uppercase tracking-widest">
                <SelectValue placeholder="SELECT CATEGORY" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border rounded-xl">
                {availableCategories.map(cat => (
                  <SelectItem key={cat} value={cat} className="text-[10px] font-black uppercase tracking-widest">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={cn("space-y-2 transition-all", !selectedCategory && "opacity-30 pointer-events-none")}>
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">4. Item</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger className="h-12 bg-background border-border rounded-xl px-4 text-[10px] font-black uppercase tracking-widest">
                <SelectValue placeholder="SELECT ITEM" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border rounded-xl">
                {availableItems.map(item => (
                  <SelectItem key={item.id} value={item.id} className="text-[10px] font-black uppercase tracking-widest">{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quantity Selection */}
        <div className={cn(
          "p-6 rounded-[2rem] border transition-all duration-500",
          !selectedItemId ? "opacity-30 pointer-events-none" : (mode === 'ADD' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-purple-500/5 border-purple-500/20")
        )}>
          <div className="flex justify-between items-end mb-4">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Adjustment Quantity</Label>
            {selectedStock && (
              <div className="text-right">
                <span className="text-[9px] font-black text-muted-foreground uppercase block opacity-40">Current</span>
                <span className={cn("text-lg font-black", mode === 'ADD' ? "text-emerald-400" : "text-purple-400")}>
                  {selectedStock.quantity} <span className="text-[10px] uppercase">{selectedStock.Item.unit}</span>
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
              placeholder="Enter amount..."
              className="h-14 bg-background border-border text-xl font-black tracking-tight rounded-2xl focus-visible:ring-purple-500/30"
              required
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {selectedStock?.Item.unit || "Units"}
              </span>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !selectedItemId || !quantity || parseFloat(quantity) <= 0}
          className={cn(
            "w-full h-16 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl active:scale-[0.98] transition-all",
            mode === 'ADD' ? "bg-emerald-600 hover:bg-emerald-500" : "bg-purple-600 hover:bg-purple-500"
          )}
        >
          {isSubmitting ? "Processing..." : `Confirm ${mode === 'ADD' ? 'Restock' : 'Consumption'}`}
        </Button>
      </form>
    </div>
  )
}


