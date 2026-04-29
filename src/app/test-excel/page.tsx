"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function TestExcelPage() {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-bulk-stock")
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      setTestResults({ error: error instanceof Error ? error.message : "Unknown error" })
    } finally {
      setLoading(false)
    }
  }

  const testExcelExport = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/inventory/bulk-stock", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `test-template.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      setTestResults({ success: "Excel file downloaded successfully!" })
    } catch (error) {
      setTestResults({ error: error instanceof Error ? error.message : "Export failed" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-foreground">Excel Flow Debug Page</h1>
        
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Authentication</h2>
          <Button onClick={testAuth} disabled={loading}>
            {loading ? "Testing..." : "Test Auth"}
          </Button>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Excel Export</h2>
          <Button onClick={testExcelExport} disabled={loading}>
            {loading ? "Testing..." : "Test Excel Export"}
          </Button>
        </div>

        {testResults && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Results</h2>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
