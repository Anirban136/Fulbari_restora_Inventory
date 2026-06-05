"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Calendar } from "lucide-react"

export function DateRangePicker({ 
  initialStart, 
  initialEnd 
}: { 
  initialStart?: string, 
  initialEnd?: string 
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(type, value)
    } else {
      params.delete(type)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row items-end gap-3 bg-foreground/5 p-4 rounded-2xl border border-foreground/10 backdrop-blur-md">
      <div className="space-y-1.5 flex-1 w-full">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">From Date</label>
        <div className="relative">
          <input 
            type="date" 
            value={initialStart || ""} 
            onChange={(e) => handleDateChange('start', e.target.value)}
            className="w-full bg-background/50 border border-border rounded-xl px-4 h-10 text-xs font-bold text-foreground focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
          />
        </div>
      </div>

      <div className="space-y-1.5 flex-1 w-full">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">To Date</label>
        <div className="relative">
          <input 
            type="date" 
            value={initialEnd || ""} 
            onChange={(e) => handleDateChange('end', e.target.value)}
            className="w-full bg-background/50 border border-border rounded-xl px-4 h-10 text-xs font-bold text-foreground focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
          />
        </div>
      </div>
      
      <button 
        onClick={() => {
           const params = new URLSearchParams(searchParams.toString())
           params.delete('start')
           params.delete('end')
           router.push(`${pathname}?${params.toString()}`)
        }}
        className="h-10 px-4 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 text-[10px] font-black uppercase tracking-widest transition-all"
      >
        Reset
      </button>
    </div>
  )
}
