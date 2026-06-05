"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IndianRupee, FilePlus2, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { addManualBill } from "./actions"
import { toast } from "sonner"

interface AddManualBillDialogProps {
  vendor: {
    id: string
    name: string
  }
}

export function AddManualBillDialog({ vendor }: AddManualBillDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    const amount = formData.get("amount") as string
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount.")
      return
    }
    
    setLoading(true)
    try {
      await addManualBill(formData)
      toast.success("Manual bill added successfully!", {
        description: `₹${parseFloat(amount).toLocaleString('en-IN')} added to ${vendor.name}'s account.`,
        icon: <FilePlus2 className="w-5 h-5 text-amber-500" />
      })
      setOpen(false)
    } catch (error) {
      toast.error("Failed to add manual bill.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button
          className="p-3 rounded-2xl bg-foreground/5 border border-foreground/5 text-amber-400/60 hover:text-amber-400 transition-all hover:bg-amber-500/10 active:scale-90"
          title={`Add Manual Bill for ${vendor.name}`}
        >
          <FilePlus2 className="w-4 h-4" />
        </button>
      } />
      <DialogContent className="sm:max-w-[450px] bg-background/95 backdrop-blur-2xl border-border rounded-3xl shadow-2xl">
        <DialogHeader className="mb-2">
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20">
            <FilePlus2 className="w-6 h-6 text-amber-400" />
          </div>
          <DialogTitle className="text-xl font-black text-foreground">
            Add Manual Bill
          </DialogTitle>
          <DialogDescription className="text-slate-400 leading-relaxed">
            Record a historical or external purchase for <span className="text-amber-400 font-bold">{vendor.name}</span>. This will increase the balance due.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-5 px-6 mt-4 pb-6">
          <input type="hidden" name="vendorId" value={vendor.id} />

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Bill Amount (₹)
            </Label>
            <div className="relative">
              <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 50000"
                required
                className="h-12 pl-10 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl focus-visible:ring-amber-500/50 text-lg font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Description / Reference
            </Label>
            <Input
              id="notes"
              name="notes"
              placeholder="e.g. Opening Balance, Invoice #123"
              required
              className="h-12 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl focus-visible:ring-amber-500/50"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm tracking-wide shadow-[0_0_20px_-5px_rgba(245,158,11,0.5)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Confirm Add to Ledger"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
