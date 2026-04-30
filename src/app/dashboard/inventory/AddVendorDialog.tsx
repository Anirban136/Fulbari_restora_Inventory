"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { addVendor } from "./actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function AddVendorDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      await addVendor(formData)
      toast.success("Vendor registered successfully!", {
        description: `${formData.get("name")} is now in your supply chain.`,
        icon: <Users className="w-5 h-5 text-primary" />
      })
      setOpen(false)
    } catch (error) {
      toast.error("Failed to register vendor.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" className="h-12 px-6 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold transition-all active:scale-95 gap-2 w-full" />
      }>
        <PlusCircle className="w-5 h-5" /> Add New Vendor
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] bg-background/95 backdrop-blur-2xl border-border rounded-3xl shadow-2xl">
        <DialogHeader className="mb-4">
           <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mb-4 border border-primary/30 shadow-[0_0_15px_-3px_oklch(0.55_0.16_150_/_0.3)]">
             <Users className="w-6 h-6 text-primary" />
           </div>
          <DialogTitle className="text-2xl font-black text-foreground">Add New Vendor</DialogTitle>
          <DialogDescription className="text-slate-400">
            Register a new supplier to link with catalog items.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="vendor_name" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vendor Name</Label>
            <Input id="vendor_name" name="name" placeholder="e.g. ABC Wholesale" required className="h-12 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl focus-visible:ring-primary/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contact Number</Label>
            <Input id="contact" name="contact" placeholder="e.g. +91 9876543210" className="h-12 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl focus-visible:ring-primary/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Address</Label>
            <Input id="address" name="address" placeholder="Vendor location..." className="h-12 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl focus-visible:ring-primary/50" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-xl shadow-lg transition-all active:scale-[0.98]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Save Vendor"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
