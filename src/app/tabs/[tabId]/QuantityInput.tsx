"use client"

import { useState, useEffect, useTransition } from "react"
import { updateTabItemQuantity } from "./actions"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface QuantityInputProps {
  item: any
  tabId: string
  isCafe: boolean
}

export function QuantityInput({ item, tabId, isCafe }: QuantityInputProps) {
  const [isPending, startTransition] = useTransition()
  const [localQty, setLocalQty] = useState(item.quantity)

  // Sync with server if item.quantity changes from elsewhere
  useEffect(() => {
    setLocalQty(item.quantity)
  }, [item.quantity])

  const syncQuantity = (newQty: number) => {
    if (isNaN(newQty) || newQty === item.quantity || newQty < 0) return

    startTransition(async () => {
      try {
        await updateTabItemQuantity(item.id, tabId, newQty, item.priceAtTime)
      } catch (err) {
        console.error("Failed to update quantity:", err)
        setLocalQty(item.quantity) // Revert on error
      }
    })
  }

  // Debounce logic for "as you type" updates
  useEffect(() => {
    if (localQty === item.quantity) return

    const timer = setTimeout(() => {
      syncQuantity(localQty)
    }, 600) // 600ms delay after typing stops

    return () => clearTimeout(timer)
  }, [localQty])

  return (
    <div className="relative">
      <input
        type="number"
        min="1"
        value={localQty}
        onChange={(e) => {
          const val = parseInt(e.target.value)
          setLocalQty(isNaN(val) ? 0 : val)
        }}
        disabled={item.isPaid}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur()
          }
        }}
        className={cn(
          "px-1 py-0.5 font-black text-sm min-w-[1.5rem] text-center transition-colors bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          isCafe ? "text-orange-400" : "text-sky-400",
          (item.isPaid) && "opacity-50 cursor-not-allowed",
          isPending && "animate-pulse"
        )}
      />
      {isPending && (
        <div className="absolute -top-1 -right-1 flex items-center justify-center">
          <Loader2 className="w-2 h-2 animate-spin text-primary opacity-50" />
        </div>
      )}
    </div>
  )
}
