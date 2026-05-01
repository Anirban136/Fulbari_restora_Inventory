"use client"

import { useState, useMemo } from "react"
import { 
  StoreIcon, 
  Search, 
  History, 
  LayoutGrid, 
  PlusCircle,
  Filter,
  Package,
  AlertCircle,
  ChevronRight,
  ArrowRight
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AdjustStockForm } from "./AdjustStockForm"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function OutletStockClient({ 
  outlets, 
  recentConsumptions 
}: { 
  outlets: any[], 
  recentConsumptions: any[] 
}) {
  const [selectedType, setSelectedType] = useState<string>(outlets[0]?.type || "ALL")
  const [selectedOutletId, setSelectedOutletId] = useState(outlets[0]?.id || "")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)

  // Group outlets by type
  const groupedOutlets = useMemo(() => {
    const groups: Record<string, any[]> = {}
    outlets.forEach(o => {
      const type = o.type?.toUpperCase() || "UNCATEGORIZED"
      if (!groups[type]) groups[type] = []
      groups[type].push(o)
    })
    return groups
  }, [outlets])

  const types = Object.keys(groupedOutlets)

  // Get outlets for selected type
  const outletsForType = selectedType === "ALL" ? outlets : (groupedOutlets[selectedType] || [])

  // Currently selected outlet
  const selectedOutlet = outlets.find(o => o.id === selectedOutletId)

  // Handle type change
  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    const outletsInType = groupedOutlets[type]
    if (outletsInType && outletsInType.length > 0) {
      setSelectedOutletId(outletsInType[0].id)
    }
  }

  // Get categories for current outlet
  const categories = useMemo(() => {
    if (!selectedOutlet) return []
    const cats = new Set(selectedOutlet.Stock.map((s: any) => s.Item.category || "Uncategorized"))
    return Array.from(cats).sort()
  }, [selectedOutlet])

  // Filtered stock
  const filteredStock = useMemo(() => {
    if (!selectedOutlet) return []
    return selectedOutlet.Stock.filter((stock: any) => {
      const matchesSearch = stock.Item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "ALL" || (stock.Item.category || "Uncategorized") === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [selectedOutlet, searchQuery, selectedCategory])

  return (
    <div className="space-y-6 pb-24 max-w-[1400px] mx-auto animate-in fade-in duration-700">
      {/* 1. HEADER SECTION */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 glass-panel p-6 lg:p-8 rounded-[2rem] border border-white/5 bg-white/[0.01] backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400/80">Inventory System</span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-black text-foreground tracking-tighter flex items-center gap-4">
            Outlet Stock
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] rounded-lg border border-emerald-500/20">
              Live
            </span>
          </h1>
          <p className="text-muted-foreground mt-2 font-medium text-xs lg:text-sm tracking-wide opacity-60">
            Monitor and manage real-time inventory across all business units.
          </p>
        </div>

        <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center justify-center gap-3 px-8 py-5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-[0_20px_50px_-10px_rgba(168,85,247,0.4)] transition-all active:scale-95 group relative overflow-hidden w-full lg:w-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <PlusCircle className="w-5 h-5 transition-transform group-hover:rotate-90 duration-500" />
              Adjust Stock
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-3xl border-border/50 p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
            <AdjustStockForm 
              outlets={outlets} 
              onSuccess={() => setIsAdjustOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </header>

      {/* 2. NAVIGATION & FILTERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Type Selection Tabs */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Business Type</span>
            <nav className="flex items-center gap-2 p-1.5 bg-muted/50 rounded-[1.5rem] border border-border backdrop-blur-md overflow-x-auto no-scrollbar">
              {types.map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={cn(
                    "px-6 py-3.5 rounded-[1.2rem] text-[10px] lg:text-[11px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap flex items-center gap-3 relative group",
                    selectedType === type 
                      ? "text-white bg-purple-600 shadow-lg shadow-purple-900/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  {type}
                </button>
              ))}
            </nav>
          </div>

          {/* Outlet Selection (if multiple) */}
          {outletsForType.length > 1 && (
            <div className="flex flex-col gap-4 animate-in slide-in-from-top-2 duration-500">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Select Location</span>
              <div className="flex flex-wrap gap-2">
                {outletsForType.map((outlet) => (
                  <button
                    key={outlet.id}
                    onClick={() => setSelectedOutletId(outlet.id)}
                    className={cn(
                      "px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                      selectedOutletId === outlet.id
                        ? "bg-purple-500/10 border-purple-500/50 text-purple-400"
                        : "bg-background border-border text-muted-foreground hover:border-muted-foreground/30"
                    )}
                  >
                    {outlet.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Global Search & Category Filter */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Quick Search</span>
          <div className="glass-panel p-4 rounded-[1.5rem] border border-border bg-muted/20 space-y-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-purple-400 transition-colors" />
              <Input 
                placeholder="Search items..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 bg-background/50 border-border/50 rounded-xl h-12 text-sm font-medium focus-visible:ring-purple-500/50"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-12 bg-background/50 border-border/50 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-purple-400" />
                  <SelectValue placeholder="Category" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-xl border-border rounded-xl">
                <SelectItem value="ALL" className="text-[10px] font-black uppercase tracking-widest">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="text-[10px] font-black uppercase tracking-widest">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3. STOCK DISPLAY */}
      <main className="animate-in slide-in-from-bottom-4 duration-700">
        {selectedOutlet ? (
          <section className="glass-panel rounded-[2rem] overflow-hidden flex flex-col border border-border bg-card/30 shadow-xl">
            {/* Table Header / Stats */}
            <div className="bg-muted/40 px-6 lg:px-10 py-6 border-b border-border flex flex-col sm:row sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-md">
              <div className="flex items-center gap-4">
                 <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                    <LayoutGrid className="w-6 h-6 text-purple-400" />
                 </div>
                 <div>
                    <h2 className="text-xl lg:text-2xl font-black text-foreground tracking-tight uppercase flex items-center gap-2">
                      {selectedOutlet.name}
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                      <span className="text-purple-400 text-sm">{selectedCategory === "ALL" ? "All Items" : selectedCategory}</span>
                    </h2>
                    <p className="text-[10px] text-muted-foreground font-black tracking-[0.2em] uppercase opacity-60">
                      {selectedOutlet.type} • {filteredStock.length} Items Found
                    </p>
                 </div>
              </div>
              
              <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-border pt-4 sm:pt-0">
                <div className="text-right">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-0.5 opacity-60">Total Value</span>
                  <span className="text-lg font-black text-foreground">₹---</span>
                </div>
                <div className="h-8 w-[1px] bg-border hidden sm:block"></div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-0.5 opacity-60">Alerts</span>
                  <span className="text-lg font-black text-red-400">
                    {filteredStock.filter((s: any) => s.quantity <= (s.Item.minStock || 0)).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Responsive Table / List */}
            <div className="p-0 overflow-auto custom-scrollbar-premium max-h-[700px]">
              {/* Desktop View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-background/90 backdrop-blur-3xl border-b border-border">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="font-black text-muted-foreground uppercase tracking-[0.3em] text-[10px] h-14 px-10">Item Details</TableHead>
                      <TableHead className="font-black text-muted-foreground uppercase tracking-[0.3em] text-[10px] h-14 px-10">Category</TableHead>
                      <TableHead className="font-black text-muted-foreground uppercase tracking-[0.3em] text-[10px] h-14 px-10 text-right">Current Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStock.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={3} className="text-center py-32">
                          <div className="flex flex-col items-center justify-center space-y-4 opacity-10">
                            <Search className="w-16 h-16" />
                            <p className="font-black uppercase tracking-[0.5em] text-xs">No Items Found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStock.map((stock: any) => (
                        <TableRow key={stock.id} className="border-b border-border/40 hover:bg-white/[0.02] transition-colors group/row">
                          <TableCell className="px-10 py-6">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                stock.quantity <= (stock.Item.minStock || 0) ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                              )}></div>
                              <span className="text-sm font-black text-foreground/90 uppercase tracking-tight group-hover/row:text-purple-400 transition-colors">
                                {stock.Item.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-10 py-6">
                            <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest bg-foreground/5 px-3 py-1 rounded-full border border-border">
                              {stock.Item.category || "General"}
                            </span>
                          </TableCell>
                          <TableCell className="px-10 py-6 text-right">
                             <div className={cn(
                               "inline-flex flex-col items-end px-5 py-2.5 rounded-2xl font-black tracking-widest transition-all",
                               stock.quantity <= (stock.Item.minStock || 0) 
                                 ? "bg-red-500/10 border border-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.1)]" 
                                 : "bg-background/50 border border-border text-foreground group-hover/row:border-purple-500/30"
                             )}>
                               <span className="text-base font-black tracking-tighter">
                                 {stock.quantity} <span className="text-[10px] ml-1 opacity-50 uppercase">{stock.Item.piecesPerBox ? 'pcs' : stock.Item.unit}</span>
                               </span>
                               {stock.Item.piecesPerBox && (
                                 <span className="text-[9px] opacity-40 font-bold uppercase tracking-tighter mt-0.5">
                                   ({(stock.quantity / stock.Item.piecesPerBox).toFixed(1)} {stock.Item.unit})
                                 </span>
                               )}
                             </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden flex flex-col divide-y divide-border">
                {filteredStock.length === 0 ? (
                  <div className="text-center py-20 opacity-20">
                    <Search className="w-12 h-12 mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest text-[10px]">Empty Stock</p>
                  </div>
                ) : (
                  filteredStock.map((stock: any) => (
                    <div key={stock.id} className="p-5 flex items-center justify-between group active:bg-muted/50 transition-colors">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            stock.quantity <= (stock.Item.minStock || 0) ? "bg-red-500" : "bg-emerald-500"
                          )}></div>
                          <span className="text-xs font-black uppercase text-foreground leading-none">{stock.Item.name}</span>
                        </div>
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded border border-border w-fit">
                          {stock.Item.category || "General"}
                        </span>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className={cn(
                          "text-sm font-black tracking-tighter",
                          stock.quantity <= (stock.Item.minStock || 0) ? "text-red-400" : "text-foreground"
                        )}>
                          {stock.quantity} {stock.Item.piecesPerBox ? 'pcs' : stock.Item.unit}
                        </span>
                        {stock.Item.piecesPerBox && (
                          <span className="text-[8px] text-muted-foreground/50 font-bold">
                            {(stock.quantity / stock.Item.piecesPerBox).toFixed(1)} {stock.Item.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : (
          <div className="glass-panel text-center py-40 rounded-[2.5rem] border border-dashed border-border opacity-30 flex flex-col items-center justify-center">
             <div className="p-6 bg-muted rounded-full mb-6">
                <StoreIcon className="w-12 h-12 text-muted-foreground" />
             </div>
             <p className="font-black uppercase tracking-[0.5em] text-sm">Initializing Inventory Engine...</p>
          </div>
        )}
      </main>

      {/* 4. RECENT ACTIVITY (FOOTER) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-4">
           <div className="flex items-center gap-3">
             <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
               <History className="w-5 h-5 text-purple-400" />
             </div>
             <div>
               <h3 className="text-xl font-black text-foreground tracking-tight uppercase">Recent Movement</h3>
               <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Latest stock adjustments & consumption</p>
             </div>
           </div>
           <div className="h-px flex-1 bg-gradient-to-r from-border via-border/20 to-transparent mx-6 hidden sm:block"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentConsumptions.length === 0 ? (
            <div className="col-span-full py-12 text-center glass-panel rounded-[1.5rem] border border-dashed border-border opacity-20 uppercase tracking-widest text-[9px] font-black">
              Zero transaction history
            </div>
          ) : (
            recentConsumptions.map(entry => (
              <div key={entry.id} className="glass-panel p-5 rounded-[1.5rem] border border-border hover:bg-muted/30 transition-all group relative overflow-hidden flex flex-col justify-between h-32">
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-foreground uppercase group-hover:text-purple-400 transition-colors line-clamp-1">{entry.Item.name}</span>
                    <span className="text-[8px] font-bold text-muted-foreground/40">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(entry.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className={cn(
                    "p-1.5 rounded-lg border",
                    entry.type === 'CONSUMPTION' ? "bg-red-500/5 border-red-500/10" : "bg-emerald-500/5 border-emerald-500/10"
                  )}>
                    {entry.type === 'CONSUMPTION' ? <TrendingDown className="w-3 h-3 text-red-400" /> : <PlusCircle className="w-3 h-3 text-emerald-400" />}
                  </div>
                </div>
                
                <div className="flex items-end justify-between relative z-10 pt-2 border-t border-white/5">
                   <div className="flex flex-col">
                     <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest">{entry.Outlet?.name || "Global"}</span>
                   </div>
                   <span className={cn(
                     "text-base font-black tracking-tighter",
                     entry.type === 'CONSUMPTION' ? "text-red-400" : "text-emerald-400"
                   )}>
                    {entry.type === 'CONSUMPTION' ? '-' : '+'}{entry.quantity}
                   </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

