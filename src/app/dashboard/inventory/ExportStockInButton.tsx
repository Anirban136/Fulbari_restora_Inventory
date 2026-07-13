"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Loader2, Calendar, X, ClipboardList } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { generateInventoryReportPDF } from "@/lib/report-generator"

export function ExportStockInButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Default date calculations
  const getThirtyDaysAgo = () => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split("T")[0]
  }

  const getToday = () => {
    return new Date().toISOString().split("T")[0]
  }

  const [startDate, setStartDate] = useState(getThirtyDaysAgo())
  const [endDate, setEndDate] = useState(getToday())
  
  // Transaction type filter states
  const [types, setTypes] = useState({
    STOCK_IN: true,
    DISPATCH: true,
    WASTE: true,
    ADJUSTMENT: true,
    CONSUMPTION: true,
    REVERSAL: true,
  })

  const toggleType = (key: keyof typeof types) => {
    setTypes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault()

    // Extract active transaction types
    const activeTypes = Object.entries(types)
      .filter(([_, active]) => active)
      .map(([type]) => type)

    if (activeTypes.length === 0) {
      toast.error("Please select at least one transaction type to export.")
      return
    }

    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (startDate) queryParams.set("start", startDate)
      if (endDate) queryParams.set("end", endDate)
      queryParams.set("types", activeTypes.join(","))

      const response = await fetch(`/api/inventory/export-stock-in?${queryParams.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Generate and save the PDF report
      await generateInventoryReportPDF(data, startDate || "All-Time", endDate || "All-Time")

      toast.success("PDF ledger report downloaded successfully!", {
        icon: <FileText className="w-5 h-5 text-emerald-500" />,
      })
      setOpen(false)
    } catch (error) {
      console.error("Export Ledger Error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to export PDF ledger report.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="h-12 px-6 rounded-2xl md:rounded-[2rem] bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-[0_15px_30px_-10px_rgba(16,185,129,0.5)] transition-all active:scale-95 gap-2.5 uppercase tracking-wider text-[11px] sm:w-auto w-full shrink-0">
          <FileText className="w-5 h-5" />
          Export PDF Report
        </Button>
      } />

      <DialogContent className="sm:max-w-[500px] w-[95vw] lg:w-full bg-background/95 backdrop-blur-3xl border-border rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl p-0 overflow-hidden max-h-[92vh] flex flex-col" showCloseButton={false}>
        {/* Explicit Close Button */}
        <DialogClose render={
          <button className="absolute top-8 right-8 p-3 rounded-2xl bg-foreground/5 border border-border text-foreground/40 hover:text-foreground transition-all active:scale-90 z-50">
            <X className="w-5 h-5" />
          </button>
        } />
        
        {/* Glowing Decorator */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-[80px] -z-10"></div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar-premium p-6 sm:p-10 flex flex-col">
          <DialogHeader className="mb-6">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center mb-6 border border-emerald-500/20 shadow-inner">
              <ClipboardList className="w-8 h-8 text-emerald-500" />
            </div>
            <DialogTitle className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none">Export PDF Ledger</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium mt-4 tracking-tight leading-relaxed text-sm">
              Filter the master ledger by date range and activities to download a detailed PDF audit report.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExport} className="space-y-6 sm:space-y-8">
            {/* Date Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <Label htmlFor="startDate" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] ml-1">From Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-12 bg-foreground/[0.03] border-border text-foreground rounded-2xl pl-4 pr-4 text-xs font-bold focus-visible:ring-emerald-500/40 focus:border-emerald-500/50 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="endDate" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] ml-1">To Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-12 bg-foreground/[0.03] border-border text-foreground rounded-2xl pl-4 pr-4 text-xs font-bold focus-visible:ring-emerald-500/40 focus:border-emerald-500/50 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* Checkbox Filtering */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] ml-1">Activity Types</Label>
              <div className="bg-foreground/[0.02] border border-border/50 rounded-2xl p-5 space-y-3.5 shadow-inner">
                
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={types.STOCK_IN}
                      onChange={() => toggleType("STOCK_IN")}
                      className="w-4 h-4 rounded border-border text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 bg-foreground/[0.03] cursor-pointer accent-emerald-500"
                    />
                    <span className="text-[10px] font-black text-foreground/80 group-hover:text-foreground uppercase tracking-wider transition-colors">
                      Stock In
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={types.DISPATCH}
                      onChange={() => toggleType("DISPATCH")}
                      className="w-4 h-4 rounded border-border text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 bg-foreground/[0.03] cursor-pointer accent-emerald-500"
                    />
                    <span className="text-[10px] font-black text-foreground/80 group-hover:text-foreground uppercase tracking-wider transition-colors">
                      Dispatches
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={types.WASTE}
                      onChange={() => toggleType("WASTE")}
                      className="w-4 h-4 rounded border-border text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 bg-foreground/[0.03] cursor-pointer accent-emerald-500"
                    />
                    <span className="text-[10px] font-black text-foreground/80 group-hover:text-foreground uppercase tracking-wider transition-colors">
                      Waste / Spoilage
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={types.ADJUSTMENT}
                      onChange={() => toggleType("ADJUSTMENT")}
                      className="w-4 h-4 rounded border-border text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 bg-foreground/[0.03] cursor-pointer accent-emerald-500"
                    />
                    <span className="text-[10px] font-black text-foreground/80 group-hover:text-foreground uppercase tracking-wider transition-colors">
                      Adjustments
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={types.CONSUMPTION}
                      onChange={() => toggleType("CONSUMPTION")}
                      className="w-4 h-4 rounded border-border text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 bg-foreground/[0.03] cursor-pointer accent-emerald-500"
                    />
                    <span className="text-[10px] font-black text-foreground/80 group-hover:text-foreground uppercase tracking-wider transition-colors">
                      POS Sales (Qty)
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={types.REVERSAL}
                      onChange={() => toggleType("REVERSAL")}
                      className="w-4 h-4 rounded border-border text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 bg-foreground/[0.03] cursor-pointer accent-emerald-500"
                    />
                    <span className="text-[10px] font-black text-foreground/80 group-hover:text-foreground uppercase tracking-wider transition-colors">
                      Reversals
                    </span>
                  </label>
                </div>

              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-2">
              <DialogClose render={
                <Button type="button" variant="outline" className="flex-1 h-14 rounded-2xl border-border bg-foreground/5 hover:bg-foreground/10 text-foreground font-black text-xs uppercase tracking-widest transition-all">
                  Cancel
                </Button>
              } />
              <Button
                type="submit"
                disabled={loading}
                className="flex-[2] h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-[0_15px_30px_-10px_rgba(16,185,129,0.5)] transition-all active:scale-95 gap-2.5 uppercase tracking-widest text-xs"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
                {loading ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
