"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Edit2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { editVendor } from "./actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface Vendor {
  id: string
  name: string
  contact?: string | null
  email?: string | null
  address?: string | null
}

export function EditVendorDialog({ vendor }: { vendor: Vendor }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      formData.append("vendorId", vendor.id)
      await editVendor(formData)
      toast.success("Vendor updated successfully!", {
        description: `Changes to ${vendor.name} have been saved.`,
        icon: <Users className="w-5 h-5 text-blue-500" />
      })
      setOpen(false)
    } catch (error) {
      toast.error("Failed to update vendor.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button className="p-2 rounded-xl text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50" title="Edit Vendor">
          <Edit2 className="w-4 h-4" />
        </button>
      } />
      
      <DialogContent className="sm:max-w-[450px] bg-background/95 backdrop-blur-2xl border-border rounded-3xl shadow-2xl">
        <DialogHeader className="mb-4">
           <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]">
             <Edit2 className="w-6 h-6 text-blue-400" />
           </div>
          <DialogTitle className="text-2xl font-black text-foreground">Edit Vendor</DialogTitle>
          <DialogDescription className="text-slate-400">
            Update contact and billing details for <span className="text-foreground font-bold">{vendor.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={`edit_vendor_name_${vendor.id}`} className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vendor Name</Label>
            <Input id={`edit_vendor_name_${vendor.id}`} name="name" defaultValue={vendor.name} placeholder="e.g. ABC Wholesale" required className="h-12 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl focus-visible:ring-blue-500/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit_contact_${vendor.id}`} className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contact Number</Label>
            <Input id={`edit_contact_${vendor.id}`} name="contact" defaultValue={vendor.contact || ""} placeholder="e.g. +91 9876543210" className="h-12 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl focus-visible:ring-blue-500/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit_email_${vendor.id}`} className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Address</Label>
            <Input id={`edit_email_${vendor.id}`} name="email" type="email" defaultValue={vendor.email || ""} placeholder="abc@wholesale.com" className="h-12 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl focus-visible:ring-blue-500/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit_address_${vendor.id}`} className="text-xs font-bold text-slate-400 uppercase tracking-widest">Address</Label>
            <Input id={`edit_address_${vendor.id}`} name="address" defaultValue={vendor.address || ""} placeholder="Vendor location..." className="h-12 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl focus-visible:ring-blue-500/50" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white mt-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
