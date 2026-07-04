"use client"

import { useState, useId, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Settings2, Plus, Trash2, UtensilsCrossed } from "lucide-react"
import { addMenuItem } from "./actions"
import { CategoryCombobox } from "./CategoryCombobox"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function AddMenuItemForm({
  outlets,
  globalItems,
  existingCategories,
}: {
  outlets: any[]
  globalItems: any[]
  existingCategories: string[]
}) {
  const [selectedOutletId, setSelectedOutletId] = useState("")
  const [ingredients, setIngredients] = useState<{ itemId: string, quantity: number, unitUsed?: string }[]>([])
  const [loading, setLoading] = useState(false)
  const listId = useId()

  const selectedOutlet = outlets.find(o => o.id === selectedOutletId)
  const isCafe =
    selectedOutletId === "BOTH" ||
    selectedOutlet?.type === "CAFE" ||
    selectedOutlet?.name?.toLowerCase().includes("cafe")
  const isChai =
    selectedOutletId === "BOTH" ||
    selectedOutlet?.type === "CHAI_JOINT" ||
    selectedOutlet?.name?.toLowerCase().includes("chai")

  const suggestions = useMemo(() => {
    const cafeCategories = ["Breakfast", "Tea & Coffee", "Maggie & Pasta", "Burger & Sandwich", "Momo", "Snacks", "Mocktail", "Others"]
    const chaiCategories = ["Tea & Coffee", "Cigarette", "Beverages", "Others"]
    const presets = new Set<string>()
    if (isCafe) cafeCategories.forEach(c => presets.add(c))
    if (isChai) chaiCategories.forEach(c => presets.add(c))
    existingCategories.forEach(c => presets.add(c))
    if (!isCafe && !isChai) {
      ;[...cafeCategories, ...chaiCategories].forEach(c => presets.add(c))
      existingCategories.forEach(c => presets.add(c))
    }
    return Array.from(presets)
  }, [isCafe, isChai, existingCategories])

  const addIngredient = () => {
    setIngredients([...ingredients, { itemId: "", quantity: 1 }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: "itemId" | "quantity" | "unitUsed", value: string | number) => {
    const newIngs = [...ingredients]
    newIngs[index] = { ...newIngs[index], [field]: value }
    if (field === "itemId") {
      newIngs[index].unitUsed = undefined // Reset unit when item changes
    }
    setIngredients(newIngs)
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      formData.set("ingredients", JSON.stringify(ingredients))
      await addMenuItem(formData)
      toast.success("Menu item added successfully!", {
        description: `${formData.get("name")} is now available on the POS.`,
        icon: <UtensilsCrossed className="w-5 h-5 text-indigo-500" />
      })
      // Clear form
      const form = document.querySelector('form') as HTMLFormElement
      form?.reset()
      setIngredients([])
      setSelectedOutletId("")
    } catch (error) {
      toast.error("Failed to add menu item.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Hidden ingredients JSON */}
      <input type="hidden" name="ingredients" value={JSON.stringify(ingredients)} />

      {/* OUTLET SELECTOR */}
      <div className="space-y-2">
        <Label htmlFor="outletId" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Select POS Outlet
        </Label>
        <select
          name="outletId"
          id="outletId"
          required
          value={selectedOutletId}
          onChange={e => setSelectedOutletId(e.target.value)}
          className="w-full h-12 px-4 py-2 rounded-xl border border-border bg-foreground/5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
        >
          <option value="" disabled className="bg-background text-muted-foreground text-opacity-50">Cafe or Chai Joint...</option>
          {outlets.map(o => (
            <option key={o.id} value={o.id} className="bg-background text-foreground">{o.name}</option>
          ))}
          <option value="BOTH" className="bg-indigo-600 text-white font-bold">★ Both (Chai Hub & Coffee Hub)</option>
        </select>
      </div>

      {/* DISPLAY NAME */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Display Name on POS
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Masala Chai"
          required
          className="h-12 bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-primary/50"
        />
      </div>

      {/* PRICE + CATEGORY */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Price (₹)
          </Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.5"
            min="0"
            placeholder="e.g. 20"
            required
            className="h-12 bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-primary/50 font-mono text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="add_category" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Category
          </Label>
          <CategoryCombobox name="category" suggestions={suggestions} />
        </div>
      </div>

      {/* RECIPE BUILDER (REPLACED AUTO-DEDUCT) */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4" /> Recipe / Auto-Deduction
          </Label>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={addIngredient}
            className="h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:text-foreground hover:bg-primary/20 rounded-lg gap-2"
          >
            <Plus className="w-3 h-3" /> Add Ingredient
          </Button>
        </div>

        {ingredients.length === 0 ? (
          <div className="p-6 rounded-2xl border-2 border-dashed border-border bg-foreground/[0.02] flex flex-col items-center justify-center text-center">
            <Settings2 className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">No auto-deduction configured</p>
            <p className="text-[9px] text-muted-foreground/60 mt-1">This will be a standalone POS item with no stock impact.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ingredients.map((ing, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="col-span-7">
                  <select
                    value={ing.itemId}
                    onChange={(e) => updateIngredient(index, "itemId", e.target.value)}
                    required
                    className="w-full h-11 px-3 rounded-xl border border-border bg-foreground/10 text-xs text-foreground focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="" disabled className="bg-background text-muted-foreground">Pick Item...</option>
                    {globalItems.map(item => (
                      <option key={item.id} value={item.id} className="bg-background text-foreground">
                        {item.name} ({item.recipeUnit ? `${item.unit} / ${item.recipeUnit}` : item.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3 relative flex items-center">
                  <Input 
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Qty"
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(index, "quantity", parseFloat(e.target.value))}
                    required
                    className="h-11 bg-foreground/10 border-border text-xs text-center font-bold pr-14"
                  />
                  {ing.itemId && (() => {
                    const selectedItem = globalItems.find(i => i.id === ing.itemId);
                    if (!selectedItem) return null;
                    if (selectedItem.recipeUnit) {
                      return (
                        <select 
                          value={ing.unitUsed || selectedItem.unit}
                          onChange={(e) => updateIngredient(index, "unitUsed", e.target.value)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] bg-foreground/10 hover:bg-foreground/20 text-muted-foreground font-bold outline-none rounded p-1 cursor-pointer transition-colors"
                        >
                          <option value={selectedItem.unit}>{selectedItem.unit}</option>
                          <option value={selectedItem.recipeUnit}>{selectedItem.recipeUnit}</option>
                        </select>
                      )
                    }
                    return (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold pointer-events-none">
                        {selectedItem.unit}
                      </span>
                    )
                  })()}
                </div>
                <div className="col-span-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeIngredient(index)}
                    className="h-11 w-full rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-14 mt-6 text-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Add to Menu
      </Button>
    </form>
  )
}


