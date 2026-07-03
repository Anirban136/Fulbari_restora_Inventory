"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PackageOpen, ArrowRight, X, Plus, Trash2, FileText, LayoutGrid } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { addBulkItems } from "./actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface BulkItemRow {
  id: string
  name: string
  category: string
  unit: string
  costPerUnit: string
  sellPrice: string
  minStock: string
  piecesPerBox: string
}

export function BulkAddItemDialog({ existingCategories = [] }: { existingCategories?: string[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"grid" | "csv">("grid")
  const [csvText, setCsvText] = useState("")
  
  const createEmptyRow = (): BulkItemRow => ({
    id: Math.random().toString(36).substring(7),
    name: "",
    category: "",
    unit: "pcs",
    costPerUnit: "",
    sellPrice: "",
    minStock: "",
    piecesPerBox: ""
  })

  const [rows, setRows] = useState<BulkItemRow[]>([createEmptyRow()])

  const handleAddRow = () => setRows([...rows, createEmptyRow()])
  
  const handleRemoveRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id))
    }
  }

  const handleUpdateRow = (id: string, field: keyof BulkItemRow, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const processCSV = () => {
    if (!csvText.trim()) return
    const lines = csvText.split('\n')
    const newRows: BulkItemRow[] = []
    
    // basic CSV parsing (assumes Name, Category, Unit, Cost, Sell Price, Min Stock, Pcs/Box)
    lines.forEach(line => {
      if (!line.trim()) return
      const parts = line.split(',').map(s => s.trim())
      if (parts.length >= 1) {
        newRows.push({
          id: Math.random().toString(36).substring(7),
          name: parts[0] || "",
          category: parts[1] || "Uncategorized",
          unit: parts[2] || "pcs",
          costPerUnit: parts[3] || "",
          sellPrice: parts[4] || "",
          minStock: parts[5] || "",
          piecesPerBox: parts[6] || ""
        })
      }
    })
    
    if (newRows.length > 0) {
      setRows(newRows)
      setMode("grid")
      setCsvText("")
      toast.success(`Imported ${newRows.length} rows from CSV`)
    }
  }

  async function handleSubmit() {
    const validRows = rows.filter(r => r.name.trim() !== "")
    if (validRows.length === 0) {
      toast.error("No valid items to add.")
      return
    }

    setLoading(true)
    try {
      const res = await addBulkItems(validRows)
      if (res?.success) {
        toast.success("Bulk add successful!", {
          description: `Added ${res.count} items to the catalog.`
        })
        setOpen(false)
        setRows([createEmptyRow()])
      } else {
        toast.error("Failed to add items: " + (res?.error || "Unknown error"))
      }
    } catch (error) {
      toast.error("An error occurred during bulk add.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="h-12 px-6 rounded-2xl md:rounded-[2rem] bg-indigo-500 hover:bg-indigo-400 text-white font-black shadow-[0_15px_30px_-10px_rgba(99,102,241,0.5)] transition-all active:scale-95 gap-2.5 uppercase tracking-wider text-[11px] sm:w-auto w-full">
          <PackageOpen className="w-5 h-5" /> BULK ADD ITEMS
        </Button>
      } />
      <DialogContent className="sm:max-w-[900px] w-[95vw] lg:w-full bg-background/95 backdrop-blur-3xl border-border rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl p-0 overflow-hidden max-h-[92vh] flex flex-col" showCloseButton={false}>
        <DialogClose render={<button className="absolute top-8 right-8 p-3 rounded-2xl bg-foreground/5 border border-border text-foreground/40 hover:text-foreground transition-all active:scale-90 z-50"><X className="w-5 h-5" /></button>} />
        
        <div className="absolute top-0 left-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-[80px] -z-10"></div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar-premium p-6 sm:p-10 flex flex-col">
          <DialogHeader className="mb-6">
             <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-500/10 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mb-6 border border-indigo-500/20 shadow-inner">
               <PackageOpen className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-500" />
             </div>
            <DialogTitle className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter uppercase leading-none">Bulk Item Entry</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium mt-4 tracking-tight leading-relaxed text-sm">
              Add multiple items to the <span className="text-indigo-500 font-black uppercase">Global Repository</span> efficiently.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4 mb-6">
            <Button variant={mode === "grid" ? "default" : "outline"} onClick={() => setMode("grid")} className="rounded-xl h-10 px-4 text-xs font-bold gap-2">
              <LayoutGrid className="w-4 h-4" /> Grid View
            </Button>
            <Button variant={mode === "csv" ? "default" : "outline"} onClick={() => setMode("csv")} className="rounded-xl h-10 px-4 text-xs font-bold gap-2">
              <FileText className="w-4 h-4" /> Paste CSV
            </Button>
          </div>

          {mode === "csv" && (
            <div className="space-y-4 flex-1">
              <div className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-xl border border-border/50">
                <span className="font-bold text-foreground">Format:</span> Name, Category, Unit, Cost Price, Sell Price, Min Stock, Pcs/Box<br/>
                <span className="italic">Example: Premium Beans, Coffee, kg, 500, 800, 5, </span>
              </div>
              <textarea 
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV rows here..."
                className="w-full h-64 p-4 rounded-2xl bg-foreground/[0.03] border border-border text-foreground text-sm font-mono focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none resize-none shadow-inner"
              />
              <Button onClick={processCSV} className="w-full h-12 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold uppercase tracking-widest text-xs">
                Process CSV
              </Button>
            </div>
          )}

          {mode === "grid" && (
            <div className="flex-1 overflow-x-auto overflow-y-visible border border-border/50 rounded-2xl shadow-inner bg-background/50">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                <thead className="bg-muted/30 border-b border-border/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="p-3">Name *</th>
                    <th className="p-3 w-[150px]">Category</th>
                    <th className="p-3 w-[100px]">Unit</th>
                    <th className="p-3 w-[100px]">Cost (₹)</th>
                    <th className="p-3 w-[100px]">Sell (₹)</th>
                    <th className="p-3 w-[80px]">Min</th>
                    <th className="p-3 w-[80px]">Pcs/Box</th>
                    <th className="p-3 w-[50px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="p-2">
                        <Input value={row.name} onChange={(e) => handleUpdateRow(row.id, "name", e.target.value)} placeholder="Item Name" className="h-9 text-xs font-bold bg-transparent border-transparent hover:border-border/50 focus:border-indigo-500/50 shadow-none" />
                      </td>
                      <td className="p-2">
                        <Input value={row.category} onChange={(e) => handleUpdateRow(row.id, "category", e.target.value)} placeholder="Category" list="categories-list" className="h-9 text-xs bg-transparent border-transparent hover:border-border/50 shadow-none" />
                      </td>
                      <td className="p-2">
                        <select value={row.unit} onChange={(e) => handleUpdateRow(row.id, "unit", e.target.value)} className="h-9 w-full rounded-md border border-transparent hover:border-border/50 bg-transparent text-xs font-bold outline-none px-2 shadow-none cursor-pointer">
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="gm">gm</option>
                          <option value="lit">lit</option>
                          <option value="ml">ml</option>
                          <option value="packet">packet</option>
                          <option value="box">box</option>
                          <option value="plate">plate</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <Input type="number" value={row.costPerUnit} onChange={(e) => handleUpdateRow(row.id, "costPerUnit", e.target.value)} placeholder="0.00" className="h-9 text-xs bg-transparent border-transparent hover:border-border/50 shadow-none" />
                      </td>
                      <td className="p-2">
                        <Input type="number" value={row.sellPrice} onChange={(e) => handleUpdateRow(row.id, "sellPrice", e.target.value)} placeholder="0.00" className="h-9 text-xs text-primary font-bold bg-transparent border-transparent hover:border-border/50 shadow-none" />
                      </td>
                      <td className="p-2">
                        <Input type="number" value={row.minStock} onChange={(e) => handleUpdateRow(row.id, "minStock", e.target.value)} placeholder="0" className="h-9 text-xs bg-transparent border-transparent hover:border-border/50 shadow-none" />
                      </td>
                      <td className="p-2">
                        <Input type="number" value={row.piecesPerBox} onChange={(e) => handleUpdateRow(row.id, "piecesPerBox", e.target.value)} placeholder="1" className="h-9 text-xs bg-transparent border-transparent hover:border-border/50 shadow-none disabled:opacity-30" disabled={!["box", "packet", "plate"].includes(row.unit)} />
                      </td>
                      <td className="p-2 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(row.id)} className="h-8 w-8 text-red-500/50 hover:text-red-500 hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="categories-list">
                {existingCategories.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>
          )}

          {mode === "grid" && (
             <Button onClick={handleAddRow} variant="outline" className="mt-4 w-full border-dashed border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/5 rounded-xl font-black uppercase tracking-widest text-xs h-12 transition-all">
               <Plus className="w-4 h-4 mr-2" /> Add Row
             </Button>
          )}

          <div className="pt-8 pb-4 mt-auto">
            <Button onClick={handleSubmit} disabled={loading || (mode === "grid" && rows.filter(r => r.name.trim() !== "").length === 0)} className="w-full h-16 text-sm font-black uppercase tracking-[0.4em] bg-foreground text-background hover:opacity-90 rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "SUBMIT ALL ITEMS"} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
