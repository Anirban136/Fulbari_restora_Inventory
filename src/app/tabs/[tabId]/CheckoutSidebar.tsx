"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Banknote, CreditCard, SplitSquareHorizontal, Receipt, Printer, CheckCircle2, Gift } from "lucide-react"
import { PrintReceiptButton } from "@/components/PrintReceiptButton"
import { toast } from "sonner"
import { closeTab, assignTokenToTab } from "./actions"

interface CheckoutSidebarProps {
  tabId: string
  totalAmount: number
  totalPaid: number
  isCafe: boolean
  outletName: string
  tokenNumber: number | null
  tableName: string | null
  customerName: string | null
  items: any[]
}

const BILL_KEY = (tabId: string) => `bill_generated_${tabId}`

export function CheckoutSidebar({
  tabId, totalAmount, totalPaid, isCafe,
  outletName, tokenNumber, tableName, customerName, items
}: CheckoutSidebarProps) {
  // Initialise from localStorage so state survives back-navigation
  const [billGenerated, setBillGenerated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem(BILL_KEY(tabId)) === "true"
  })

  // Keep localStorage in sync whenever the state changes
  useEffect(() => {
    if (billGenerated) {
      localStorage.setItem(BILL_KEY(tabId), "true")
    } else {
      localStorage.removeItem(BILL_KEY(tabId))
    }
  }, [billGenerated, tabId])

  const [paymentMode, setPaymentMode] = useState<"CASH" | "ONLINE" | "SPLIT" | "COMPLEMENTARY">("CASH")
  const [isHold, setIsHold] = useState(false)
  const [splitCash, setSplitCash] = useState<string>("")
  const [splitOnline, setSplitOnline] = useState<string>("")

  const unpaidItems = items.filter(item => !item.isPaid)
  const dueAmount = Math.max(0, totalAmount - totalPaid)

  const handleCashChange = (val: string) => {
    setSplitCash(val)
    const cash = parseFloat(val) || 0
    setSplitOnline((dueAmount - cash).toFixed(2))
  }

  const isSplitValid = paymentMode !== "SPLIT" || (parseFloat(splitCash) + parseFloat(splitOnline) === dueAmount)

  // Helper that also clears storage (used for "Edit Order" button)
  const clearBill = () => {
    localStorage.removeItem(BILL_KEY(tabId))
    setBillGenerated(false)
  }

  return (
    <div className="p-3 sm:p-8 bg-background/80 dark:bg-card border-t lg:border-t-0 border-border z-10 backdrop-blur-xl shrink-0">
      <div className="flex justify-between items-center mb-4 sm:mb-8">
        <span className="text-muted-foreground text-xs sm:text-sm font-bold tracking-widest uppercase">Total Due</span>
        <span className="text-3xl sm:text-5xl font-black text-foreground tracking-tighter">
          ₹{dueAmount.toFixed(2)}
        </span>
      </div>

      {!billGenerated ? (
        <Button 
          onClick={async () => {
             // Assign token in DB first (especially for kitchen copy)
             await assignTokenToTab(tabId)
             setBillGenerated(true)
          }}
          disabled={items.length === 0}
          className={`w-full h-12 sm:h-16 text-sm sm:text-xl font-black tracking-widest uppercase ${isCafe ? "bg-orange-600 hover:bg-orange-500 shadow-[0_0_40px_-5px_rgba(249,115,22,0.5)]" : "bg-sky-600 hover:bg-sky-500 shadow-[0_0_40px_-5px_rgba(14,165,233,0.5)]"} text-white rounded-xl sm:rounded-2xl transition-all active:scale-[0.98] group`}
        >
          <Receipt className="w-5 h-5 sm:w-6 sm:h-6 mr-2 group-hover:rotate-12 transition-transform" />
          Generate Bill
        </Button>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Print Options */}
          <div className="bg-muted/50 rounded-2xl p-4 border border-border shadow-inner">
            <div className="flex items-center gap-2 mb-3">
              <Printer className={`w-4 h-4 ${isCafe ? "text-orange-400" : "text-sky-400"}`} />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Step 1: Print Receipts</span>
            </div>
            <PrintReceiptButton
              outletName={outletName}
              tokenNumber={tokenNumber}
              tableName={tableName}
              customerName={customerName}
              tabId={tabId}
              items={unpaidItems}
              totalAmount={dueAmount}
              paymentMode="UNPAID"
              closedAt={null}
              accentColor={isCafe ? "amber" : "sky"}
              isSidebar={true}
            />
          </div>

          <form action={closeTab} className="space-y-6">
            <input type="hidden" name="tabId" value={tabId} />
            <input type="hidden" name="isHold" value={isHold ? "true" : "false"} />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Step 2: Payment Mode
                </label>
                <button 
                  type="button" 
                  onClick={() => clearBill()}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  Edit Order
                </button>
              </div>
              <input type="hidden" name="paymentMode" value={paymentMode} />
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setPaymentMode("CASH")} className="group outline-none w-full">
                  <div className={`flex flex-col items-center justify-center gap-2 py-2 sm:py-4 rounded-xl border-2 transition-all text-[10px] sm:text-xs font-bold ${paymentMode === "CASH" ? (isCafe ? "border-orange-500 bg-orange-500/10 text-orange-400 shadow-[0_0_20px_-5px_#f97316]" : "border-sky-500 bg-sky-500/10 text-sky-400 shadow-[0_0_20px_-5px_#0ea5e9]") : "border-border bg-foreground/5 text-muted-foreground group-hover:bg-foreground/10"}`}>
                    <Banknote className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                    CASH
                  </div>
                </button>
                <button type="button" onClick={() => setPaymentMode("ONLINE")} className="group outline-none w-full">
                  <div className={`flex flex-col items-center justify-center gap-2 py-2 sm:py-4 rounded-xl border-2 transition-all text-[10px] sm:text-xs text-center leading-tight font-bold ${paymentMode === "ONLINE" ? (isCafe ? "border-orange-500 bg-orange-500/10 text-orange-400 shadow-[0_0_20px_-5px_#f97316]" : "border-sky-500 bg-sky-500/10 text-sky-400 shadow-[0_0_20px_-5px_#0ea5e9]") : "border-border bg-foreground/5 text-muted-foreground group-hover:bg-foreground/10"}`}>
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                    UPI/CARD
                  </div>
                </button>
                <button type="button" onClick={() => setPaymentMode("SPLIT")} className="group outline-none w-full">
                  <div className={`flex flex-col items-center justify-center gap-2 py-2 sm:py-4 rounded-xl border-2 transition-all text-[10px] sm:text-xs font-bold ${paymentMode === "SPLIT" ? (isCafe ? "border-orange-500 bg-orange-500/10 text-orange-400 shadow-[0_0_20px_-5px_#f97316]" : "border-sky-500 bg-sky-500/10 text-sky-400 shadow-[0_0_20px_-5px_#0ea5e9]") : "border-border bg-foreground/5 text-muted-foreground group-hover:bg-foreground/10"}`}>
                    <SplitSquareHorizontal className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                    SPLIT
                  </div>
                </button>
                <button type="button" onClick={() => setPaymentMode("COMPLEMENTARY")} className="group outline-none w-full">
                  <div className={`flex flex-col items-center justify-center gap-2 py-2 sm:py-4 rounded-xl border-2 transition-all text-[10px] sm:text-xs font-bold ${paymentMode === "COMPLEMENTARY" ? "border-purple-500 bg-purple-500/10 text-purple-400 shadow-[0_0_20px_-5px_#a855f7]" : "border-border bg-foreground/5 text-muted-foreground group-hover:bg-foreground/10"}`}>
                    <Gift className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                    COMPLEMENTARY
                  </div>
                </button>
              </div>

              {paymentMode === "SPLIT" && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 pt-2">
                   <input type="hidden" name="splitCashAmount" value={splitCash} />
                   <input type="hidden" name="splitOnlineAmount" value={splitOnline} />
                   <div className="flex-1 space-y-1">
                     <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-2">Cash Amount</label>
                     <Input type="number" step="0.01" max={totalAmount} value={splitCash} onChange={e => handleCashChange(e.target.value)} placeholder="0.00" className="h-12 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/30 rounded-xl" required={paymentMode === "SPLIT"} />
                   </div>
                   <div className="flex-1 space-y-1">
                     <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-2">UPI / Card Amount</label>
                     <Input type="number" step="0.01" value={splitOnline} className="h-12 bg-foreground/[0.03] border-transparent text-muted-foreground/60 rounded-xl pointer-events-none" readOnly required={paymentMode === "SPLIT"} />
                   </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                type="submit" 
                onClick={() => {
                  setIsHold(true)
                  toast.success("Payment Successful - Order On Hold")
                }}
                disabled={!isSplitValid || dueAmount <= 0}
                className={`h-12 sm:h-16 text-[10px] sm:text-base font-black tracking-widest uppercase bg-amber-600 hover:bg-amber-500 shadow-[0_0_40px_-5px_rgba(245,158,11,0.5)] text-white rounded-xl sm:rounded-2xl transition-all active:scale-[0.98] ${(!isSplitValid || dueAmount <= 0) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Pay & Hold
              </Button>
              <Button 
                type="submit" 
                onClick={() => {
                  setIsHold(false)
                  toast.success("Payment Successful - Tab Closed")
                }}
                disabled={!isSplitValid || dueAmount <= 0}
                className={`h-12 sm:h-16 text-[10px] sm:text-base font-black tracking-widest uppercase bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_40px_-5px_rgba(16,185,129,0.5)] text-white rounded-xl sm:rounded-2xl transition-all active:scale-[0.98] ${(!isSplitValid || dueAmount <= 0) ? "opacity-50 cursor-not-allowed" : "animate-pulse"}`}
              >
                Pay & Close
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
