"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Save, Loader2, Package, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export interface ManualRow {
  itemName: string
  category: string
  addStock: number | ""
  newTotalStock: number | ""
  unitType: string
  multiplier: number | ""
  costPerUnit: number | ""
  sellPrice: number | ""
  vendorName: string
  notes: string
}

const defaultRow: ManualRow = {
  itemName: "",
  category: "",
  addStock: "",
  newTotalStock: "",
  unitType: "pcs",
  multiplier: "",
  costPerUnit: "",
  sellPrice: "",
  vendorName: "",
  notes: ""
}

interface ImportResult {
  summary: {
    totalProcessed: number
    successful: number
    failed: number
  }
  results: Array<{
    rowNum: number
    itemName: string
    quantity: number
    unitType: string
    vendor: string
    totalCost: string
    status: string
  }>
  errors: string[]
}

export function ManualBulkEntry() {
  const [rows, setRows] = useState<ManualRow[]>([{ ...defaultRow }])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const handleAddRow = () => {
    setRows([...rows, { ...defaultRow }])
  }

  const handleRemoveRow = (index: number) => {
    if (rows.length > 1) {
      const newRows = [...rows]
      newRows.splice(index, 1)
      setRows(newRows)
    }
  }

  const handleRowChange = (index: number, field: keyof ManualRow, value: any) => {
    const newRows = [...rows]
    newRows[index] = { ...newRows[index], [field]: value }
    setRows(newRows)
  }

  const handleSubmit = async () => {
    // Basic validation
    const validRows = rows.filter(r => r.itemName.trim() !== "")
    
    if (validRows.length === 0) {
      toast.error("Please add at least one item with a name.")
      return
    }

    setIsSubmitting(true)
    setImportResult(null)

    try {
      const response = await fetch("/api/inventory/bulk-stock/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rows: validRows })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const result: ImportResult = await response.json()
      setImportResult(result)

      if (result.summary.successful > 0) {
        toast.success(`Successfully added ${result.summary.successful} items!`)
        // If all successful, we could clear the form, but let's keep it so they can see results.
        if (result.summary.failed === 0) {
            setRows([{ ...defaultRow }])
        }
      }

      if (result.summary.failed > 0) {
        toast.error(`${result.summary.failed} items failed. Check results below.`)
      }

    } catch (error) {
      console.error("Submit error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to submit data"
      toast.error(`Submit failed: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
            <Package className="w-6 h-6 text-primary" />
            Manual Bulk Entry
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Add multiple stock items directly via grid without Excel
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleAddRow} className="border-primary/20 hover:bg-primary/10">
            <Plus className="w-4 h-4 mr-2" />
            Add Row
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-emerald-500 text-primary-foreground">
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save All Items
          </Button>
        </div>
      </div>

      <div className="glass-panel overflow-x-auto rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-muted/30 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold min-w-[200px]">Item Name *</th>
              <th className="px-4 py-3 font-semibold min-w-[150px]">Category</th>
              <th className="px-4 py-3 font-semibold min-w-[120px]">Unit</th>
              <th className="px-4 py-3 font-semibold min-w-[120px]">Add Stock</th>
              <th className="px-4 py-3 font-semibold min-w-[140px]">New Total Stock</th>
              <th className="px-4 py-3 font-semibold min-w-[120px]">Pieces/Unit</th>
              <th className="px-4 py-3 font-semibold min-w-[120px]">Buy Price</th>
              <th className="px-4 py-3 font-semibold min-w-[120px]">Sell Price</th>
              <th className="px-4 py-3 font-semibold min-w-[180px]">Vendor</th>
              <th className="px-4 py-3 font-semibold min-w-[150px]">Notes</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                <td className="p-2">
                  <Input 
                    placeholder="Item Name" 
                    value={row.itemName} 
                    onChange={(e) => handleRowChange(index, "itemName", e.target.value)}
                    className="h-9 bg-background"
                  />
                </td>
                <td className="p-2">
                  <Input 
                    placeholder="Category" 
                    value={row.category} 
                    onChange={(e) => handleRowChange(index, "category", e.target.value)}
                    className="h-9 bg-background"
                  />
                </td>
                <td className="p-2">
                  <select
                    value={row.unitType}
                    onChange={(e) => handleRowChange(index, "unitType", e.target.value)}
                    className="w-full h-9 px-3 py-1 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="gm">Gram (gm)</option>
                    <option value="liter">Litre (l)</option>
                    <option value="ml">Millilitre (ml)</option>
                    <option value="packet">Packet</option>
                    <option value="box">Box</option>
                    <option value="plate">Plate</option>
                  </select>
                </td>
                <td className="p-2">
                  <Input 
                    type="number"
                    placeholder="+ Qty" 
                    value={row.addStock} 
                    onChange={(e) => handleRowChange(index, "addStock", e.target.value)}
                    className="h-9 bg-background text-emerald-500 font-semibold"
                  />
                </td>
                <td className="p-2">
                  <Input 
                    type="number"
                    placeholder="Exact Total" 
                    value={row.newTotalStock} 
                    onChange={(e) => handleRowChange(index, "newTotalStock", e.target.value)}
                    className="h-9 bg-background text-blue-500"
                  />
                </td>
                <td className="p-2">
                  <Input 
                    type="number"
                    placeholder="If box/pkt" 
                    value={row.multiplier} 
                    onChange={(e) => handleRowChange(index, "multiplier", e.target.value)}
                    className="h-9 bg-background"
                    disabled={!["box", "packet", "plate"].includes(row.unitType)}
                  />
                </td>
                <td className="p-2">
                  <Input 
                    type="number"
                    placeholder="Buy Rate" 
                    value={row.costPerUnit} 
                    onChange={(e) => handleRowChange(index, "costPerUnit", e.target.value)}
                    className="h-9 bg-background"
                  />
                </td>
                <td className="p-2">
                  <Input 
                    type="number"
                    placeholder="Sell Rate" 
                    value={row.sellPrice} 
                    onChange={(e) => handleRowChange(index, "sellPrice", e.target.value)}
                    className="h-9 bg-background"
                  />
                </td>
                <td className="p-2">
                  <Input 
                    placeholder="Vendor Name" 
                    value={row.vendorName} 
                    onChange={(e) => handleRowChange(index, "vendorName", e.target.value)}
                    className="h-9 bg-background"
                  />
                </td>
                <td className="p-2">
                  <Input 
                    placeholder="Notes..." 
                    value={row.notes} 
                    onChange={(e) => handleRowChange(index, "notes", e.target.value)}
                    className="h-9 bg-background text-xs"
                  />
                </td>
                <td className="p-2 text-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveRow(index)}
                    disabled={rows.length === 1}
                    className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-500/10 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Results Section */}
      {importResult && (
        <div className="glass-panel p-6 rounded-3xl border-border/50 bg-background/50 backdrop-blur-sm mt-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-foreground">Entry Results</h4>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{importResult.summary.totalProcessed}</div>
                <div className="text-xs text-muted-foreground">Total Processed</div>
              </div>
              <div className="text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div className="text-2xl font-bold text-emerald-500">{importResult.summary.successful}</div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="text-2xl font-bold text-red-500">{importResult.summary.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            {importResult.results.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-foreground text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Successfully Saved
                </h5>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importResult.results.map((result, index) => (
                    <div key={index} className="text-xs bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 flex justify-between">
                      <div>
                        <span className="font-medium text-emerald-600">Row {result.rowNum}:</span> {result.itemName} 
                        <span className="text-muted-foreground"> (Qty: {result.quantity} {result.unitType})</span>
                      </div>
                      <span className="text-muted-foreground text-[10px]">{result.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-foreground text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Errors
                </h5>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-xs bg-red-500/5 border border-red-500/10 rounded-lg p-2 text-red-400">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
