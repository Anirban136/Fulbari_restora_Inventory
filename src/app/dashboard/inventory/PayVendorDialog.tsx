"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IndianRupee, Banknote } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { payVendor } from "./actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface PayVendorDialogProps {
  vendor: {
    id: string
    name: string
  }
  balanceDue: number
  wasteDeductions?: number
}

export function PayVendorDialog({ vendor, balanceDue, wasteDeductions = 0 }: PayVendorDialogProps) {
  const [open, setOpen] = useState(false)
  const [customAmount, setCustomAmount] = useState("")
  const [useFullAmount, setUseFullAmount] = useState(false)
  const [loading, setLoading] = useState(false)

  const effectiveAmount = useFullAmount ? balanceDue.toFixed(2) : customAmount

  async function handleSubmit(formData: FormData) {
    if (!effectiveAmount || parseFloat(effectiveAmount) <= 0) return
    
    setLoading(true)
    try {
      // Override with effective amount
      formData.set("amount", effectiveAmount)
      await payVendor(formData)
      toast.success("Payment recorded successfully!", {
        description: `₹${parseFloat(effectiveAmount).toLocaleString('en-IN')} paid to ${vendor.name}.`,
        icon: <IndianRupee className="w-5 h-5 text-emerald-500" />
      })
      setOpen(false)
      setCustomAmount("")
      setUseFullAmount(false)
    } catch (error) {
      toast.error("Failed to record payment.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setCustomAmount(""); setUseFullAmount(false); } }}>
      <DialogTrigger render={
        <button
          className="px-3 py-1.5 rounded-xl text-emerald-400/80 hover:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/10 hover:border-emerald-500/30 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
          title={`Pay ${vendor.name}`}
          disabled={balanceDue <= 0}
        >
          <Banknote className="w-3.5 h-3.5" />
          Pay
        </button>
      } />
      <DialogContent className="sm:max-w-[450px] bg-background/95 backdrop-blur-2xl border-border rounded-3xl shadow-2xl">
        <DialogHeader className="mb-2">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
            <IndianRupee className="w-6 h-6 text-emerald-400" />
          </div>
          <DialogTitle className="text-xl font-black text-foreground">
            Pay {vendor.name}
          </DialogTitle>
          <DialogDescription className="text-slate-400 leading-relaxed">
            Outstanding balance: <span className="text-emerald-400 font-bold">₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </DialogDescription>
        </DialogHeader>

        {wasteDeductions > 0 && (
          <div className="mx-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-bold text-red-400">₹{wasteDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })} deducted</p>
              <p className="text-xs text-red-400/80 mt-0.5">due to bad, spoiled, or damaged products.</p>
            </div>
          </div>
        )}

        <form action={handleSubmit} className="space-y-5 px-6 mt-4 pb-6">
          <input type="hidden" name="vendorId" value={vendor.id} />
          <input type="hidden" name="amount" value={effectiveAmount} />

          {/* Quick Pay Full Amount Toggle */}
          <button
            type="button"
            onClick={() => { setUseFullAmount(!useFullAmount); setCustomAmount(""); }}
            className={`w-full py-4 rounded-2xl border-2 transition-all font-bold text-sm flex items-center justify-center gap-3 ${
              useFullAmount 
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]" 
                : "border-border bg-foreground/5 text-muted-foreground hover:border-border/60 hover:bg-foreground/10"
            }`}
          >
            <IndianRupee className="w-4 h-4" />
            Pay Full Amount — ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">or custom amount</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          {/* Custom Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="customAmount" className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Custom Amount (₹)
            </Label>
            <div className="relative">
              <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                id="customAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={balanceDue}
                placeholder="e.g. 500"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setUseFullAmount(false); }}
                className="h-12 pl-10 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl focus-visible:ring-emerald-500/50 text-lg font-bold"
                disabled={useFullAmount}
              />
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="payNotes" className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Notes (Optional)
            </Label>
            <Input
              id="payNotes"
              name="notes"
              placeholder="e.g. Paid via UPI, Cash payment"
              className="h-12 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl focus-visible:ring-emerald-500/50"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !effectiveAmount || parseFloat(effectiveAmount) <= 0}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm tracking-wide shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : `Confirm Payment of ₹${effectiveAmount ? parseFloat(effectiveAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : "0.00"}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
