"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, Package, ArrowRight, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { addItem } from "./actions"
import { CategoryCombobox } from "../menus/CategoryCombobox"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function AddItemDialog({ existingCategories = [], variant = "default" }: { existingCategories?: string[], variant?: "default" | "compact" }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unit, setUnit] = useState("")

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      await addItem(formData)
      toast.success("Global item created successfully!", {
        description: `${formData.get("name")} is now available in the catalog.`,
        icon: <Package className="w-5 h-5 text-primary" />
      })
      setOpen(false)
      setUnit("")
    } catch (error) {
      toast.error("Failed to create item. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const showPiecesPerBox = unit === "box" || unit === "packet" || unit === "plate"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        variant === "compact" ? (
          <Button variant="outline" className="h-[40px] px-5 rounded-2xl border-border bg-foreground/5 hover:bg-foreground/10 text-foreground font-black text-[10px] transition-all active:scale-95 gap-2 uppercase tracking-widest">
            <PlusCircle className="w-4 h-4 text-primary" /> New Item
          </Button>
        ) : (
          <Button className="h-14 px-8 rounded-[2rem] bg-primary hover:bg-emerald-500 text-primary-foreground font-black shadow-[0_15px_30px_-10px_rgba(16,185,129,0.5)] transition-all active:scale-95 gap-3 w-full uppercase tracking-[0.2em] text-xs">
            <PlusCircle className="w-5 h-5" /> ADD NEW ITEM
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-[500px] w-[95vw] lg:w-full bg-background/95 backdrop-blur-3xl border-border rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl p-0 overflow-hidden max-h-[92vh] flex flex-col" showCloseButton={false}>
        {/* Explicit Close Button - Positioned lower to avoid notches/status bars */}
        <DialogClose render={<button className="absolute top-8 right-8 p-3 rounded-2xl bg-foreground/5 border border-border text-foreground/40 hover:text-foreground transition-all active:scale-90 z-50"><X className="w-5 h-5" /></button>} />
        
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-[80px] -z-10"></div>
        
        {/* Scrollable container for mobile comfort */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-premium p-6 sm:p-10">
          <DialogHeader className="mb-8">
             <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mb-6 border border-primary/20 shadow-inner">
               <Package className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
             </div>
            <DialogTitle className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter uppercase leading-none">Global Item Entry</DialogTitle>
            <DialogDescription className="text-slate-400 font-medium mt-4 tracking-tight leading-relaxed text-sm">
              Define a new core product in the <span className="text-primary font-black uppercase">Global Repository</span>.
            </DialogDescription>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-6 sm:space-y-8">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">ITEM NAME</Label>
              <Input id="name" name="name" placeholder="e.g. PREMIUM ESPRESSO BEANS" required className="h-14 bg-foreground/[0.03] border-border text-foreground placeholder:text-muted-foreground/30 rounded-2xl pl-5 pr-5 text-sm focus-visible:ring-primary/40 focus:border-primary/50 transition-all font-bold uppercase tracking-widest shadow-inner" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="category" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">CATEGORY</Label>
                <CategoryCombobox 
                  key={open ? 'open' : 'closed'} 
                  name="category" 
                  suggestions={existingCategories} 
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="unit" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">UNIT</Label>
                <select 
                  name="unit" 
                  id="unit" 
                  required 
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full h-14 px-6 py-2 rounded-2xl border border-border bg-foreground/[0.03] text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all font-black uppercase tracking-widest text-xs appearance-none cursor-pointer shadow-inner"
                >
                  <option value="" className="bg-background text-muted-foreground/30">Select Unit...</option>
                  <option value="kg" className="bg-background text-foreground">Kilogram (kg)</option>
                  <option value="gm" className="bg-background text-foreground">Gram (gm)</option>
                  <option value="lit" className="bg-background text-foreground">Litre (lit)</option>
                  <option value="ml" className="bg-background text-foreground">Millilitre (ml)</option>
                  <option value="packet" className="bg-background text-foreground">Packet</option>
                  <option value="box" className="bg-background text-foreground">Box</option>
                  <option value="plate" className="bg-background text-foreground">Plate</option>
                  <option value="pcs" className="bg-background text-foreground">Pieces (pcs)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="costPerUnit" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">BUY PRICE (₹)</Label>
                <Input id="costPerUnit" name="costPerUnit" type="number" step="0.01" placeholder="0.00" className="h-14 bg-foreground/[0.03] border-border text-foreground placeholder:text-muted-foreground/20 rounded-2xl focus-visible:ring-primary/40 font-black text-lg" />
              </div>
              <div className="space-y-3">
                <Label htmlFor="sellPrice" className="text-[10px] font-black text-primary uppercase tracking-[0.3em] ml-1">SELL PRICE (₹)</Label>
                <Input id="sellPrice" name="sellPrice" type="number" step="0.01" placeholder="0.00" className="h-14 bg-foreground/[0.03] border-primary/20 text-primary placeholder:text-primary/10 rounded-2xl focus-visible:ring-primary/40 font-black text-lg shadow-[0_0_20px_rgba(16,185,129,0.05)]" />
              </div>
            </div>

            <div className={`grid gap-6 transition-all duration-500 ${showPiecesPerBox ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              <div className="space-y-3">
                <Label htmlFor="minStock" className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] ml-1">LOW STOCK ALERT</Label>
                <Input id="minStock" name="minStock" type="number" step="0.01" placeholder="5.00" className="h-14 bg-foreground/[0.03] border-amber-500/20 text-amber-500 placeholder:text-amber-500/10 rounded-2xl focus-visible:ring-amber-500/40 font-black text-lg" />
              </div>
              {showPiecesPerBox && (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                  <Label htmlFor="piecesPerBox" className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] ml-1">Pieces / {unit}</Label>
                  <Input id="piecesPerBox" name="piecesPerBox" type="number" placeholder="20" required className="h-14 bg-foreground/[0.03] border-blue-500/20 text-blue-400 placeholder:text-blue-400/10 rounded-2xl focus-visible:ring-blue-500/40 font-black text-lg shadow-inner" />
                </div>
              )}
            </div>

            <div className="pt-6 pb-4">
              <Button type="submit" disabled={loading} className="w-full h-16 text-sm font-black uppercase tracking-[0.4em] bg-foreground text-background hover:opacity-90 rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "SUBMIT"} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
