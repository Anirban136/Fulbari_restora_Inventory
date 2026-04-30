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
            "relative overflow-hidden group p-8 rounded-[2.5rem] border-2 transition-all duration-500 text-left flex items-center justify-between",
            activeTab === 'single'
              ? "bg-blue-500/10 border-blue-500 shadow-[0_20px_50px_-12px_rgba(59,130,246,0.3)]"
              : "bg-background border-border hover:border-blue-500/30 shadow-sm"
          )}
        >
          <div className="relative z-10 flex items-center gap-6">
            <div className={cn(
              "p-5 rounded-2xl border transition-all duration-500 shadow-lg",
              activeTab === 'single' ? "bg-blue-500 text-white border-blue-500 scale-110" : "bg-muted text-muted-foreground border-border group-hover:border-blue-500/50"
            )}>
              <PackagePlus className="w-8 h-8" />
            </div>
            <div>
              <h4 className={cn(
                "text-2xl font-black uppercase tracking-tighter transition-colors",
                activeTab === 'single' ? "text-blue-600 dark:text-blue-400" : "text-foreground"
              )}>Stock in One</h4>
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Precision Log Entry</p>
            </div>
          </div>
          <div className={cn(
            "h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all duration-500",
            activeTab === 'single' ? "bg-blue-500 border-blue-500 text-white rotate-0" : "border-border text-muted-foreground -rotate-45 opacity-20 group-hover:opacity-100 group-hover:rotate-0 group-hover:border-blue-500/50"
          )}>
            <ArrowRight className="w-6 h-6" />
          </div>
          
          {/* Decorative background circle */}
          <div className={cn(
            "absolute -right-8 -bottom-8 w-40 h-40 rounded-full transition-all duration-1000 blur-3xl opacity-20",
            activeTab === 'single' ? "bg-blue-500 scale-150" : "bg-muted scale-0"
          )} />
        </button>

        <button
          onClick={() => setActiveTab('bulk')}
          className={cn(
            "relative overflow-hidden group p-8 rounded-[2.5rem] border-2 transition-all duration-500 text-left flex items-center justify-between",
            activeTab === 'bulk'
              ? "bg-emerald-500/10 border-emerald-500 shadow-[0_20px_50px_-12px_rgba(16,185,129,0.3)]"
              : "bg-background border-border hover:border-emerald-500/30 shadow-sm"
          )}
        >
          <div className="relative z-10 flex items-center gap-6">
            <div className={cn(
              "p-5 rounded-2xl border transition-all duration-500 shadow-lg",
              activeTab === 'bulk' ? "bg-emerald-500 text-white border-emerald-500 scale-110" : "bg-muted text-muted-foreground border-border group-hover:border-emerald-500/50"
            )}>
              <LayoutGrid className="w-8 h-8" />
            </div>
            <div>
              <h4 className={cn(
                "text-2xl font-black uppercase tracking-tighter transition-colors",
                activeTab === 'bulk' ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              )}>Stock in Bulk</h4>
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-60">High-Speed Grid Entry</p>
            </div>
          </div>
          <div className={cn(
            "h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all duration-500",
            activeTab === 'bulk' ? "bg-emerald-500 border-emerald-500 text-white rotate-0" : "border-border text-muted-foreground -rotate-45 opacity-20 group-hover:opacity-100 group-hover:rotate-0 group-hover:border-emerald-500/50"
          )}>
            <ArrowRight className="w-6 h-6" />
          </div>

          {/* Decorative background circle */}
          <div className={cn(
            "absolute -right-8 -bottom-8 w-40 h-40 rounded-full transition-all duration-1000 blur-3xl opacity-20",
            activeTab === 'bulk' ? "bg-emerald-500 scale-150" : "bg-muted scale-0"
          )} />
        </button>
      </div>

      {/* Forms Display */}
      <div className="transition-all duration-500">
        {!activeTab && (
          <div className="glass-panel p-20 rounded-[3.5rem] border-4 border-dashed border-border/50 bg-foreground/[0.01] flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-700 shadow-inner">
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative p-8 bg-background rounded-3xl border border-border shadow-xl">
                <PackagePlus className="w-16 h-16 text-primary/40" />
              </div>
            </div>
            <div>
              <h5 className="text-2xl font-black text-foreground/40 uppercase tracking-[0.2em]">Deployment Interface</h5>
              <p className="text-muted-foreground/30 text-sm font-bold uppercase tracking-widest mt-2">Initialize intake sequence by selecting a method above</p>
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
