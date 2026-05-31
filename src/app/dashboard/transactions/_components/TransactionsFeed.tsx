"use client"

import { useState, useMemo } from "react"
import { Coffee, CupSoda, Calendar, Filter, FileDown, Search, ArrowRight, CreditCard, Banknote, Layers, Trash2, Trash, Gift } from "lucide-react"
import { DeleteVerificationDialog } from "@/components/DeleteVerificationDialog"
import { toast } from "sonner"
import { formatTimeIST, formatDateIST } from "@/lib/utils"
import { EditTransactionModal } from "@/components/EditTransactionModal"
import { deleteClosedTab } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { generateTransactionPDF } from "@/lib/report-generator"

export function TransactionsFeed({ initialTransactions, userRole }: { initialTransactions: any[], userRole?: string }) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [paymentFilter, setPaymentFilter] = useState<"ALL" | "CASH" | "ONLINE" | "COMPLEMENTARY">("ALL")
  const [activeOutlet, setActiveOutlet] = useState<"CAFE" | "CHAI">("CAFE")
  const [searchTerm, setSearchTerm] = useState("")
  const [itemToDelete, setItemToDelete] = useState<any>(null)
  const [localDeletingId, setLocalDeletingId] = useState<string | null>(null)

  const handleDelete = async (pin: string) => {
    if (!itemToDelete) return
    
    setLocalDeletingId(itemToDelete.id)
    try {
      await deleteClosedTab(itemToDelete.id, pin)
      toast.success("Transaction successfully deleted and inventory reverted")
      setItemToDelete(null)
    } catch (e: any) {
      toast.error(e.message || "Failed to delete transaction")
      throw e
    } finally {
      setLocalDeletingId(null)
    }
  }

  const filteredTransactions = useMemo(() => {
    return initialTransactions.filter(t => {
      const tDate = new Date(t.closedAt || t.openedAt);
      
      const istDate = new Date(tDate.getTime() + 5.5 * 3600000);
      if (istDate.getUTCHours() < 4) istDate.setUTCDate(istDate.getUTCDate() - 1);
      const bizDay = istDate.toISOString().split('T')[0];

      const matchesDate = bizDay === selectedDate;
      const matchesPayment = paymentFilter === "ALL" || 
        (paymentFilter === "CASH" && t.paymentMode === "CASH") ||
        (paymentFilter === "ONLINE" && (t.paymentMode === "ONLINE" || t.paymentMode === "UPI")) ||
        (paymentFilter === "COMPLEMENTARY" && t.paymentMode === "COMPLEMENTARY");
      
      const matchesOutlet = (activeOutlet === "CAFE" && t.Outlet.name.toUpperCase().includes("CAFE")) ||
                            (activeOutlet === "CHAI" && t.Outlet.name.toUpperCase().includes("CHAI"));

      const matchesSearch = t.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      
      return matchesDate && matchesPayment && matchesOutlet && (searchTerm === "" || matchesSearch);
    });
  }, [initialTransactions, selectedDate, paymentFilter, activeOutlet, searchTerm]);

  const cafeTransactions = filteredTransactions.filter(t => t.Outlet.name.toUpperCase().includes("CAFE"));
  const chaiTransactions = filteredTransactions.filter(t => t.Outlet.name.toUpperCase().includes("CHAI"));

  const totals = {
    total: filteredTransactions.filter(t => t.paymentMode !== "COMPLEMENTARY").reduce((s, t) => s + t.totalAmount, 0),
    cash: filteredTransactions.filter(t => t.paymentMode === "CASH").reduce((s, t) => s + t.totalAmount, 0),
    online: filteredTransactions.filter(t => t.paymentMode === "ONLINE" || t.paymentMode === "UPI").reduce((s, t) => s + t.totalAmount, 0),
    complementary: filteredTransactions.filter(t => t.paymentMode === "COMPLEMENTARY").reduce((s, t) => s + t.totalAmount, 0),
  };

  const handleDownloadReport = () => {
    const reportData = {
      transactions: filteredTransactions
    };
    generateTransactionPDF(reportData, selectedDate, selectedDate);
  }

  const renderSection = (title: string, icon: any, colorClass: string, trans: any[], accentBg: string) => (
    <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
      <div className={cn("absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none transition-all", accentBg)}></div>
      <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center border", colorClass)}>
            {icon}
          </div>
          <div>
            <h3 className="text-2xl font-black text-foreground tracking-tight">{title}</h3>
            <p className="text-muted-foreground font-black tracking-widest uppercase text-[10px] opacity-80 dark:opacity-60">{trans.length} Records Found</p>
          </div>
        </div>
        <div className="text-right">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Section Yield</p>
             <p className={cn("text-xl font-black tabular-nums", colorClass.split(' ')[2])}>
                ₹{trans.reduce((s, t) => s + t.totalAmount, 0).toLocaleString()}
             </p>
        </div>
      </div>

      <div className="space-y-4">
        {trans.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs bg-foreground/5 rounded-2xl border border-border opacity-40">
            No Transactions for this filter
          </div>
        ) : (
          trans.map(tab => (
            <div key={tab.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border border-border bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-all group gap-4 relative">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{formatTimeIST(new Date(tab.closedAt || tab.openedAt))}</span>
                  {tab.status === "CANCELLED" && <span className="text-[8px] font-black tracking-widest bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md uppercase border border-red-500/10">Cancelled</span>}
                  {tab.status === "CLOSED" && <span className="text-[8px] font-black tracking-widest bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-md uppercase border border-emerald-500/10">Closed</span>}
                  {tab.status === "OPEN" && <span className="text-[8px] font-black tracking-widest bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-md uppercase border border-blue-500/10">Open</span>}
                </div>
                <h4 className="font-black text-foreground text-lg tracking-tight">{tab.customerName || "Walk-in Customer"}</h4>
                <div className="flex items-center gap-3 mt-1.5">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Billed by: <span className="text-foreground">{tab.User.name}</span></p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className={cn(
                    "font-black tracking-tighter px-4 py-1.5 rounded-xl text-xl",
                    tab.status === "CANCELLED" ? "text-foreground/20 bg-foreground/5" : "text-foreground bg-foreground/5 border border-border"
                  )}>
                    ₹{tab.totalAmount.toFixed(0)}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-2">
                     {tab.paymentMode === 'CASH' ? (
                       <Banknote className="w-3 h-3 text-emerald-500/50" />
                     ) : tab.paymentMode === 'ONLINE' || tab.paymentMode === 'UPI' ? (
                       <CreditCard className="w-3 h-3 text-blue-500/50" />
                     ) : (
                       <Gift className="w-3 h-3 text-purple-500/50" />
                     )}
                     <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{tab.paymentMode || "UNKNOWN"}</p>
                  </div>
                    {(userRole === "OWNER" || userRole === "ADMIN") && (
                      <button 
                        onClick={() => setItemToDelete(tab)}
                        disabled={localDeletingId === tab.id}
                        className="mt-2 w-full flex items-center justify-center gap-2 p-2 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-20 border border-transparent hover:border-red-500/20 active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Delete Bill</span>
                      </button>
                    )}
                </div>
                
                <div className="pl-4 border-l border-border shrink-0">
                  <EditTransactionModal 
                    tabId={tab.id} 
                    currentAmount={tab.totalAmount} 
                    currentMode={tab.paymentMode || "CASH"} 
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-32">
      {/* GLOBAL CONTROL CENTER - TOP MOUNTED */}
      <div className="glass-panel p-8 rounded-[2.5rem] border border-border relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
        
        <div className="flex flex-col gap-8 relative z-10">
          {/* Row 1: Primary Global Filters */}
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-14 pl-12 pr-6 bg-muted border border-border rounded-2xl text-xs font-black text-foreground uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all outline-none"
                />
              </div>

              <div className="flex p-1.5 bg-muted rounded-2xl border border-border items-center">
                {(['ALL', 'CASH', 'ONLINE', 'COMPLEMENTARY'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setPaymentFilter(mode)}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                      paymentFilter === mode ? "bg-emerald-500 text-white dark:text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {mode === 'COMPLEMENTARY' ? '🎁 COMPLEMENTARY' : mode}
                  </button>
                ))}
              </div>

              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                <Input 
                  placeholder="Search Customers..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="h-14 pl-12 bg-background border-border rounded-2xl text-[10px] font-black uppercase tracking-widest w-[200px] lg:w-[280px] placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <Button 
              onClick={handleDownloadReport}
              className="h-14 px-10 rounded-2xl bg-white text-black hover:bg-emerald-50 font-black uppercase tracking-[0.2em] text-[10px] transition-all active:scale-95 gap-3 shadow-xl"
            >
              <FileDown className="w-5 h-5" /> Export Report
            </Button>
          </div>

          {/* Row 2: Hub Specific Tab Switcher */}
          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.3em] mr-2">Audit Hub:</p>
            <div className="flex p-1 bg-muted rounded-2xl border border-border items-center">
              {(['CAFE', 'CHAI'] as const).map(hub => (
                <button
                  key={hub}
                  onClick={() => setActiveOutlet(hub)}
                  className={cn(
                    "px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    activeOutlet === hub 
                      ? hub === 'CAFE' ? "bg-amber-500 text-white dark:text-black shadow-lg" 
                      : "bg-teal-500 text-white dark:text-black shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {hub === 'CAFE' && <Coffee className="w-3 h-3" />}
                  {hub === 'CHAI' && <CupSoda className="w-3 h-3" />}
                  {hub === 'CAFE' ? 'Cafe Hub' : 'Tea Joint'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Analytics Strip */}
        <div className="flex flex-wrap gap-12 mt-8 pt-8 border-t border-border">
           <div className="group transition-transform hover:translate-y-[-2px]">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                 <Layers className="w-3 h-3 text-muted-foreground/30" /> Filtered Volume
              </p>
              <p className="text-3xl font-black text-foreground tabular-nums tracking-tighter">₹{totals.total.toLocaleString()}</p>
           </div>
           
           <div className="group transition-transform hover:translate-y-[-2px]">
              <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-500/50 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                 <Banknote className="w-3 h-3" /> Cash Collection
              </p>
              <p className="text-3xl font-black text-emerald-500 dark:text-emerald-400 tabular-nums tracking-tighter">₹{totals.cash.toLocaleString()}</p>
           </div>
           
           <div className="group transition-transform hover:translate-y-[-2px]">
              <p className="text-[9px] font-black text-blue-600 dark:text-blue-500/50 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                 <CreditCard className="w-3 h-3" /> UPI / Online
              </p>
              <p className="text-3xl font-black text-blue-500 dark:text-blue-400 tabular-nums tracking-tighter">₹{totals.online.toLocaleString()}</p>
           </div>

           <div className="group transition-transform hover:translate-y-[-2px]">
              <p className="text-[9px] font-black text-purple-600 dark:text-purple-500/50 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                 <Gift className="w-3 h-3 text-purple-500/30" /> Complementary Giveaway
              </p>
              <p className="text-3xl font-black text-purple-500 dark:text-purple-400 tabular-nums tracking-tighter">₹{totals.complementary.toLocaleString()}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {activeOutlet === 'CAFE' && renderSection(
            "Cafe Operations", 
            <Coffee className="w-6 h-6 text-amber-400" />, 
            "bg-amber-500/20 border-amber-500/30 text-amber-400", 
            cafeTransactions,
            "bg-amber-500/5"
        )}

        {activeOutlet === 'CHAI' && renderSection(
            "Tea Joint Hub", 
            <CupSoda className="w-6 h-6 text-teal-400" />, 
            "bg-teal-500/20 border-teal-500/30 text-teal-400", 
            chaiTransactions,
            "bg-teal-500/5"
        )}
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
