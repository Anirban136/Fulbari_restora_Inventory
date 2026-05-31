"use client"

import { useState, useMemo } from "react"
import { Receipt, Coffee, Activity, ChevronRight, Trash2 } from "lucide-react"
import { EditTransactionModal } from "./EditTransactionModal"
import { deleteClosedTab } from "@/app/dashboard/transactions/actions"
import { DeleteVerificationDialog } from "./DeleteVerificationDialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Transaction = {
  id: string
  totalAmount: number
  paymentMode: string | null
  customerName: string | null
  closedAt: Date | null
  tokenNumber: number | null
  Outlet: {
    name: string
  }
}

export function TransactionsFeed({ tabs, userRole }: { tabs: any[], userRole?: string }) {
  const [filter, setFilter] = useState<"ALL" | "CAFE" | "CHAI">("ALL")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [itemToDelete, setItemToDelete] = useState<any>(null)

  const handleDelete = async (pin: string) => {
    if (!itemToDelete) return
    
    setIsDeleting(itemToDelete.id)
    try {
      await deleteClosedTab(itemToDelete.id, pin)
      toast.success("Transaction deleted and inventory reverted")
      setItemToDelete(null)
    } catch (e: any) {
      toast.error(e.message || "Failed to delete transaction")
    } finally {
      setIsDeleting(null)
    }
  }

  const filteredTabs = useMemo(() => {
    let list = [...tabs].sort((a, b) => (new Date(b.closedAt).getTime() || 0) - (new Date(a.closedAt).getTime() || 0))
    
    if (filter === "ALL") return list
    return list.filter(tab => tab.Outlet.name.toUpperCase().includes(filter))
  }, [tabs, filter])

  return (
    <div className="space-y-8 relative z-10 mt-16">
      {/* Header & Filter Control */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-center px-4 gap-8">
        <div className="flex items-center gap-4">
           <div className="p-4 bg-primary/10 rounded-[1.5rem] border border-primary/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
             <Receipt className="text-primary w-6 h-6" />
           </div>
            <div>
              <h3 className="text-3xl font-black text-foreground tracking-tight uppercase">Today's Transactions</h3>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-90 dark:opacity-60 transition-opacity">Live Transaction Stream</p>
            </div>
        </div>

        {/* Premium Filter Toggle */}
        <div className="flex bg-foreground/5 p-1.5 rounded-2xl border border-border backdrop-blur-xl self-start xl:self-center">
          {[
            { id: "ALL", label: "All Activity", icon: Activity },
            { id: "CAFE", label: "Cafe", icon: Coffee },
            { id: "CHAI", label: "Chai Joint", icon: Activity },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as any)}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${
                filter === item.id 
                  ? "bg-primary text-primary-foreground shadow-[0_10px_20px_-5px_rgba(16,185,129,0.4)] scale-105" 
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              <item.icon className={`w-3.5 h-3.5 ${filter === item.id ? "animate-pulse" : ""}`} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <a href={`/api/export/transactions?outlet=CAFE`} className="bg-amber-600/10 border border-amber-600/20 px-6 py-2.5 rounded-2xl text-[10px] font-black text-amber-600 hover:bg-amber-600 shadow-md hover:text-white dark:hover:text-primary-foreground transition-all uppercase tracking-widest">Cafe Export</a>
          <a href={`/api/export/transactions?outlet=CHAI_JOINT`} className="bg-blue-600/10 border border-blue-600/20 px-6 py-2.5 rounded-2xl text-[10px] font-black text-blue-600 hover:bg-blue-600 shadow-md hover:text-white dark:hover:text-primary-foreground transition-all uppercase tracking-widest">Chai Export</a>
        </div>
      </div>

      {/* Analytics Badge — Shows count for current filter */}
      <div className="px-4">
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-foreground/5 border border-border rounded-full">
           <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
           <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
             Showing {filteredTabs.length} {filter === 'ALL' ? 'Transactions' : `${filter} Records`}
           </span>
        </div>
      </div>

      {/* Stream View (Cards on Mobile, Premium Table on Desktop) */}
      <div className="space-y-4">
        {/* Card View (Mobile-First) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 px-2">
          {filteredTabs.length === 0 ? (
            <div className="text-center py-24 glass-panel rounded-[3rem] border-border bg-foreground/5 flex flex-col items-center justify-center gap-4 col-span-full">
               <Receipt className="w-12 h-12 text-muted-foreground/20" />
                <div className="space-y-2">
                  <p className="text-muted-foreground font-black uppercase tracking-widest opacity-80 dark:opacity-40 italic">No capture detected</p>
                  <p className="text-[10px] text-muted-foreground/80 dark:text-muted-foreground/30 font-bold uppercase tracking-widest">Awaiting first sync for {filter}</p>
                </div>
            </div>
          ) : (
            filteredTabs.map(tab => (
              <div key={tab.id} className="glass-card p-6 rounded-[2.5rem] border-border flex flex-col justify-between hover:border-primary/20 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{tab.Outlet.name.replace('_', ' ')}</span>
                      <EditTransactionModal tabId={tab.id} currentAmount={tab.totalAmount} currentMode={tab.paymentMode || "CASH"} />
                    </div>
                    <span className="text-lg font-black text-foreground truncate max-w-[150px]">{tab.customerName || "Walk-in Capture"}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground opacity-90 dark:opacity-60 bg-foreground/5 px-2 py-1 rounded-lg">
                      {tab.tokenNumber ? `TOKEN #${tab.tokenNumber}` : tab.closedAt ? new Date(tab.closedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                    </span>
                    {tab.tokenNumber && tab.closedAt && (
                      <span className="text-[8px] font-bold text-muted-foreground/80 dark:text-muted-foreground/40 uppercase tracking-widest">
                        {new Date(tab.closedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${tab.paymentMode === 'CASH' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : tab.paymentMode === 'ONLINE' || tab.paymentMode === 'UPI' ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-purple-500 shadow-[0_0_10px_#a855f7]'}`}></div>
                     <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{tab.paymentMode}</span>
                  </div>
                   <p className="text-3xl font-black text-foreground tracking-tighter group-hover:text-primary transition-colors">₹{tab.totalAmount.toFixed(0)}</p>
                  
                  {userRole === "OWNER" && (
                    <button 
                      onClick={() => setItemToDelete(tab)}
                      disabled={isDeleting === tab.id}
                      className="ml-4 p-2 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-20"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block glass-panel rounded-[3rem] overflow-hidden border border-border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-foreground/5 border-b border-border">
                <th className="p-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">Temporal Point</th>
                <th className="p-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">Node Location</th>
                <th className="p-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">Token</th>
                <th className="p-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">Subject Entity</th>
                <th className="p-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] text-right">Credit Resolved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTabs.length === 0 ? (
                <tr>
                   <td colSpan={4} className="p-32 text-center">
                     <div className="flex flex-col items-center gap-6 opacity-30">
                        <Activity className="w-16 h-16 animate-pulse text-muted-foreground" />
                        <span className="text-xs font-black uppercase tracking-[0.4em]">Zero Flow Captured for {filter}</span>
                     </div>
                   </td>
                </tr>
              ) : (
                filteredTabs.map(tab => (
                  <tr key={tab.id} className="hover:bg-foreground/5 transition-all duration-300 group">
                    <td className="p-8 text-xs font-bold text-muted-foreground group-hover:text-foreground">
                      <div className="flex items-center gap-3">
                         <div className="w-1 h-1 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                         {tab.closedAt ? new Date(tab.closedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                      </div>
                    </td>
                    <td className="p-8">
                       <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                         tab.Outlet.name.toUpperCase().includes('CAFE') 
                           ? 'bg-amber-600/10 border-amber-600/20 text-amber-600' 
                           : 'bg-indigo-600/10 border-indigo-600/20 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400'
                       }`}>
                         {tab.Outlet.name.replace('_', ' ')}
                       </span>
                    </td>
                    <td className="p-8">
                        {tab.tokenNumber ? (
                          <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-black text-primary tracking-widest">
                            #{tab.tokenNumber}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground/60 dark:text-muted-foreground/30">---</span>
                        )}
                    </td>
                    <td className="p-8 relative">
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-black text-foreground group-hover:translate-x-1 transition-transform">{tab.customerName || "Direct Walk-in Capture"}</span>
                        <EditTransactionModal tabId={tab.id} currentAmount={tab.totalAmount} currentMode={tab.paymentMode || "CASH"} />
                      </div>
                    </td>
                     <td className="p-8 text-right">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-4">
                          {userRole === "OWNER" && (
                            <button 
                              onClick={() => setItemToDelete(tab)}
                              disabled={isDeleting === tab.id}
                              className="p-2 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-10"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                          <span className="text-3xl font-black text-foreground tracking-tighter group-hover:text-primary transition-colors">₹{tab.totalAmount.toFixed(0)}</span>
                        </div>
                        <span className={cn(
                          "mt-1 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-colors focus:ring-2 ring-primary/40 outline-none",
                          tab.paymentMode === "COMPLEMENTARY" 
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:bg-purple-500 group-hover:text-primary-foreground" 
                            : "bg-muted/20 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                        )}>
                          {tab.paymentMode}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <DeleteVerificationDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        itemName={itemToDelete ? `${itemToDelete.customerName || 'Walk-in'} (₹${itemToDelete.totalAmount})` : ""}
        title="Delete Transaction?"
        description="ARE YOU SURE? This will permanently delete the bill and AUTO-REVERT all inventory deductions. This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  )
}
