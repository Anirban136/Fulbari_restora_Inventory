"use client"

import { useState, useTransition } from "react"
import { createTab, cancelTab, finalizeTab } from "@/app/tabs/actions"
import Link from "next/link"
import { Loader2, Plus, Users, Utensils, Coffee, X, CheckSquare } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface TableGridProps {
  activeTabs: any[]
  outletId: string
  isCafe: boolean
}

export function TableGrid({ activeTabs, outletId, isCafe }: TableGridProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [loadingTable, setLoadingTable] = useState<string | null>(null)
  const [cancellingTable, setCancellingTable] = useState<string | null>(null)
  const [finalizingTable, setFinalizingTable] = useState<string | null>(null)

  const handleOpenTable = (tableName: string) => {
    setLoadingTable(tableName)
    const formData = new FormData()
    formData.append("tableName", tableName)
    formData.append("outletId", outletId)
    formData.append("customerName", "Walk-in")

    startTransition(async () => {
      // Note: We don't try/catch around createTab because it redirects, 
      // which throws a conflict error that breaks the client side alert.
      // If there's a real field error, the server action should handle it.
      await createTab(formData)
    })
  }

  const handleCancel = (e: React.MouseEvent, tabId: string, tableName: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Using a simpler confirm or skipping for test
    if (!window.confirm(`Cancel Table ${tableName}?`)) return

    setCancellingTable(tableName)
    startTransition(async () => {
      try {
        await cancelTab(tabId)
        toast.error(`Table ${tableName} has been cancelled`)
        router.refresh()
      } catch (error) {
        console.error("Failed to cancel table:", error)
        alert("Failed to cancel table")
      } finally {
        setCancellingTable(null)
      }
    })
  }

  const handleFinalize = (e: React.MouseEvent, tabId: string, tableName: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Removing confirm for the success button to make it one-click as requested
    // "once the food is delivered then manager will mark it as success"

    setFinalizingTable(tableName)
    startTransition(async () => {
      try {
        await finalizeTab(tabId)
        toast.success(`Table ${tableName} marked as served!`)
        router.refresh()
      } catch (error) {
        console.error("Failed to finalize table:", error)
        alert("Failed to finalize table")
      } finally {
        setFinalizingTable(null)
      }
    })
  }

  // Create array of 20 tables as requested
  const tables = Array.from({ length: 20 }, (_, i) => (i + 1).toString())

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 w-full pb-10">
      {tables.map((tableNum) => {
        const activeTab = activeTabs.find((t) => t.tableName === tableNum)
        const isOccupied = !!activeTab
        const isPaidHold = activeTab?.status === "PAID_HOLD"
        const isLoading = loadingTable === tableNum && isPending
        const isCancelling = cancellingTable === tableNum && isPending
        const isFinalizing = finalizingTable === tableNum && isPending

        if (isOccupied) {
          const itemsCount = activeTab.Items.reduce((acc: number, item: any) => acc + item.quantity, 0)
          
          return (
            <div key={tableNum} className="relative group h-44 animate-in fade-in zoom-in duration-500 z-10 hover:z-50">
                <Link href={`/tabs/${activeTab.id}`} className="block h-full">
                    <div className={`relative h-full ${isPaidHold ? "bg-emerald-500/20 border-emerald-500 shadow-[0_0_30px_-10px_rgba(16,185,129,0.4)]" : "bg-red-600/20 border-red-500/40"} border-2 hover:${isPaidHold ? "border-emerald-400" : "border-red-500"} rounded-[2rem] p-5 transition-all duration-500 hover:shadow-[0_20px_50px_-10px_${isPaidHold ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.4)"}] hover:-translate-y-2 flex flex-col justify-between overflow-visible backdrop-blur-md bg-background/50`}>
                        
                        {/* Decorator */}
                        <div className={`absolute -right-4 -top-4 w-24 h-24 ${isPaidHold ? "bg-emerald-500/10" : "bg-red-600/10"} rounded-full blur-2xl group-hover:${isPaidHold ? "bg-emerald-500/20" : "bg-red-500/20"} transition-all duration-500`}></div>
                        
                        <div className="flex justify-between items-start relative z-10">
                            <div className="flex flex-col">
                                <span className={`text-3xl font-black text-foreground group-hover:${isPaidHold ? "text-emerald-500" : "text-red-500"} transition-colors`}>T-{tableNum}</span>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className={`w-2 h-2 rounded-full ${isPaidHold ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-red-500 animate-pulse"}`}></div>
                                    <span className={`text-[10px] font-black ${isPaidHold ? "text-emerald-500" : "text-red-500"} tracking-[0.2em] uppercase`}>{isPaidHold ? "Paid - Serv" : "Occupied"}</span>
                                </div>
                            </div>
                            <div className={`bg-foreground/10 backdrop-blur-md border border-border p-2 rounded-xl group-hover:${isPaidHold ? "border-emerald-500/50" : "border-red-500/50"} transition-colors`}>
                                {isCafe ? <Utensils className={`w-5 h-5 ${isPaidHold ? "text-emerald-500" : "text-red-500"}`} /> : <Coffee className={`w-5 h-5 ${isPaidHold ? "text-emerald-500" : "text-red-500"}`} />}
                            </div>
                        </div>

                        <div className="flex flex-col relative z-10">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Users className={`w-3.5 h-3.5 ${isPaidHold ? "text-emerald-500/70" : "text-red-500/70"}`} />
                                <span className={`text-foreground font-black text-sm line-clamp-2 group-hover:${isPaidHold ? "text-emerald-600" : "text-red-600"} transition-colors`}>{activeTab.customerName || "Walk-in"}</span>
                            </div>
                            <div 
                                className="relative group/bill" 
                                tabIndex={0}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            >
                                <div className={`flex justify-between items-center bg-foreground/5 p-2.5 rounded-xl border border-border shadow-inner group-hover:${isPaidHold ? "border-emerald-500/20" : "border-red-500/20"} transition-colors cursor-pointer`}>
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{isPaidHold ? "Final Check" : "Running Bill"}</span>
                                    <span className={`text-xs font-black ${isPaidHold ? "text-emerald-500" : "text-red-500"}`}>{itemsCount} Items</span>
                                </div>
                                {activeTab.Items?.length > 0 && (
                                    <div className="absolute left-0 right-0 -bottom-2 translate-y-full p-3 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] opacity-0 group-hover/bill:opacity-100 group-focus/bill:opacity-100 focus-within:opacity-100 pointer-events-none transition-all duration-300 z-[100] max-h-40 overflow-y-auto custom-scrollbar-premium scale-95 group-hover/bill:scale-100 group-focus/bill:scale-100 origin-top">
                                        <div className="flex flex-col gap-2">
                                            {activeTab.Items.map((item: any) => (
                                                <div key={item.id} className="flex justify-between items-start text-xs">
                                                    <span className="text-foreground font-bold leading-tight flex-1 pr-2">{item.MenuItem?.name || "Item"}</span>
                                                    <span className="text-muted-foreground font-black whitespace-nowrap bg-foreground/5 px-1.5 py-0.5 rounded-md">x{item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hover Glow */}
                        <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-${isPaidHold ? "emerald-500" : "red-500"} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                    </div>
                </Link>
                
                {/* Action Buttons */}
                <div className="absolute -top-2 -right-2 flex flex-col gap-2 z-20">
                   {isPaidHold ? (
                      <button 
                        onClick={(e) => handleFinalize(e, activeTab.id, tableNum)}
                        disabled={isPending}
                        className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-500 hover:scale-110 transition-all border-2 border-[#0a0a0a] disabled:opacity-50 group/success"
                        title="Mark as Served (Clear Table)"
                      >
                        {isFinalizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckSquare className="w-5 h-5 group-hover/success:rotate-12 transition-transform" />}
                      </button>
                   ) : (
                      <button 
                        onClick={(e) => handleCancel(e, activeTab.id, tableNum)}
                        disabled={isPending}
                        className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 hover:scale-110 transition-all border-2 border-[#0a0a0a] disabled:opacity-50 group/cancel"
                        title="Cancel Table (Make Vacant)"
                      >
                        {isCancelling ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5 group-hover/cancel:rotate-90 transition-transform" />}
                      </button>
                   )}
                </div>
            </div>
          )
        }

        return (
          <button
            key={tableNum}
            disabled={isPending}
            onClick={() => handleOpenTable(tableNum)}
            className="relative group bg-foreground/[0.03] border-2 border-dashed border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-[2rem] p-5 transition-all duration-500 hover:shadow-[0_20px_50px_-10px_rgba(16,185,129,0.25)] hover:-translate-y-2 h-44 flex flex-col justify-between items-center text-center disabled:opacity-50 backdrop-blur-sm overflow-hidden animate-in fade-in zoom-in duration-500"
          >
            <div className="flex justify-between w-full items-start relative z-10">
              <span className="text-3xl font-black text-muted-foreground group-hover:text-emerald-600 transition-colors">T-{tableNum}</span>
              <div className="bg-foreground/5 text-muted-foreground text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-border tracking-widest uppercase group-hover:text-emerald-600 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">Vacant</div>
            </div>
            
            {isLoading ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-3" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Starting Bill...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center group-hover:scale-110 transition-transform duration-500">
                <div className="w-14 h-14 rounded-2xl bg-foreground/5 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:rotate-12 transition-all duration-500 border border-border group-hover:border-emerald-500/30 shadow-inner">
                    <Plus className="w-7 h-7 text-muted-foreground group-hover:text-emerald-600 transition-all" />
                </div>
                <span className="text-[10px] font-black text-muted-foreground group-hover:text-emerald-600 uppercase tracking-[0.25em] mt-4">Open Table</span>
              </div>
            )}
            
            <div className="w-full relative z-10">
                <div className="h-1 bg-foreground/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 group-hover:w-full w-0 transition-all duration-1000 ease-out"></div>
                </div>
            </div>

            {/* Subtle background T number on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-[0.05] transition-opacity duration-1000 pointer-events-none">
                <span className="text-[10rem] font-black text-emerald-500 leading-none">{tableNum}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
