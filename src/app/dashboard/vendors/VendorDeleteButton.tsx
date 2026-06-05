"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { DeleteVerificationDialog } from "@/components/DeleteVerificationDialog"
import { deleteVendor } from "../inventory/actions"
import { toast } from "sonner"

export function VendorDeleteButton({ vendor }: { vendor: any }) {
  const [isOpen, setIsOpen] = useState(false)

  const handleDelete = async (pin: string) => {
    try {
      const formData = new FormData()
      formData.append("vendorId", vendor.id)
      await deleteVendor(formData, pin)
      toast.success(`Vendor ${vendor.name} has been terminated`)
    } catch (e: any) {
      toast.error(e.message || "Failed to terminate vendor")
      throw e
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-3 rounded-2xl bg-foreground/5 border border-foreground/5 text-red-400/60 hover:text-red-400 transition-all hover:bg-red-500/10 active:scale-90" 
        title="Terminate Link"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <DeleteVerificationDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        itemName={vendor.name}
        title="Terminate Vendor?"
        description="Confirm full removal of this vendor. This action wipes the payment ledger, removes supply chain links, and cannot be reversed."
        onConfirm={handleDelete}
      />
    </>
  )
}
