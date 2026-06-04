import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Authentication required. Please log in." }, { status: 401 })
    }
    
    if (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER") {
      return NextResponse.json({ error: "Insufficient permissions. Owner or Inventory Manager role required." }, { status: 403 })
    }

    const { rows } = await req.json()

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No data provided or invalid format" }, { status: 400 })
    }

    const results = []
    const errors = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1

      try {
        if (!row.selectedItemId || !row.itemName) {
          errors.push(`Row ${rowNum}: Product is required`)
          continue
        }

        if (!row.outletId) {
          errors.push(`Row ${rowNum}: Destination Outlet is required`)
          continue
        }

        const quantity = parseFloat(row.quantity || 0)
        if (isNaN(quantity) || quantity <= 0) {
          errors.push(`Row ${rowNum}: Valid dispatch quantity is required`)
          continue
        }

        const unitType = (row.unitType || "pieces").toString().toLowerCase()
        const outletId = row.outletId
        const notes = row.notes?.trim() || ""

        // Find item
        const item = await prisma.item.findUnique({
          where: { id: row.selectedItemId }
        })
        
        if (!item) {
          errors.push(`Row ${rowNum}: Product '${row.itemName}' not found in database`)
          continue
        }

        // Find outlet
        const outlet = await prisma.outlet.findUnique({
          where: { id: outletId }
        })

        if (!outlet) {
          errors.push(`Row ${rowNum}: Selected outlet not found`)
          continue
        }

        const isContainer = unitType === "box" || unitType === "packet" || unitType === "plate"
        const itemPiecesPerBox = item.piecesPerBox || 1
        const finalQuantity = isContainer ? quantity * itemPiecesPerBox : quantity
        const notePrefix = isContainer ? `[BULK-DISPATCH: ${quantity} ${unitType}s] ` : "[BULK-DISPATCH] "

        if (item.currentStock < finalQuantity) {
           errors.push(`Row ${rowNum}: Insufficient stock. Requested ${finalQuantity} pcs but only ${item.currentStock} available.`)
           continue
        }

        // Process Transaction
        await prisma.$transaction(async (tx) => {
          // 1. Decrement Central Stock
          await tx.item.update({
            where: { id: item.id },
            data: { currentStock: { decrement: finalQuantity } }
          })
      
          // 2. Increment Outlet Stock
          await tx.outletStock.upsert({
            where: { outletId_itemId: { outletId, itemId: item.id } },
            update: { quantity: { increment: finalQuantity } },
            create: { outletId, itemId: item.id, quantity: finalQuantity }
          })
      
          // 3. Create Ledger Entry
          await tx.inventoryLedger.create({
            data: {
              type: "DISPATCH",
              itemId: item.id,
              outletId,
              quantity: finalQuantity,
              userId: session.user.id,
              notes: notePrefix + notes
            }
          })
        })

        results.push({
          rowNum,
          itemName: item.name,
          outletName: outlet.name,
          quantity: finalQuantity,
          unitType: "pcs", // Displayed as raw pieces in result
          status: "success"
        })

      } catch (error) {
        console.error(`Row ${rowNum} error:`, error)
        errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : "Processing error"}`)
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: rows.length,
        successful: results.length,
        failed: errors.length
      },
      results,
      errors
    })

  } catch (error) {
    console.error("Bulk Dispatch error:", error)
    return NextResponse.json({ error: "Failed to process data" }, { status: 500 })
  }
}
