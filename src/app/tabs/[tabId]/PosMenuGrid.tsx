"use client"

import { useState } from "react"
import { addTabItem } from "./actions"
import { ArrowLeft, Tag } from "lucide-react"

export function PosMenuGrid({ categorizedMenu, tabId, isCafe }: { categorizedMenu: Record<string, any[]>, tabId: string, isCafe: boolean }) {
  const categories = Object.keys(categorizedMenu)
  
  // Default to the first category if none is selected
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || "")

  if (categories.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground italic opacity-50">
        No items available on the menu.
      </div>
    )
  }

  // Ensure selectedCategory is always valid when categories change
  const activeCategory = categorizedMenu[selectedCategory] ? selectedCategory : categories[0]

  return (
    <div className="flex-1 flex overflow-hidden animate-in fade-in duration-300">
      
      {/* Category Sidebar (Left Pane) */}
      <div className="w-[120px] lg:w-[150px] shrink-0 border-r border-border bg-foreground/5 overflow-y-auto flex flex-col p-2 space-y-2 pb-32">
        {categories.map((category) => {
          const isActive = category === activeCategory
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`w-full text-left p-3 lg:p-4 rounded-xl transition-all active:scale-95 flex flex-col items-center justify-center gap-2 text-center border-2 ${
                isActive 
                  ? isCafe 
                    ? "bg-orange-500/20 border-orange-500 shadow-[0_0_20px_-5px_#f97316] text-orange-400" 
                    : "bg-sky-500/20 border-sky-500 shadow-[0_0_20px_-5px_#0ea5e9] text-sky-400"
                  : "bg-foreground/5 border-transparent text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              }`}
            >
              <Tag className={`w-5 h-5 lg:w-6 lg:h-6 ${isActive ? "" : "opacity-60"}`} />
              <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest break-words w-full px-1">{category}</span>
              <span className="text-[9px] font-bold opacity-60 font-mono bg-background/50 dark:bg-black/40 px-2 py-0.5 rounded-full">{categorizedMenu[category].length}</span>
            </button>
          )
        })}
      </div>

      {/* Products Grid (Right Pane) */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-32 bg-background relative">
        <h3 className={`text-xs font-black tracking-[0.2em] ${isCafe ? "text-orange-400" : "text-sky-400"} uppercase mb-6 flex items-center gap-4 sticky top-0 bg-background/90 backdrop-blur pb-2 z-20`}>
          {activeCategory}
          <div className="h-px bg-border flex-1 relative top-0.5"></div>
        </h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
          {categorizedMenu[activeCategory].map((item: any) => {
            const hasIngredients = item.ingredients && item.ingredients.length > 0
            
            // Calculate available stock only if linked via recipe
            let stock: number | null = null
            let stockItemName: string | null = null

            if (hasIngredients) {
              const possibleUnits = item.ingredients.map((ing: any) => {
                const ingStock = ing.Item?.OutletStock?.[0]?.quantity ?? 0
                return Math.floor(ingStock / ing.quantity)
              })
              stock = Math.min(...possibleUnits)
              const bottleneckIndex = possibleUnits.indexOf(stock)
              stockItemName = item.ingredients[bottleneckIndex]?.Item?.name
            }

            const isLowStock = stock !== null && stock < 10
            const isOutOfStock = stock !== null && stock <= 0

            return (
              <div key={item.id} className="relative animate-in slide-in-from-bottom-2 duration-300">
                <form action={addTabItem.bind(null, tabId, item.id, item.price, 1)} className="h-full">
                  <button 
                    type="submit" 
                    className={`w-full text-left bg-foreground/5 backdrop-blur-md ${isOutOfStock ? "opacity-70 grayscale-[50%]" : ""} ${isCafe ? "hover:bg-orange-500/10 hover:border-orange-500/50 hover:shadow-[0_0_25px_-5px_rgba(249,115,22,0.3)] border-border" : "hover:bg-sky-500/10 hover:border-sky-500/50 hover:shadow-[0_0_25px_-5px_rgba(14,165,233,0.3)] border-border"} border-2 rounded-2xl p-4 lg:p-6 transition-all active:scale-95 group shadow-lg h-full min-h-[160px] flex flex-col`}
                  >
                    {/* Card Header: Stock Info */}
                    {stock !== null && (
                      <div className={`mb-3 self-start px-2 py-1 rounded-lg text-[9px] font-black tracking-tight uppercase border transition-all flex items-center gap-2 ${
                        isOutOfStock 
                          ? "bg-red-500 text-red-950 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                          : isLowStock 
                            ? "bg-amber-500/20 text-amber-500 border-amber-500/30" 
                            : "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                      }`}>
                        <span className="opacity-70 max-w-[80px] truncate">{stockItemName}</span>
                        <div className={`w-1 h-1 rounded-full ${isOutOfStock ? "bg-red-950" : isLowStock ? "bg-amber-500" : "bg-emerald-500"} animate-pulse`}></div>
                        <span className="text-[10px] lg:text-[11px]">{isOutOfStock ? "OUT" : `${stock} LEFT`}</span>
                      </div>
                    )}

                    {/* Product Name */}
                    <div className={`font-bold text-foreground ${isCafe ? "group-hover:text-orange-400" : "group-hover:text-sky-400"} text-sm lg:text-lg mb-4 whitespace-normal leading-tight transition-colors w-full`}>
                      {item.name}
                    </div>

                    {/* Price - Pushed to bottom */}
                    <div className="mt-auto pt-2 border-t border-border/50">
                       <div className={`${isCafe ? "text-orange-500" : "text-sky-500"} font-extrabold text-xl lg:text-2xl`}>₹{item.price.toFixed(0)}</div>
                    </div>
                  </button>
                </form>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
