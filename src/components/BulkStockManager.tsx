"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileText,
  TrendingUp,
  Package
} from "lucide-react"
import { toast } from "sonner"

interface BulkImportResult {
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

export function BulkStockManager() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Export Excel template
  const handleExportTemplate = async () => {
    setIsExporting(true)
    try {
      const response = await fetch("/api/inventory/bulk-stock", {
        method: "GET",
        credentials: "include", // Important for authentication
        headers: {
          "Content-Type": "application/json",
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }
      
      const blob = await response.blob()
      
      // Check if the response is actually an Excel file
      if (blob.size === 0) {
        throw new Error("Received empty file")
      }
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `bulk-stock-template-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success("Excel template downloaded successfully!")
    } catch (error) {
      console.error("Export error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to download template"
      
      if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        toast.error("Authentication required. Please log in with appropriate permissions.")
      } else if (errorMessage.includes("403")) {
        toast.error("Insufficient permissions. Owner or Inventory Manager role required.")
      } else {
        toast.error(`Export failed: ${errorMessage}`)
      }
    } finally {
      setIsExporting(false)
    }
  }

  // Import Excel file
  const handleImport = async (file: File) => {
    setIsImporting(true)
    setImportResult(null)
    
    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error("Please upload an Excel file (.xlsx or .xls)")
      setIsImporting(false)
      return
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB")
      setIsImporting(false)
      return
    }
    
    const formData = new FormData()
    formData.append("file", file)
    
    try {
      const response = await fetch("/api/inventory/bulk-stock", {
        method: "POST",
        credentials: "include", // Important for authentication
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }
      
      const result: BulkImportResult = await response.json()
      setImportResult(result)
      
      if (result.summary.successful > 0) {
        toast.success(`Successfully imported ${result.summary.successful} items!`)
      }
      
      if (result.summary.failed > 0) {
        toast.error(`${result.summary.failed} items failed to import`)
      }
      
    } catch (error) {
      console.error("Import error:", error)
      const errorMessage = error instanceof Error ? error.message : "Import failed"
      
      if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        toast.error("Authentication required. Please log in with appropriate permissions.")
      } else if (errorMessage.includes("403")) {
        toast.error("Insufficient permissions. Owner or Inventory Manager role required.")
      } else if (errorMessage.includes("413") || errorMessage.includes("too large")) {
        toast.error("File too large. Please use a file smaller than 10MB.")
      } else if (errorMessage.includes("Excel") || errorMessage.includes("file")) {
        toast.error(`File error: ${errorMessage}`)
      } else {
        toast.error(`Import failed: ${errorMessage}`)
      }
    } finally {
      setIsImporting(false)
    }
  }

  // File input change handler
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleImport(file)
    }
  }

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImport(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
            <Package className="w-6 h-6 text-primary" />
            Bulk Stock Management
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Import multiple items at once using Excel templates
          </p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export Template Card */}
        <div className="glass-panel p-6 rounded-3xl border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/20 transition-all">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Download className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Download Template</h4>
                <p className="text-sm text-muted-foreground">Get Excel template with existing items</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <p className="font-medium mb-1">Template includes:</p>
                <ul className="space-y-1 text-xs">
                  <li>• All existing items with categories</li>
                  <li>• Vendor reference list</li>
                  <li>• Step-by-step instructions</li>
                  <li>• Pre-formatted columns</li>
                </ul>
              </div>
            </div>
            
            <Button 
              onClick={handleExportTemplate}
              disabled={isExporting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Download Excel Template
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Import File Card */}
        <div className="glass-panel p-6 rounded-3xl border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/20 transition-all">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <Upload className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Import Stock Data</h4>
                <p className="text-sm text-muted-foreground">Upload filled Excel file</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <p className="font-medium mb-1">Supported features:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Add new items automatically</li>
                  <li>• Update existing stock quantities</li>
                  <li>• Create new vendors if needed</li>
                  <li>• Handle boxes, packets, pieces</li>
                </ul>
              </div>
            </div>
            
            {/* File Upload Area */}
            <div 
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                dragActive 
                  ? "border-blue-500 bg-blue-500/5" 
                  : "border-border/50 hover:border-primary/30 hover:bg-muted/20"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isImporting}
              />
              
              {isImporting ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <p className="text-sm text-muted-foreground">Processing file...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {dragActive ? "Drop file here" : "Drag & drop Excel file or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground">.xlsx, .xls files only</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Import Results */}
      {importResult && (
        <div className="glass-panel p-6 rounded-3xl border-border/50 bg-background/50 backdrop-blur-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-foreground">Import Results</h4>
            </div>
            
            {/* Summary */}
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

            {/* Successful Items */}
            {importResult.results.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-foreground text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Successfully Imported Items
                </h5>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importResult.results.map((result, index) => (
                    <div key={index} className="text-xs bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2">
                      <span className="font-medium text-emerald-600">Row {result.rowNum}:</span> {result.itemName} 
                      <span className="text-muted-foreground"> +{result.quantity} {result.unitType}</span>
                      {result.vendor && <span className="text-muted-foreground"> from {result.vendor}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
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
