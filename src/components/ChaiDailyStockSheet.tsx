"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ClipboardCheck, Search, Download, Loader2, CheckCircle2,
  AlertTriangle, TrendingDown, FileSpreadsheet, IndianRupee,
  Package, BarChart3, X, ChevronDown, ChevronUp
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────
export interface StockItem {
  menuItemId: string
  menuItemName: string
  category: string
  price: number
  itemId: string | null
  startStock: number
  endStock: number | null
  salesQty: number | null
  salesAmount: number | null
  alreadySubmitted: boolean
}

interface SheetRow extends StockItem {
  localEndStock: string
}

// ── Category Badge ──────────────────────────────────────────────────────────
function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    Beverages: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "Raw Material": "bg-amber-500/10 text-amber-500 border-amber-500/20",
    Snacks: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    Food: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    Uncategorized: "bg-muted/30 text-muted-foreground border-border",
  }
  const cls = colors[category] ?? "bg-purple-500/10 text-purple-500 border-purple-500/20"
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
        cls
      )}
    >
      {category}
    </span>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export function ChaiDailyStockSheet({
  initialItems,
  date,
  outletId,
  outletName,
}: {
  initialItems: StockItem[]
  date: string
  outletId: string
  outletName: string
}) {
  const [rows, setRows] = useState<SheetRow[]>(() =>
    initialItems.map((item) => ({
      ...item,
      localEndStock:
        item.endStock !== null ? String(item.endStock) : "",
    }))
  )
  const [search, setSearch] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [submitted, setSubmitted] = useState(
    initialItems.some((i) => i.alreadySubmitted)
  )
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: "asc" | "desc" } | null>(null)

  // ── Derived: parse each row's endStock ─────────────────────────────────
  const parsedRows = useMemo(() =>
    rows.map((r) => {
      const endStock = r.localEndStock === "" ? null : Number(r.localEndStock)
      const salesQty = endStock !== null ? r.startStock - endStock : null
      const salesAmount = salesQty !== null ? salesQty * r.price : null
      return { ...r, endStock, salesQty, salesAmount }
    }),
    [rows]
  )

  // ── Filter & sort ──────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let result = parsedRows
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.menuItemName.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      )
    }
    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const av = (a as any)[sortConfig.key] ?? ""
        const bv = (b as any)[sortConfig.key] ?? ""
        if (av < bv) return sortConfig.dir === "asc" ? -1 : 1
        if (av > bv) return sortConfig.dir === "asc" ? 1 : -1
        return 0
      })
    }
    return result
  }, [parsedRows, search, sortConfig])

  // ── Totals ─────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const filled = parsedRows.filter((r) => r.endStock !== null)
    return {
      filled: filled.length,
      total: parsedRows.length,
      totalSalesQty: filled.reduce((s, r) => s + (r.salesQty ?? 0), 0),
      totalSalesAmount: filled.reduce((s, r) => s + (r.salesAmount ?? 0), 0),
      negativeCount: filled.filter((r) => (r.salesQty ?? 0) < 0).length,
    }
  }, [parsedRows])

  // ── Handlers ───────────────────────────────────────────────────────────
  const updateEndStock = useCallback((menuItemId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.menuItemId === menuItemId ? { ...r, localEndStock: value } : r
      )
    )
  }, [])

  const toggleSort = (key: string) => {
    setSortConfig((prev) =>
      prev?.key === key
        ? prev.dir === "asc"
          ? { key, dir: "desc" }
          : null
        : { key, dir: "asc" }
    )
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortConfig?.key !== col) return <ChevronDown className="w-3 h-3 opacity-20" />
    return sortConfig.dir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-blue-400" />
    ) : (
      <ChevronDown className="w-3 h-3 text-blue-400" />
    )
  }

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const filled = parsedRows.filter((r) => r.endStock !== null)
    if (filled.length === 0) {
      toast.error("No ending stock entered", {
        description: "Please fill in at least one product's ending stock before submitting.",
      })
      return
    }

    const negativeItems = filled.filter((r) => (r.salesQty ?? 0) < 0)
    if (negativeItems.length > 0) {
      const names = negativeItems.map((r) => r.menuItemName).join(", ")
      toast.warning(`${negativeItems.length} item(s) have ending stock higher than starting stock`, {
        description: `${names} — this means sales are negative. Please double-check before submitting.`,
        duration: 6000,
      })
    }

    setIsSubmitting(true)
    try {
      const payload = {
        items: filled.map((r) => ({
          menuItemId: r.menuItemId,
          menuItemName: r.menuItemName,
          category: r.category,
          price: r.price,
          itemId: r.itemId,
          startStock: r.startStock,
          endStock: r.endStock as number,
        })),
      }

      const res = await fetch("/api/chai-daily-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Submission failed")
      }

      const result = await res.json()
      setSubmitted(true)

      toast.success(`Daily closing stock submitted! ₹${result.summary.totalSalesAmount.toFixed(2)} total revenue`, {
        description: `${result.summary.totalItems} products processed. Downloading Excel report...`,
        duration: 5000,
      })

      // Auto-download Excel
      await handleDownload()
    } catch (err) {
      toast.error("Submission failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Download Excel ────────────────────────────────────────────────────
  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/chai-daily-stock/export?date=${date}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Export failed")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `chai-daily-sales-${date}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success("Excel report downloaded!", { icon: <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> })
    } catch (err) {
      toast.error("Download failed", {
        description: err instanceof Error ? err.message : "Submit the closing stock first.",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-700">

      {/* ── STATS HEADER ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-border bg-foreground/5">
          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Package className="w-3 h-3" /> Products
          </div>
          <div className="text-2xl font-black text-foreground">
            {totals.filled}<span className="text-sm text-muted-foreground/40 font-bold">/{totals.total}</span>
          </div>
          <div className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mt-0.5">Filled</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-border bg-foreground/5">
          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <TrendingDown className="w-3 h-3" /> Units Sold
          </div>
          <div className="text-2xl font-black text-foreground">{totals.totalSalesQty}</div>
          <div className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mt-0.5">Today</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] col-span-2 md:col-span-1">
          <div className="text-[9px] font-black text-blue-500/70 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <IndianRupee className="w-3 h-3" /> Revenue
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            ₹{totals.totalSalesAmount.toFixed(2)}
          </div>
          <div className="text-[9px] font-bold text-blue-500/40 uppercase tracking-wider mt-0.5">Estimated</div>
        </div>
        <div className={cn(
          "glass-panel p-5 rounded-2xl border",
          totals.negativeCount > 0
            ? "border-red-500/20 bg-red-500/[0.04]"
            : "border-emerald-500/20 bg-emerald-500/[0.04]"
        )}>
          <div className={cn(
            "text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5",
            totals.negativeCount > 0 ? "text-red-500/70" : "text-emerald-500/70"
          )}>
            {totals.negativeCount > 0 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            Alerts
          </div>
          <div className={cn(
            "text-2xl font-black",
            totals.negativeCount > 0 ? "text-red-500" : "text-emerald-500"
          )}>{totals.negativeCount}</div>
          <div className={cn(
            "text-[9px] font-bold uppercase tracking-wider mt-0.5",
            totals.negativeCount > 0 ? "text-red-500/40" : "text-emerald-500/40"
          )}>
            {totals.negativeCount > 0 ? "Negative Sales" : "All Good"}
          </div>
        </div>
      </div>

      {/* ── STATUS BANNER ── */}
      {submitted && (
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-black text-emerald-500 uppercase tracking-tight">Today's closing stock has been submitted</p>
            <p className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest">You can re-submit to update any figures</p>
          </div>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            variant="ghost"
            size="sm"
            className="h-9 px-4 text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-xl shrink-0"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
            Download Excel
          </Button>
        </div>
      )}

      {/* ── SEARCH BAR ── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search products or categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-12 rounded-2xl border-border/50 bg-foreground/5 font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── SPREADSHEET TABLE ── */}
      <div className="glass-panel rounded-[2rem] border border-border bg-foreground/5 overflow-hidden shadow-xl">
        {/* Table header */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-foreground/5">
                <th className="text-left px-5 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest w-8">#</th>
                <th
                  className="text-left px-4 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => toggleSort("menuItemName")}
                >
                  <div className="flex items-center gap-1.5">Product <SortIcon col="menuItemName" /></div>
                </th>
                <th
                  className="text-left px-4 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => toggleSort("category")}
                >
                  <div className="flex items-center gap-1.5">Category <SortIcon col="category" /></div>
                </th>
                <th className="text-right px-4 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                  Starting Stock
                </th>
                <th className="text-center px-4 py-4 text-[9px] font-black text-blue-500 uppercase tracking-widest">
                  Ending Stock <span className="text-blue-400/50">(Enter)</span>
                </th>
                <th
                  className="text-right px-4 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => toggleSort("salesQty")}
                >
                  <div className="flex items-center justify-end gap-1.5">Today's Sales <SortIcon col="salesQty" /></div>
                </th>
                <th
                  className="text-right px-5 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => toggleSort("salesAmount")}
                >
                  <div className="flex items-center justify-end gap-1.5">Amount (₹) <SortIcon col="salesAmount" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground/30">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No products found</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isNegative = row.salesQty !== null && row.salesQty < 0
                  const hasValue = row.endStock !== null
                  const isZeroSales = hasValue && row.salesQty === 0

                  return (
                    <tr
                      key={row.menuItemId}
                      className={cn(
                        "group transition-all",
                        isNegative
                          ? "bg-red-500/5 hover:bg-red-500/10"
                          : "hover:bg-foreground/5"
                      )}
                    >
                      {/* # */}
                      <td className="px-5 py-3.5 text-[10px] font-black text-muted-foreground/30">
                        {idx + 1}
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-black text-foreground uppercase tracking-tight group-hover:text-blue-500 transition-colors">
                          {row.menuItemName}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <CategoryBadge category={row.category} />
                      </td>

                      {/* Starting Stock */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-black text-foreground/70 tabular-nums">
                          {row.startStock}
                        </span>
                      </td>

                      {/* Ending Stock INPUT */}
                      <td className="px-4 py-2">
                        <div className="flex justify-center">
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={row.localEndStock}
                            onChange={(e) => updateEndStock(row.menuItemId, e.target.value)}
                            className={cn(
                              "h-10 w-24 text-center font-black text-base rounded-xl border-2 transition-all tabular-nums",
                              isNegative
                                ? "border-red-500/50 text-red-500 bg-red-500/5 focus:ring-red-500/20"
                                : hasValue
                                ? "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 focus:ring-blue-500/20"
                                : "border-border/50 bg-foreground/5 focus:border-blue-500/50 focus:ring-blue-500/20"
                            )}
                          />
                        </div>
                      </td>

                      {/* Today's Sales */}
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {row.salesQty !== null ? (
                          <span className={cn(
                            "text-sm font-black",
                            isNegative
                              ? "text-red-500"
                              : isZeroSales
                              ? "text-muted-foreground/40"
                              : "text-emerald-500"
                          )}>
                            {isNegative ? "" : "+"}{row.salesQty}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/20 text-sm font-black">—</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        {row.salesAmount !== null ? (
                          <span className={cn(
                            "text-sm font-black",
                            isNegative
                              ? "text-red-500"
                              : isZeroSales
                              ? "text-muted-foreground/40"
                              : "text-foreground"
                          )}>
                            ₹{row.salesAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/20 text-sm font-black">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>

            {/* ── TOTALS FOOTER ── */}
            <tfoot>
              <tr className="border-t-2 border-blue-500/20 bg-blue-500/[0.04]">
                <td colSpan={3} className="px-5 py-4">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Day Total
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-sm font-black text-foreground/60 tabular-nums">
                    {parsedRows.filter(r => r.endStock !== null).reduce((s, r) => s + r.startStock, 0)}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-sm font-black text-foreground/60 tabular-nums">
                    {parsedRows.filter(r => r.endStock !== null).reduce((s, r) => s + (r.endStock ?? 0), 0)}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-lg font-black text-emerald-500 tabular-nums">
                    +{totals.totalSalesQty}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">
                    ₹{totals.totalSalesAmount.toFixed(2)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── SUBMIT SECTION ── */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        {submitted && (
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            variant="outline"
            className="h-16 px-8 rounded-[2rem] border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-black uppercase tracking-widest transition-all active:scale-95"
          >
            {isDownloading
              ? <><Loader2 className="w-5 h-5 mr-3 animate-spin" />Generating...</>
              : <><FileSpreadsheet className="w-5 h-5 mr-3" />Download Today's Report</>
            }
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || totals.filled === 0}
          className={cn(
            "flex-1 h-16 rounded-[2rem] font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-xl",
            submitted
              ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
              : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-blue-500/30"
          )}
        >
          {isSubmitting ? (
            <><Loader2 className="w-6 h-6 mr-3 animate-spin" />Submitting...</>
          ) : (
            <>
              <ClipboardCheck className="w-6 h-6 mr-3" />
              {submitted ? "Re-Submit & Update Closing Stock" : `Finalise Daily Closing Stock (${totals.filled} items)`}
            </>
          )}
        </Button>
      </div>

      {totals.negativeCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-[11px] font-black text-red-500 uppercase tracking-wide">
            {totals.negativeCount} product(s) have ending stock higher than starting stock (negative sales).
            Double-check before submitting.
          </p>
        </div>
      )}
    </div>
  )
}
