import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as XLSX from "xlsx"

export const dynamic = "force-dynamic"

function extractUnitCost(notes: string | null, fallbackCost: number | null): number {
  if (!notes) return fallbackCost || 0
  const match = notes.match(/Cost=([0-9.]+)/)
  return match ? parseFloat(match[1]) : (fallbackCost || 0)
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }

    const role = session.user.role
    if (role !== "OWNER" && role !== "ADMIN" && role !== "INV_MANAGER") {
      return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 })
    }

    // 1. Fetch all items
    const items = await prisma.item.findMany({
      orderBy: { name: "asc" },
    })

    // 2. Fetch all STOCK_IN ledger entries
    const ledgerEntries = await prisma.inventoryLedger.findMany({
      where: { type: "STOCK_IN" },
      include: {
        Item: true,
        User: { select: { name: true } },
        Vendor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // 3. Process data for Sheet 1: Items Stock-In Summary
    const summaryRows = items.map((item) => {
      const itemLedgers = ledgerEntries.filter((l) => l.itemId === item.id)
      
      const totalQty = itemLedgers.reduce((sum, l) => sum + l.quantity, 0)
      const totalValue = itemLedgers.reduce((sum, l) => {
        const unitCost = extractUnitCost(l.notes, l.Item.costPerUnit)
        return sum + l.quantity * unitCost
      }, 0)

      const lastLedger = itemLedgers[0] // Since ledgerEntries is sorted desc by createdAt
      const lastStockInDate = lastLedger ? new Date(lastLedger.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A"
      const lastUnitCost = lastLedger ? extractUnitCost(lastLedger.notes, lastLedger.Item.costPerUnit) : 0

      return {
        "Product Name": item.name,
        "Category": item.category || "Uncategorized",
        "Base Unit": item.unit || "pieces",
        "Current Stock": item.currentStock || 0,
        "Total Qty Stocked In": totalQty,
        "Total Value Stocked In (₹)": parseFloat(totalValue.toFixed(2)),
        "Last Stock-In Date": lastStockInDate,
        "Last Unit Cost (₹)": parseFloat(lastUnitCost.toFixed(2)),
      }
    })

    // 4. Process data for Sheet 2: Detailed Stock-In Logs
    const detailedRows = ledgerEntries.map((l) => {
      const unitCost = extractUnitCost(l.notes, l.Item.costPerUnit)
      const totalCost = l.quantity * unitCost

      return {
        "Date & Time": new Date(l.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        "Product Name": l.Item.name,
        "Category": l.Item.category || "Uncategorized",
        "Quantity Stocked In": l.quantity,
        "Unit": l.Item.unit || "pieces",
        "Unit Cost (₹)": parseFloat(unitCost.toFixed(4)),
        "Total Cost (₹)": parseFloat(totalCost.toFixed(2)),
        "Vendor": l.Vendor?.name || "Direct/No Vendor",
        "Received By": l.User.name || "System",
        "Notes": l.notes || "",
      }
    })

    // 5. Create Workbook
    const wb = XLSX.utils.book_new()

    // Sheet 1: Summary
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
    wsSummary["!cols"] = [
      { wch: 28 }, // Product Name
      { wch: 20 }, // Category
      { wch: 12 }, // Base Unit
      { wch: 14 }, // Current Stock
      { wch: 22 }, // Total Qty Stocked In
      { wch: 24 }, // Total Value Stocked In (₹)
      { wch: 18 }, // Last Stock-In Date
      { wch: 18 }, // Last Unit Cost (₹)
    ]
    XLSX.utils.book_append_sheet(wb, wsSummary, "Stock-In Summary")

    // Sheet 2: Detailed Logs
    const wsDetailed = XLSX.utils.json_to_sheet(detailedRows)
    wsDetailed["!cols"] = [
      { wch: 22 }, // Date & Time
      { wch: 28 }, // Product Name
      { wch: 20 }, // Category
      { wch: 18 }, // Quantity Stocked In
      { wch: 10 }, // Unit
      { wch: 14 }, // Unit Cost (₹)
      { wch: 16 }, // Total Cost (₹)
      { wch: 22 }, // Vendor
      { wch: 18 }, // Received By
      { wch: 40 }, // Notes
    ]
    XLSX.utils.book_append_sheet(wb, wsDetailed, "Detailed Stock-In Logs")

    // 6. Output Buffer
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    const dateStr = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }).replace(/\//g, "-")

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="inventory-stock-in-report-${dateStr}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("GET /api/inventory/export-stock-in error:", error)
    return NextResponse.json({ error: "Failed to generate Excel report." }, { status: 500 })
  }
}
