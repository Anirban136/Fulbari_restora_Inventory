"use client"

import { useTransition } from "react"
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

  const handleQuantityChange = (newQty: number) => {
    if (newQty === item.quantity || newQty < 0) return

    startTransition(async () => {
      await updateTabItemQuantity(item.id, tabId, newQty, item.priceAtTime)
    })
  }

  return (
    <div className="relative">
      <input
        type="number"
        min="1"
        defaultValue={item.quantity}
        disabled={item.isPaid || isPending}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleQuantityChange(parseInt(e.currentTarget.value))
            e.currentTarget.blur()
          }
        }}
        onBlur={(e) => {
          handleQuantityChange(parseInt(e.target.value))
        }}
        className={cn(
          "px-1 py-0.5 font-black text-sm min-w-[1.5rem] text-center transition-colors bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          isCafe ? "text-orange-400" : "text-sky-400",
          (item.isPaid || isPending) && "opacity-50 cursor-not-allowed"
        )}
      />
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[1px] rounded-lg">
          <Loader2 className="w-3 h-3 animate-spin opacity-50" />
        </div>
      )}
    </div>
  )
}
