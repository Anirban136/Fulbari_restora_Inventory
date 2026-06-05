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
  ChevronRight,
  TrendingDown,
  AlertTriangle,
  Zap,
  Box,
  ArrowUpRight,
  Calendar,
  Building2,
  Trophy,
  Activity
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { adjustOutletStock } from "../inventory/actions"
import { toast } from "sonner"
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
  
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveInline = async (stock: any) => {
    if (!editQuantity) {
      setEditingStockId(null)
      return
    }
    const newQty = parseFloat(editQuantity)
    if (isNaN(newQty) || newQty < 0) {
      toast.error("Invalid quantity")
      setEditingStockId(null)
      return
    }
    const diff = newQty - stock.quantity
    if (diff === 0) {
      setEditingStockId(null)
      return
    }
    
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append("outletId", selectedOutletId)
      formData.append("itemId", stock.itemId)
      formData.append("quantity", Math.abs(diff).toString())
      formData.append("mode", diff > 0 ? "ADD" : "REMOVE")
      await adjustOutletStock(formData)
      toast.success(`Stock adjusted successfully!`)
      setEditingStockId(null)
    } catch (error: any) {
      toast.error(error.message || "Failed to adjust stock")
    } finally {
      setIsSaving(false)
    }
  }

  // Group outlets by type and deduplicate by name
  const groupedOutlets = useMemo(() => {
    const groups: Record<string, any[]> = {}
    outlets.forEach(o => {
      const type = o.type?.toUpperCase() || "UNCATEGORIZED"
      if (!groups[type]) groups[type] = []
      
      const existing = groups[type].find(prev => prev.name === o.name)
      if (existing) {
        if ((o.Stock?.length || 0) > (existing.Stock?.length || 0)) {
          const index = groups[type].indexOf(existing)
          groups[type][index] = o
        }
      } else {
        groups[type].push(o)
      }
    })
    return groups
  }, [outlets])

  const types = Object.keys(groupedOutlets)
  const outletsForType = selectedType === "ALL" ? outlets : (groupedOutlets[selectedType] || [])
  const selectedOutlet = outlets.find(o => o.id === selectedOutletId)

  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    const outletsInType = groupedOutlets[type]
    if (outletsInType && outletsInType.length > 0) {
      setSelectedOutletId(outletsInType[0].id)
    }
  }

  const categories = useMemo(() => {
    if (!selectedOutlet) return []
    const cats = new Set<string>(selectedOutlet.Stock.map((s: any) => s.Item.category || "Uncategorized"))
    return Array.from(cats).sort()
  }, [selectedOutlet])

  const filteredStock = useMemo(() => {
    if (!selectedOutlet) return []
    return selectedOutlet.Stock.filter((stock: any) => {
      const matchesSearch = stock.Item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "ALL" || (stock.Item.category || "Uncategorized") === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [selectedOutlet, searchQuery, selectedCategory])

  // Get color based on outlet type
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'RESTAURANT': return 'from-orange-500 to-rose-600'
      case 'CAFE': return 'from-amber-400 to-orange-600'
      case 'CHAI_JOINT': return 'from-sky-400 to-blue-600'
      default: return 'from-purple-500 to-indigo-600'
    }
  }

  return (
    <div className="space-y-10 pb-24 max-w-[1500px] mx-auto animate-in fade-in duration-1000">
      
      {/* 1. HERO HEADER SECTION */}
      <header className="relative group perspective-1000">
        <div className={cn(
          "absolute -inset-1 bg-gradient-to-r blur-2xl opacity-30 group-hover:opacity-50 transition-all duration-1000 rounded-[3rem]",
          getTypeColor(selectedOutlet?.type || "")
        )}></div>
        
        <div className="relative glass-panel p-8 lg:p-12 rounded-[3rem] border border-foreground/20 bg-foreground/[0.02] backdrop-blur-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
          <div className="absolute -right-40 -top-40 w-96 h-96 bg-primary/20 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full"></div>
          
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-3 mb-6">
              <div className={cn(
                "p-3 rounded-2xl shadow-lg border border-foreground/20 flex items-center justify-center animate-bounce-slow",
                "bg-gradient-to-br",
                getTypeColor(selectedOutlet?.type || "")
              )}>
                <Package className="w-6 h-6 text-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/60 mb-1">Central Intelligence</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Live Network Active</span>
                </div>
              </div>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black text-foreground tracking-tighter leading-none mb-6">
              Outlet <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/60">Repository</span>
            </h1>
            
            <p className="text-lg text-foreground/60 max-w-2xl font-medium leading-relaxed">
              Precision inventory management across the <span className="text-foreground font-bold">Fulbari Network</span>. 
              Monitor burn rates, adjust stock levels, and visualize product flow in real-time.
            </p>
          </div>

          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center gap-3 px-6 py-4 bg-foreground/5 border border-foreground/5 rounded-2xl backdrop-blur-md">
               <Activity className="w-4 h-4 text-primary animate-pulse" />
               <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">System Health: Optimal</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. NAVIGATION & ANALYTICS BAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        
        {/* Type Selection (The "Tabs") */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="text-[11px] font-black text-foreground/50 uppercase tracking-[0.3em]">Network Segments</h3>
            </div>
            <div className="h-px flex-1 bg-foreground/5 mx-6"></div>
          </div>
          
          <nav className="flex flex-wrap items-center gap-3">
            {types.map((type) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={cn(
                  "relative px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all overflow-hidden group",
                  selectedType === type 
                    ? "text-foreground shadow-2xl" 
                    : "text-foreground/40 hover:text-foreground bg-foreground/5 border border-foreground/5"
                )}
              >
                {selectedType === type && (
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-100 transition-opacity",
                    getTypeColor(type)
                  )}></div>
                )}
                <span className="relative z-10">{type.replace('_', ' ')}</span>
                {selectedType === type && (
                  <div className="absolute top-0 right-0 p-1">
                    <div className="w-1 h-1 rounded-full bg-white animate-ping"></div>
                  </div>
                )}
              </button>
            ))}
          </nav>

          {/* Location Pips */}
          {outletsForType.length > 1 && (
            <div className="flex items-center gap-3 px-2 py-1 animate-in slide-in-from-left duration-500">
               <span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest mr-2">Locations:</span>
               <div className="flex flex-wrap gap-2">
                {outletsForType.map((outlet) => (
                  <button
                    key={outlet.id}
                    onClick={() => setSelectedOutletId(outlet.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                      selectedOutletId === outlet.id
                        ? "bg-white text-black shadow-xl"
                        : "bg-foreground/5 text-foreground/30 border border-foreground/5 hover:border-foreground/20"
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
        <div className="lg:col-span-4 space-y-4">
           <div className="glass-panel p-6 rounded-[2.5rem] border border-foreground/10 bg-foreground/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-focus-within:opacity-30 transition-opacity">
                <Search className="w-12 h-12 text-foreground" />
              </div>
              
              <div className="relative z-10 space-y-4">
                <div className="relative">
                  <Input 
                    placeholder="SCAN OR SEARCH PRODUCT..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-0 bg-transparent border-0 border-b border-foreground/10 rounded-none h-14 text-sm font-black tracking-widest text-foreground placeholder:text-foreground/10 focus-visible:ring-0 focus:border-primary transition-all uppercase"
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <kbd className="hidden sm:inline-flex px-2 py-1 bg-foreground/5 border border-foreground/10 rounded text-[10px] text-foreground/30 font-black">⌘K</kbd>
                  </div>
                </div>
                
                <Select value={selectedCategory} onValueChange={(value) => value && setSelectedCategory(value)}>
                  <SelectTrigger className="h-12 bg-foreground/5 border-foreground/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60 hover:bg-foreground/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <Filter className="w-4 h-4 text-primary" />
                      <SelectValue placeholder="All Categories" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-[#0c0c0c] border-foreground/10 rounded-2xl shadow-3xl">
                    <SelectItem value="ALL" className="text-[10px] font-black uppercase tracking-widest py-3 hover:bg-foreground/5">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="text-[10px] font-black uppercase tracking-widest py-3 hover:bg-foreground/5">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
           </div>
        </div>
      </div>

      {/* 3. CORE STOCK ENGINE DISPLAY */}
      <main className="animate-in slide-in-from-bottom-8 duration-1000">
        {selectedOutlet ? (
          <section className="relative">
            {/* Main Data Container */}
            <div className="glass-panel rounded-[3rem] border border-foreground/10 bg-foreground/[0.03] overflow-hidden shadow-3xl">
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-foreground/5 hover:bg-transparent">
                      <TableHead className="px-10 h-16 text-[10px] font-black uppercase tracking-[0.4em] text-foreground/40">Product Inventory</TableHead>
                      <TableHead className="px-10 h-16 text-[10px] font-black uppercase tracking-[0.4em] text-foreground/40">Classification</TableHead>
                      <TableHead className="px-10 h-16 text-[10px] font-black uppercase tracking-[0.4em] text-foreground/40">Usage Bar</TableHead>
                      <TableHead className="px-10 h-16 text-[10px] font-black uppercase tracking-[0.4em] text-foreground/40 text-right">Available Assets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStock.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="h-96 text-center">
                          <div className="flex flex-col items-center justify-center opacity-10">
                            <Box className="w-24 h-24 mb-6" />
                            <p className="text-sm font-black uppercase tracking-[0.5em]">Inventory Stream Empty</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStock.map((stock: any) => {
                        const isLow = stock.quantity <= (stock.Item.minStock || 0);
                        const progress = Math.min(Math.max((stock.quantity / (stock.Item.minStock * 5 || 100)) * 100, 10), 100);
                        
                        return (
                          <TableRow key={stock.id} className="group/row border-b border-foreground/5 hover:bg-foreground/[0.02] transition-colors">
                            <TableCell className="px-10 py-8">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-12 h-12 rounded-2xl flex items-center justify-center border border-foreground/10 transition-transform group-hover/row:scale-110",
                                  isLow ? "bg-red-500/10 text-red-500" : "bg-foreground/5 text-foreground/60"
                                )}>
                                  <Box className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-base font-black text-foreground group-hover/row:text-primary transition-colors uppercase tracking-tight">
                                    {stock.Item.name}
                                  </span>
                                  <span className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em] mt-1">ID: {stock.id.slice(-8)}</span>
                                </div>
                              </div>
                            </TableCell>
                            
                            <TableCell className="px-10 py-8">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                                <span className="text-[10px] font-black text-foreground/50 uppercase tracking-[0.2em]">
                                  {stock.Item.category || "Uncategorized"}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="px-10 py-8 w-[250px]">
                               <div className="space-y-2">
                                  <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                                     <div 
                                      className={cn(
                                        "h-full rounded-full transition-all duration-1000 ease-out",
                                        isLow ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-gradient-to-r from-emerald-500 to-primary shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                      )}
                                      style={{ width: `${progress}%` }}
                                     ></div>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black text-foreground/20 uppercase tracking-widest">Safety Threshold</span>
                                    <span className="text-[8px] font-black text-foreground/40 uppercase tracking-widest">{stock.Item.minStock || 0} {stock.Item.unit}</span>
                                  </div>
                               </div>
                            </TableCell>

                            <TableCell className="px-10 py-8 text-right">
                               <div 
                                 className={cn(
                                   "inline-flex flex-col items-end px-8 py-4 rounded-3xl border transition-all cursor-pointer",
                                   isLow 
                                     ? "bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.1)]" 
                                     : "bg-foreground/5 border-foreground/10 text-foreground group-hover/row:border-primary/40 group-hover/row:bg-foreground/[0.08]"
                                 )}
                                 onClick={() => {
                                   if (editingStockId !== stock.id) {
                                     setEditingStockId(stock.id)
                                     setEditQuantity(stock.quantity.toString())
                                   }
                                 }}
                               >
                                  {editingStockId === stock.id ? (
                                    <Input 
                                      autoFocus
                                      type="number"
                                      step="0.01"
                                      value={editQuantity}
                                      onChange={(e) => setEditQuantity(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.currentTarget.blur()
                                        if (e.key === 'Escape') setEditingStockId(null)
                                      }}
                                      onBlur={() => handleSaveInline(stock)}
                                      disabled={isSaving}
                                      className="w-24 h-10 text-xl font-black text-right bg-black/50 border-foreground/20 focus-visible:ring-primary/50"
                                    />
                                  ) : (
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-2xl font-black tracking-tighter">
                                        {stock.quantity}
                                      </span>
                                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                        {stock.Item.piecesPerBox ? 'pcs' : stock.Item.unit}
                                      </span>
                                    </div>
                                  )}
                                  {stock.Item.piecesPerBox && editingStockId !== stock.id && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <div className="w-1 h-1 rounded-full bg-foreground/20"></div>
                                      <span className="text-[9px] font-bold text-foreground/20 uppercase">
                                        {(stock.quantity / stock.Item.piecesPerBox).toFixed(1)} {stock.Item.unit}
                                      </span>
                                    </div>
                                  )}
                               </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View (Cards) */}
              <div className="lg:hidden flex flex-col divide-y divide-white/5">
                 {filteredStock.map((stock: any) => {
                    const isLow = stock.quantity <= (stock.Item.minStock || 0);
                    return (
                      <div key={stock.id} className="p-6 space-y-4 active:bg-foreground/5 transition-colors">
                        <div className="flex justify-between items-start">
                           <div className="flex flex-col gap-1">
                              <h4 className="text-base font-black text-foreground uppercase tracking-tight">{stock.Item.name}</h4>
                              <span className="text-[9px] font-black text-foreground/30 uppercase tracking-widest">{stock.Item.category}</span>
                           </div>
                           <div 
                             className={cn(
                               "px-4 py-2 rounded-xl border font-black text-sm tracking-tighter cursor-pointer",
                               isLow ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-foreground/5 border-foreground/10 text-white"
                             )}
                             onClick={() => {
                               if (editingStockId !== stock.id) {
                                 setEditingStockId(stock.id)
                                 setEditQuantity(stock.quantity.toString())
                               }
                             }}
                           >
                              {editingStockId === stock.id ? (
                                 <Input 
                                   autoFocus
                                   type="number"
                                   step="0.01"
                                   value={editQuantity}
                                   onChange={(e) => setEditQuantity(e.target.value)}
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter') e.currentTarget.blur()
                                     if (e.key === 'Escape') setEditingStockId(null)
                                   }}
                                   onBlur={() => handleSaveInline(stock)}
                                   disabled={isSaving}
                                   className="w-20 h-8 text-sm font-black text-right bg-black/50 border-foreground/20 px-2 inline-flex"
                                 />
                              ) : (
                                 <>
                                   {stock.quantity} <span className="text-[10px] opacity-40">{stock.Item.piecesPerBox ? 'pcs' : stock.Item.unit}</span>
                                 </>
                              )}
                           </div>
                        </div>
                        <div className="h-1 w-full bg-foreground/5 rounded-full overflow-hidden">
                           <div 
                            className={cn("h-full rounded-full", isLow ? "bg-red-500" : "bg-primary")}
                            style={{ width: `${Math.min(Math.max((stock.quantity / (stock.Item.minStock * 5 || 100)) * 100, 10), 100)}%` }}
                           ></div>
                        </div>
                      </div>
                    )
                 })}
              </div>
            </div>
          </section>
        ) : (
          <div className="glass-panel text-center py-40 rounded-[3rem] border border-dashed border-foreground/5 opacity-30 flex flex-col items-center justify-center">
             <div className="p-8 bg-foreground/5 rounded-full mb-8 animate-pulse">
                <StoreIcon className="w-16 h-16 text-foreground" />
             </div>
             <p className="font-black uppercase tracking-[0.5em] text-lg text-foreground">Initializing Stock Core...</p>
          </div>
        )}
      </main>

      {/* 4. RECENT ACTIVITY (TIMELINE) */}
      <section className="space-y-10">
        <div className="flex items-center justify-between px-6">
           <div className="flex items-center gap-4">
             <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
               <History className="w-6 h-6 text-primary" />
             </div>
             <div>
               <h3 className="text-2xl font-black text-foreground tracking-tight uppercase">Network Movement</h3>
               <p className="text-[10px] text-foreground/30 font-black uppercase tracking-[0.3em] mt-1">Real-time consumption & audit logs</p>
             </div>
           </div>
           <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 via-white/5 to-transparent mx-10 hidden sm:block"></div>
           <button className="hidden sm:flex items-center gap-2 px-6 py-3 bg-foreground/5 border border-foreground/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-foreground/40 hover:text-foreground transition-all">
              View All History <ChevronRight className="w-3 h-3" />
           </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
          {recentConsumptions.length === 0 ? (
            <div className="col-span-full py-20 text-center glass-panel rounded-[2rem] border border-dashed border-foreground/10 opacity-20 uppercase tracking-[0.6em] text-[10px] font-black text-foreground">
              No Network Movement Detected
            </div>
          ) : (
            recentConsumptions.map((entry, idx) => (
              <div key={entry.id} className="glass-panel p-6 rounded-[2.5rem] border border-foreground/10 bg-foreground/5 hover:bg-foreground/[0.08] transition-all group relative overflow-hidden flex flex-col justify-between h-40 shadow-xl">
                {/* Visual Index */}
                <span className="absolute -right-2 -bottom-4 text-7xl font-black text-foreground/[0.02] italic select-none">{idx + 1}</span>
                
                <div className="relative z-10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-foreground group-hover:text-primary transition-colors line-clamp-1 uppercase tracking-tight">{entry.Item.name}</span>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      entry.type === 'CONSUMPTION' ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                    )}></div>
                  </div>
                  <div className="flex items-center gap-2 text-foreground/30">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">
                      {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-end justify-between relative z-10 pt-4 mt-auto border-t border-foreground/5">
                   <div className="flex flex-col">
                     <span className="text-[9px] font-black text-foreground/40 uppercase tracking-widest flex items-center gap-1.5">
                       <Building2 className="w-3 h-3" />
                       {entry.Outlet?.name || "Global Node"}
                     </span>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className={cn(
                        "text-2xl font-black tracking-tighter leading-none",
                        entry.type === 'CONSUMPTION' ? "text-rose-500" : "text-emerald-500"
                      )}>
                        {entry.type === 'CONSUMPTION' ? '-' : '+'}{entry.quantity}
                      </span>
                      <span className="text-[8px] font-black text-foreground/20 uppercase tracking-[0.2em] mt-1">{entry.type}</span>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
