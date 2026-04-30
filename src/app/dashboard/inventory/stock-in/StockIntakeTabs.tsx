"use client"

import { useState } from "react"
import { LayoutGrid, PackagePlus, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface StockIntakeTabsProps {
  singleForm: React.ReactNode
  bulkManager: React.ReactNode
}

export function StockIntakeTabs({ singleForm, bulkManager }: StockIntakeTabsProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | null>(null)

  return (
    <div className="space-y-8">
      {/* Tab Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setActiveTab('single')}
          className={cn(
            "relative overflow-hidden group p-6 rounded-[2rem] border-2 transition-all duration-500 text-left flex items-center justify-between",
            activeTab === 'single'
              ? "bg-primary/10 border-primary shadow-[0_0_30px_rgba(16,185,129,0.1)]"
              : "bg-background border-border hover:border-primary/30"
          )}
        >
          <div className="relative z-10 flex items-center gap-4">
            <div className={cn(
              "p-4 rounded-2xl border transition-colors",
              activeTab === 'single' ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border group-hover:border-primary/50"
            )}>
              <PackagePlus className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xl font-black text-foreground uppercase tracking-tighter">Stock in One Product</h4>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest opacity-60">Log a single item delivery</p>
            </div>
          </div>
          <ArrowRight className={cn(
            "w-6 h-6 transition-all duration-500",
            activeTab === 'single' ? "text-primary translate-x-0 opacity-100" : "text-muted-foreground -translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-40"
          )} />
          
          {/* Decorative background circle */}
          <div className={cn(
            "absolute -right-8 -bottom-8 w-32 h-32 rounded-full transition-all duration-700 opacity-10",
            activeTab === 'single' ? "bg-primary scale-150" : "bg-muted scale-100"
          )} />
        </button>

        <button
          onClick={() => setActiveTab('bulk')}
          className={cn(
            "relative overflow-hidden group p-6 rounded-[2rem] border-2 transition-all duration-500 text-left flex items-center justify-between",
            activeTab === 'bulk'
              ? "bg-primary/10 border-primary shadow-[0_0_30px_rgba(16,185,129,0.1)]"
              : "bg-background border-border hover:border-primary/30"
          )}
        >
          <div className="relative z-10 flex items-center gap-4">
            <div className={cn(
              "p-4 rounded-2xl border transition-colors",
              activeTab === 'bulk' ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border group-hover:border-primary/50"
            )}>
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xl font-black text-foreground uppercase tracking-tighter">Stock in Bulk</h4>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest opacity-60">Log multiple items at once</p>
            </div>
          </div>
          <ArrowRight className={cn(
            "w-6 h-6 transition-all duration-500",
            activeTab === 'bulk' ? "text-primary translate-x-0 opacity-100" : "text-muted-foreground -translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-40"
          )} />

          {/* Decorative background circle */}
          <div className={cn(
            "absolute -right-8 -bottom-8 w-32 h-32 rounded-full transition-all duration-700 opacity-10",
            activeTab === 'bulk' ? "bg-primary scale-150" : "bg-muted scale-100"
          )} />
        </button>
      </div>

      {/* Forms Display */}
      <div className="transition-all duration-500">
        {!activeTab && (
          <div className="glass-panel p-12 rounded-[2.5rem] border-dashed border-2 border-border/50 bg-foreground/[0.01] flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="p-6 bg-muted/30 rounded-full">
              <PackagePlus className="w-12 h-12 text-muted-foreground/20" />
            </div>
            <div>
              <h5 className="text-lg font-black text-foreground/40 uppercase tracking-widest">Select Intake Method</h5>
              <p className="text-muted-foreground/30 text-sm font-medium">Choose how you want to log your stock above</p>
            </div>
          </div>
        )}

        {activeTab === 'single' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            {singleForm}
          </div>
        )}

        {activeTab === 'bulk' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            {bulkManager}
          </div>
        )}
      </div>
    </div>
  )
}
