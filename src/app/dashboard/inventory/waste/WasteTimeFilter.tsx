"use client"

import { useRouter, useSearchParams } from "next/navigation"

export function WasteTimeFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentFilter = searchParams.get("filter") || "all"

  return (
    <select
      value={currentFilter}
      onChange={(e) => {
        const val = e.target.value
        router.push(val === "all" ? "/dashboard/inventory/waste" : `/dashboard/inventory/waste?filter=${val}`)
      }}
      className="h-8 px-3 rounded-lg border border-foreground/10 bg-black/40 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-red-500/50 shadow-inner"
    >
      <option value="all" className="bg-background text-foreground">All Time</option>
      <option value="today" className="bg-background text-foreground">Today</option>
      <option value="7d" className="bg-background text-foreground">Last 7 Days</option>
      <option value="30d" className="bg-background text-foreground">Last 30 Days</option>
    </select>
  )
}
