import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

// Helper: Get today's IST date as a Date object at midnight UTC (for @db.Date)
function getISTDateOnly(): Date {
  const now = new Date()
  const istOffset = 5.5 * 3600000
  const logicalDate = new Date(now.getTime() + istOffset)
  // If before 4 AM IST, treat as previous business day
  if (logicalDate.getUTCHours() < 4) {
    logicalDate.setUTCDate(logicalDate.getUTCDate() - 1)
  }
  return new Date(
    Date.UTC(
      logicalDate.getUTCFullYear(),
      logicalDate.getUTCMonth(),
      logicalDate.getUTCDate()
    )
  )
}

// GET: Fetch today's stock sheet data for the Chai Hub
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }

    const chaiJoint = await prisma.outlet.findFirst({
      where: { type: "CHAI_JOINT" },
    })
    if (!chaiJoint) {
      return NextResponse.json({ error: "Chai Joint outlet not configured." }, { status: 404 })
    }

    const today = getISTDateOnly()

    // Get all available menu items for the chai hub
    const menuItems = await prisma.menuItem.findMany({
      where: { outletId: chaiJoint.id, isAvailable: true },
      orderBy: [{ categoryId: "asc" }, { name: "asc" }],
    })

    // Get current outlet stock for each menu item
    // We match by itemId (the raw inventory item linked to the menu item)
    const outletStocks = await prisma.outletStock.findMany({
      where: { outletId: chaiJoint.id },
    })
    const stockMap = new Map(outletStocks.map((s) => [s.itemId, s.quantity]))

    // Check if there is already a submission for today
    const todaySubmissions = await prisma.chaiHubDailyStock.findMany({
      where: {
        outletId: chaiJoint.id,
        date: today,
      },
    })
    const submissionMap = new Map(todaySubmissions.map((s) => [s.menuItemId, s]))

    const items = menuItems.map((mi) => {
      const existing = submissionMap.get(mi.id)
      // startStock: use current OutletStock quantity for the linked item
      // If no linked item, default 0
      const startStock = mi.itemId ? (stockMap.get(mi.itemId) ?? 0) : 0

      return {
        menuItemId: mi.id,
        menuItemName: mi.name,
        category: mi.categoryId ?? "Uncategorized",
        price: mi.price,
        itemId: mi.itemId,
        startStock: existing ? existing.startStock : startStock,
        endStock: existing ? existing.endStock : null,
        salesQty: existing ? existing.salesQty : null,
        salesAmount: existing ? existing.salesAmount : null,
        alreadySubmitted: !!existing,
      }
    })

    return NextResponse.json({
      date: today.toISOString().split("T")[0],
      outletId: chaiJoint.id,
      outletName: chaiJoint.name,
      items,
    })
  } catch (error) {
    console.error("GET /api/chai-daily-stock error:", error)
    return NextResponse.json({ error: "Failed to load stock data." }, { status: 500 })
  }
}

// POST: Submit the closing stock for the day
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }

    const body = await req.json()
    const { items } = body as {
      items: Array<{
        menuItemId: string
        menuItemName: string
        category: string
        price: number
        itemId: string | null
        startStock: number
        endStock: number
      }>
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided." }, { status: 400 })
    }

    const chaiJoint = await prisma.outlet.findFirst({
      where: { type: "CHAI_JOINT" },
    })
    if (!chaiJoint) {
      return NextResponse.json({ error: "Chai Joint outlet not configured." }, { status: 404 })
    }

    const today = getISTDateOnly()
    const results = []
    const errors = []

    for (const item of items) {
      try {
        if (typeof item.endStock !== "number" || item.endStock < 0) {
          errors.push(`${item.menuItemName}: Ending stock must be a non-negative number.`)
          continue
        }

        const salesQty = item.startStock - item.endStock
        const salesAmount = salesQty * item.price

        // Upsert the daily stock snapshot
        await prisma.chaiHubDailyStock.upsert({
          where: {
            date_outletId_menuItemId: {
              date: today,
              outletId: chaiJoint.id,
              menuItemId: item.menuItemId,
            },
          },
          create: {
            date: today,
            outletId: chaiJoint.id,
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            category: item.category,
            startStock: item.startStock,
            endStock: item.endStock,
            salesQty,
            salesAmount,
            price: item.price,
            submittedBy: session.user.id,
          },
          update: {
            startStock: item.startStock,
            endStock: item.endStock,
            salesQty,
            salesAmount,
            price: item.price,
            submittedBy: session.user.id,
            submittedAt: new Date(),
          },
        })

        // Update OutletStock.quantity = endStock (becomes next day's starting stock)
        if (item.itemId) {
          await prisma.outletStock.upsert({
            where: {
              outletId_itemId: {
                outletId: chaiJoint.id,
                itemId: item.itemId,
              },
            },
            create: {
              outletId: chaiJoint.id,
              itemId: item.itemId,
              quantity: item.endStock,
            },
            update: {
              quantity: item.endStock,
            },
          })

          // Create an InventoryLedger audit entry for this daily close
          await prisma.inventoryLedger.create({
            data: {
              type: "CHAI_DAILY_CLOSE",
              itemId: item.itemId,
              quantity: Math.abs(salesQty),
              outletId: chaiJoint.id,
              userId: session.user.id,
              notes: `[CHAI-DAILY-CLOSE] ${today.toISOString().split("T")[0]} | ${item.menuItemName} | Start: ${item.startStock} → End: ${item.endStock} | Sold: ${salesQty} | ₹${salesAmount.toFixed(2)}`,
            },
          })
        }

        results.push({
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          startStock: item.startStock,
          endStock: item.endStock,
          salesQty,
          salesAmount,
        })
      } catch (err) {
        console.error(`Error processing ${item.menuItemName}:`, err)
        errors.push(`${item.menuItemName}: ${err instanceof Error ? err.message : "Processing error"}`)
      }
    }

    const totalSalesAmount = results.reduce((sum, r) => sum + r.salesAmount, 0)
    const totalSalesQty = results.reduce((sum, r) => sum + r.salesQty, 0)

    return NextResponse.json({
      success: true,
      date: today.toISOString().split("T")[0],
      summary: {
        totalItems: results.length,
        totalSalesQty,
        totalSalesAmount,
        errors: errors.length,
      },
      results,
      errors,
    })
  } catch (error) {
    console.error("POST /api/chai-daily-stock error:", error)
    return NextResponse.json({ error: "Failed to submit closing stock." }, { status: 500 })
  }
}
