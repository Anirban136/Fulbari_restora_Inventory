"use client"

import { useState, useId, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit, Settings2, Plus, Trash2, UtensilsCrossed } from "lucide-react"
import { updateMenuItem } from "./actions"
import { CategoryCombobox } from "./CategoryCombobox"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function EditMenuItemDialog({
  menuItem,
  outlets,
  globalItems,
  existingCategories,
}: {
  menuItem: any
  outlets: any[]
  globalItems: any[]
  existingCategories: string[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedOutletId, setSelectedOutletId] = useState(menuItem.outletId || "")
  const [ingredients, setIngredients] = useState<{ itemId: string, quantity: number, unitUsed?: string }[]>([])
  useEffect(() => {
    if (open) {
      setIngredients(menuItem.ingredients?.map((i: any) => ({ itemId: i.itemId, quantity: i.quantity, unitUsed: i.unitUsed })) || [])
    }
  }, [open, menuItem])

  const cafeCategories = ["Breakfast", "Tea & Coffee", "Maggie & Pasta", "Burger & Sandwich", "Momo", "Snacks", "Mocktail", "Others"]
  const chaiCategories = ["Tea & Coffee", "Cigarette", "Beverages", "Others"]

  const suggestions = useMemo(() => {
    const allPresets = new Set<string>()
    cafeCategories.forEach(c => allPresets.add(c))
    chaiCategories.forEach(c => allPresets.add(c))
    existingCategories.forEach(c => allPresets.add(c))
    return Array.from(allPresets)
  }, [existingCategories])

  const rawCategory = menuItem.categoryId || ""
  const matchCat = suggestions.find(c => c.toUpperCase() === rawCategory)
  const defaultCategory = matchCat ?? rawCategory

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
      await updateMenuItem(formData)
      toast.success("Menu item updated!", {
        description: `Changes to ${menuItem.name} have been saved.`,
        icon: <UtensilsCrossed className="w-5 h-5 text-primary" />
      })
      setOpen(false)
    } catch (error) {
      toast.error("Failed to update menu item.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all border border-transparent hover:border-border flex items-center justify-center">
          <Edit className="w-4 h-4" />
        </button>
      } />
      <DialogContent className="sm:max-w-[450px] bg-background border-border rounded-[2rem] overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="h-12 w-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)] mb-4">
            <Edit className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-black text-foreground tracking-tight uppercase">Update Menu Entry</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="p-6 pt-4 space-y-6 overflow-y-auto max-h-[80vh]">
          <input type="hidden" name="id" value={menuItem.id} />
          <input type="hidden" name="ingredients" value={JSON.stringify(ingredients)} />

          {/* OUTLET */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Target POS Outlet</Label>
            <select
              name="outletId"
              required
              value={selectedOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              className="w-full h-12 px-4 py-2 rounded-xl border border-border bg-foreground/5 text-foreground focus:ring-2 focus:ring-primary/50 transition-all font-medium"
            >
              <option value="" disabled className="bg-background text-muted-foreground">Select Hub...</option>
              {outlets.map(o => <option key={o.id} value={o.id} className="bg-background text-foreground">{o.name}</option>)}
              <option value="BOTH" className="bg-indigo-600 text-white font-bold">★ Both (Chai Hub & Coffee Hub)</option>
            </select>
          </div>

          {/* DISPLAY NAME */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Display Name</Label>
            <Input
              name="name"
              defaultValue={menuItem.name}
              placeholder="e.g. Masala Chai"
              required
              className="h-12 bg-foreground/5 border-border text-foreground rounded-xl focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* PRICE + CATEGORY */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Price (₹)</Label>
              <Input
                name="price"
                type="number"
                step="0.5"
                min="0"
                defaultValue={menuItem.price}
                required
                className="h-12 bg-foreground/5 border-border text-foreground rounded-xl focus:ring-2 focus:ring-primary/50 font-bold text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global category</Label>
              <CategoryCombobox name="category" defaultValue={defaultCategory} suggestions={suggestions} />
            </div>
          </div>

          {/* RECIPE BUILDER */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4" /> Edit Recipe
              </Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={addIngredient}
                className="h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:text-foreground hover:bg-primary/20 rounded-lg gap-2"
              >
                <Plus className="w-3 h-3" /> Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {ingredients.map((ing, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-6">
                    <select
                      value={ing.itemId}
                      onChange={(e) => updateIngredient(index, "itemId", e.target.value)}
                      required
                      className="w-full h-11 px-3 rounded-xl border border-border bg-foreground/10 text-xs text-foreground focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="" disabled className="bg-background text-muted-foreground">Pick Product...</option>
                      {globalItems.map(item => (
                        <option key={item.id} value={item.id} className="bg-background text-foreground">
                          {item.name} ({item.recipeUnit ? `${item.unit} / ${item.recipeUnit}` : item.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Input 
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(index, "quantity", parseFloat(e.target.value))}
                      required
                      className="h-11 bg-foreground/10 border-border text-xs text-center font-black w-full"
                    />
                  </div>
                  <div className="col-span-2">
                    {(() => {
                      const selectedItem = globalItems.find(i => i.id === ing.itemId);
                      const hasRecipeUnit = !!selectedItem?.recipeUnit;
                      return (
                        <select 
                          value={ing.unitUsed || selectedItem?.unit || ""}
                          onChange={(e) => updateIngredient(index, "unitUsed", e.target.value)}
                          disabled={!hasRecipeUnit}
                          className="w-full h-11 px-1 rounded-xl border border-border bg-foreground/10 text-[10px] text-center font-bold cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          {selectedItem ? (
                            <>
                              <option value={selectedItem.unit}>{selectedItem.unit}</option>
                              {selectedItem.recipeUnit && (
                                <option value={selectedItem.recipeUnit}>{selectedItem.recipeUnit}</option>
                              )}
                            </>
                          ) : (
                            <option value="">Unit</option>
                          )}
                        </select>
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
              {ingredients.length === 0 && (
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest text-center py-4 bg-foreground/[0.02] rounded-2xl border border-dashed border-border text-opacity-40">
                  No Auto-Deduction active
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Legacy Link (Optional)</Label>
              <select
                name="itemId"
                defaultValue={menuItem.itemId || ""}
                className="w-full h-10 px-4 py-1 text-xs rounded-lg border border-border bg-foreground/5 text-muted-foreground"
              >
                <option value="" className="bg-background">None</option>
                {globalItems.map(item => <option key={item.id} value={item.id} className="bg-background">{item.name} ({item.unit})</option>)}
              </select>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Edit className="w-4 h-4" />} Commit Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
