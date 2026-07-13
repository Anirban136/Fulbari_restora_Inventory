import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

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

    console.log(`Export API (JSON) parameters: start=${startParam}, end=${endParam}, types=${typesParam}`)

    // 1. Build where clause for ledger entries
    const ledgerWhere: any = {}

    // Type filter
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

    // 4. Process data for Items Summary
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
        id: item.id,
        name: item.name,
        category: item.category || "Uncategorized",
        unit: item.unit || "pieces",
        currentStock: item.currentStock || 0,
        qtyStockedIn: totalStockInQty,
        valueStockedIn: totalStockInValue,
        qtyDispatched: totalDispatchQty,
        qtyWasted: totalWasteQty,
        qtyConsumed: totalConsumptionQty,
        qtyReversed: totalReversalQty,
        qtyAdjusted: totalAdjustmentQty,
        lastActivityDate,
        lastActivityType,
      }
    })

    // 5. Process data for Detailed Logs
    const detailedRows = ledgerEntries.map((l) => {
      const unitCost = extractUnitCost(l.notes, l.Item.costPerUnit)
      const totalCost = l.quantity * unitCost

      return {
        id: l.id,
        createdAt: l.createdAt,
        itemName: l.Item.name,
        category: l.Item.category || "Uncategorized",
        type: l.type,
        quantity: l.quantity,
        unit: l.Item.unit || "pieces",
        rate: unitCost,
        value: totalCost,
        outletName: l.Outlet?.name || null,
        vendorName: l.Vendor?.name || null,
        userName: l.User.name || "System",
        notes: l.notes || "",
      }
    })

    return NextResponse.json({
      range: {
        from: hasStart ? startParam : "All Time",
        to: hasEnd ? endParam : "All Time",
      },
      types: allowedTypes,
      summary: summaryRows,
      logs: detailedRows,
    })
  } catch (error) {
    console.error("GET /api/inventory/export-stock-in error:", error)
    return NextResponse.json({ error: "Failed to query inventory ledger data." }, { status: 500 })
  }
}
