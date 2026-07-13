"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function ExportStockInButton() {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/inventory/export-stock-in")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      
      const dateStr = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }).replace(/\//g, "-")
      a.download = `inventory-stock-in-report-${dateStr}.xlsx`
      
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success("Stock-In Excel report downloaded successfully!", {
        icon: <FileSpreadsheet className="w-5 h-5 text-emerald-500" />,
      })
    } catch (error) {
      console.error("Export Stock-In Error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to export Stock-In report.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      className="h-12 px-6 rounded-2xl md:rounded-[2rem] bg-blue-500 hover:bg-blue-400 text-white font-black shadow-[0_15px_30px_-10px_rgba(59,130,246,0.5)] transition-all active:scale-95 gap-2.5 uppercase tracking-wider text-[11px] sm:w-auto w-full shrink-0"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <FileSpreadsheet className="w-5 h-5" />
      )}
      {loading ? "Exporting..." : "Export Stock-In"}
    </Button>
  )
}
