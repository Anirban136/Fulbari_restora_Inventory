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
            // Calculate available stock
            let stock: number | null = item.Item?.OutletStock?.[0]?.quantity ?? null
            
            // If it's a recipe, calculate the minimum possible units from ingredients
            if (item.ingredients && item.ingredients.length > 0) {
              const possibleUnits = item.ingredients.map((ing: any) => {
                const ingStock = ing.Item?.OutletStock?.[0]?.quantity ?? 0
                return Math.floor(ingStock / ing.quantity)
              })
              stock = Math.min(...possibleUnits)
            }

            const isLowStock = stock !== null && stock < 10
            const isOutOfStock = stock !== null && stock <= 0

            return (
              <div key={item.id} className="relative group animate-in slide-in-from-bottom-2 duration-300">
                <form action={addTabItem.bind(null, tabId, item.id, item.price, 1)}>
                  <button 
                    type="submit" 
                    disabled={isOutOfStock}
                    className={`w-full text-left bg-foreground/5 backdrop-blur-md ${isOutOfStock ? "opacity-40 grayscale cursor-not-allowed" : isCafe ? "hover:bg-orange-500/10 hover:border-orange-500/50 hover:shadow-[0_0_25px_-5px_rgba(249,115,22,0.3)] border-border" : "hover:bg-sky-500/10 hover:border-sky-500/50 hover:shadow-[0_0_25px_-5px_rgba(14,165,233,0.3)] border-border"} border-2 rounded-2xl p-4 lg:p-5 transition-all active:scale-95 group shadow-lg h-full min-h-[100px] flex flex-col justify-between`}
                  >
                    <div className={`font-bold text-foreground ${isOutOfStock ? "" : isCafe ? "group-hover:text-orange-400" : "group-hover:text-sky-400"} text-sm lg:text-lg mb-2 line-clamp-2 whitespace-normal transition-colors pr-2 w-full`}>{item.name}</div>
                    <div>
                       <div className={`${isOutOfStock ? "text-muted-foreground" : isCafe ? "text-orange-500" : "text-sky-500"} font-extrabold text-lg lg:text-xl`}>₹{item.price.toFixed(0)}</div>
                    </div>
                  </button>
                </form>

                {stock !== null && (
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-black tracking-tighter uppercase border transition-all z-10 ${
                    isOutOfStock 
                      ? "bg-red-500 text-red-950 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                      : isLowStock 
                        ? "bg-amber-500/20 text-amber-500 border-amber-500/30" 
                        : "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                  }`}>
                    {isOutOfStock ? "SOLD OUT" : `${stock} left`}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
