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
      console.log("Export API: Unauthorized access attempt")
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }

    const role = session.user.role
    if (role !== "OWNER" && role !== "ADMIN" && role !== "INV_MANAGER") {
      console.log(`Export API: Forbidden role: ${role}`)
      return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const startParam = searchParams.get("start") // YYYY-MM-DD
    const endParam = searchParams.get("end")     // YYYY-MM-DD
    const typesParam = searchParams.get("types")   // Comma-separated list

    console.log(`Export API parameters: start=${startParam}, end=${endParam}, types=${typesParam}`)

    // 1. Build where clause for ledger entries
    const ledgerWhere: any = {}

    // Type filter (include CONSUMPTION and REVERSAL by default)
    let allowedTypes = ["STOCK_IN", "DISPATCH", "WASTE", "ADJUSTMENT", "CONSUMPTION", "REVERSAL"]
    if (typesParam && typesParam !== "undefined" && typesParam !== "null" && typesParam.trim() !== "") {
      const parsedTypes = typesParam.split(",").map(t => t.trim()).filter(Boolean)
      if (parsedTypes.length > 0) {
        allowedTypes = parsedTypes
      }
    }
    ledgerWhere.type = { in: allowedTypes }

    // Date range filter adjusted to IST (UTC+5.5) timezone boundaries
    const hasStart = startParam && startParam !== "undefined" && startParam !== "null" && startParam.trim() !== ""
    const hasEnd = endParam && endParam !== "undefined" && endParam !== "null" && endParam.trim() !== ""

    if (hasStart || hasEnd) {
      ledgerWhere.createdAt = {}
      
      if (hasStart) {
        // YYYY-MM-DD 00:00:00 IST is YYYY-MM-DD 00:00:00 UTC minus 5.5 hours (330 mins)
        const dateUTC = new Date(`${startParam}T00:00:00.000Z`)
        if (!isNaN(dateUTC.getTime())) {
          dateUTC.setMinutes(dateUTC.getMinutes() - 330)
          ledgerWhere.createdAt.gte = dateUTC
        }
      }
      
      if (hasEnd) {
        // YYYY-MM-DD 23:59:59.999 IST is YYYY-MM-DD 23:59:59.999 UTC minus 5.5 hours (330 mins)
        const dateUTC = new Date(`${endParam}T23:59:59.999Z`)
        if (!isNaN(dateUTC.getTime())) {
          dateUTC.setMinutes(dateUTC.getMinutes() - 330)
          ledgerWhere.createdAt.lte = dateUTC
        }
      }
    }

    console.log("Export API built prisma filter:", JSON.stringify(ledgerWhere))

    // 2. Fetch all items
    const items = await prisma.item.findMany({
      orderBy: { name: "asc" },
    })

    // 3. Fetch filtered ledger entries
    const ledgerEntries = await prisma.inventoryLedger.findMany({
      where: ledgerWhere,
      include: {
        Item: true,
        User: { select: { name: true } },
        Vendor: { select: { name: true } },
        Outlet: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    console.log(`Export API: Queried ${items.length} items and found ${ledgerEntries.length} matching transactions`)

    // 4. Process data for Sheet 1: Items Summary
    const summaryRows = items.map((item) => {
      const itemLedgers = ledgerEntries.filter((l) => l.itemId === item.id)
      
      const stockInLedgers = itemLedgers.filter((l) => l.type === "STOCK_IN")
      const dispatchLedgers = itemLedgers.filter((l) => l.type === "DISPATCH")
      const wasteLedgers = itemLedgers.filter((l) => l.type === "WASTE")
      const adjustmentLedgers = itemLedgers.filter((l) => l.type === "ADJUSTMENT")
      const consumptionLedgers = itemLedgers.filter((l) => l.type === "CONSUMPTION")
      const reversalLedgers = itemLedgers.filter((l) => l.type === "REVERSAL")

      const totalStockInQty = stockInLedgers.reduce((sum, l) => sum + l.quantity, 0)
      const totalStockInValue = stockInLedgers.reduce((sum, l) => {
        const unitCost = extractUnitCost(l.notes, l.Item.costPerUnit)
        return sum + l.quantity * unitCost
      }, 0)

      const totalDispatchQty = dispatchLedgers.reduce((sum, l) => sum + l.quantity, 0)
      const totalWasteQty = wasteLedgers.reduce((sum, l) => sum + l.quantity, 0)
      const totalAdjustmentQty = adjustmentLedgers.reduce((sum, l) => sum + l.quantity, 0)
      const totalConsumptionQty = consumptionLedgers.reduce((sum, l) => sum + l.quantity, 0)
      const totalReversalQty = reversalLedgers.reduce((sum, l) => sum + l.quantity, 0)

      const lastLedger = itemLedgers[0]
      const lastActivityDate = lastLedger ? new Date(lastLedger.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A"
      const lastActivityType = lastLedger ? lastLedger.type : "N/A"

      return {
        "Product Name": item.name,
        "Category": item.category || "Uncategorized",
        "Base Unit": item.unit || "pieces",
        "Current Stock": item.currentStock || 0,
        "Qty Stocked In": totalStockInQty,
        "Value Stocked In (₹)": parseFloat(totalStockInValue.toFixed(2)),
        "Qty Dispatched": totalDispatchQty,
        "Qty Wasted": totalWasteQty,
        "Qty Consumed": totalConsumptionQty,
        "Qty Reversed": totalReversalQty,
        "Qty Adjusted": totalAdjustmentQty,
        "Last Activity Date": lastActivityDate,
        "Last Activity Type": lastActivityType,
      }
    })

    // 5. Process data for Sheet 2: Detailed Logs
    const detailedRows = ledgerEntries.map((l) => {
      const unitCost = extractUnitCost(l.notes, l.Item.costPerUnit)
      const totalCost = l.quantity * unitCost

      return {
        "Date & Time": new Date(l.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        "Product Name": l.Item.name,
        "Category": l.Item.category || "Uncategorized",
        "Transaction Type": l.type,
        "Quantity": l.quantity,
        "Unit": l.Item.unit || "pieces",
        "Unit Cost/Rate (₹)": parseFloat(unitCost.toFixed(4)),
        "Total Cost/Value (₹)": parseFloat(totalCost.toFixed(2)),
        "Outlet (If Dispatched/Consumed)": l.Outlet?.name || "N/A",
        "Vendor (If Stock-In)": l.Vendor?.name || "N/A",
        "Recorded By": l.User.name || "System",
        "Notes": l.notes || "",
      }
    })

    // 6. Process data for Sheet 3: Report Metadata
    const metadataRows = [
      { "Filter Parameter": "Report Title", "Applied Value": "Inventory Ledger Report" },
      { "Filter Parameter": "From Date (Start)", "Applied Value": hasStart ? startParam : "All Time" },
      { "Filter Parameter": "To Date (End)", "Applied Value": hasEnd ? endParam : "All Time" },
      { "Filter Parameter": "Exported Transaction Types", "Applied Value": allowedTypes.join(", ") },
      { "Filter Parameter": "Total Products in Catalog", "Applied Value": items.length },
      { "Filter Parameter": "Total Transactions Exported", "Applied Value": ledgerEntries.length },
      { "Filter Parameter": "Generated At", "Applied Value": new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) },
      { "Filter Parameter": "Generated By", "Applied Value": `${session.user.name} (${session.user.role})` },
    ]

    // 7. Create Workbook
    const wb = XLSX.utils.book_new()

    // Sheet 1: Summary
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
    wsSummary["!cols"] = [
      { wch: 28 }, // Product Name
      { wch: 20 }, // Category
      { wch: 12 }, // Base Unit
      { wch: 14 }, // Current Stock
      { wch: 16 }, // Qty Stocked In
      { wch: 22 }, // Value Stocked In (₹)
      { wch: 16 }, // Qty Dispatched
      { wch: 14 }, // Qty Wasted
      { wch: 14 }, // Qty Consumed
      { wch: 14 }, // Qty Reversed
      { wch: 14 }, // Qty Adjusted
      { wch: 18 }, // Last Activity Date
      { wch: 18 }, // Last Activity Type
    ]
    XLSX.utils.book_append_sheet(wb, wsSummary, "Inventory Summary")

    // Sheet 2: Detailed Logs
    const wsDetailed = XLSX.utils.json_to_sheet(detailedRows)
    wsDetailed["!cols"] = [
      { wch: 22 }, // Date & Time
      { wch: 28 }, // Product Name
      { wch: 20 }, // Category
      { wch: 18 }, // Transaction Type
      { wch: 12 }, // Quantity
      { wch: 10 }, // Unit
      { wch: 18 }, // Unit Cost/Rate (₹)
      { wch: 20 }, // Total Cost/Value (₹)
      { wch: 32 }, // Outlet
      { wch: 22 }, // Vendor
      { wch: 18 }, // Recorded By
      { wch: 40 }, // Notes
    ]
    XLSX.utils.book_append_sheet(wb, wsDetailed, "Detailed Logs")

    // Sheet 3: Report Metadata
    const wsMetadata = XLSX.utils.json_to_sheet(metadataRows)
    wsMetadata["!cols"] = [
      { wch: 28 }, // Parameter
      { wch: 50 }, // Value
    ]
    XLSX.utils.book_append_sheet(wb, wsMetadata, "Report Metadata")

    // 8. Output Buffer
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    // Filename formatting
    const dateRangeStr = hasStart && hasEnd 
      ? `${startParam}-to-${endParam}` 
      : (hasStart ? `since-${startParam}` : (hasEnd ? `until-${endParam}` : "all-time"))
    
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="inventory-ledger-report-${dateRangeStr}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("GET /api/inventory/export-stock-in error:", error)
    return NextResponse.json({ error: "Failed to generate Excel report." }, { status: 500 })
  }
}
