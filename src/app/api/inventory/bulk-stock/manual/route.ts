import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    console.log("Manual bulk stock API called")
    
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
        if (!row.itemName) {
          errors.push(`Row ${rowNum}: Item Name is required`)
          continue
        }

        const itemName = row.itemName.trim()
        const addStock = parseFloat(row.addStock || 0)
        const newTotalStock = row.newTotalStock !== undefined && row.newTotalStock !== "" && row.newTotalStock !== null ? parseFloat(row.newTotalStock) : undefined
        const unitType = (row.unitType || "pieces").toString().toLowerCase()
        const costPerUnit = parseFloat(row.costPerUnit || 0)
        const sellPrice = row.sellPrice !== undefined && row.sellPrice !== "" && row.sellPrice !== null ? parseFloat(row.sellPrice) : undefined
        const piecesPerBox = row.multiplier !== undefined && row.multiplier !== "" && row.multiplier !== null ? parseInt(row.multiplier) : undefined
        const vendorName = row.vendorName?.trim()
        const notes = row.notes?.trim() || ""

        const validUnits = ["pieces", "pcs", "box", "packet", "plate", "kg", "liter", "l", "g", "ml", "gm"]
        if (!validUnits.includes(unitType)) {
          errors.push(`Row ${rowNum}: Invalid unit type. Must be one of: ${validUnits.join(", ")}`)
          continue
        }

        // Find or create item
        let item = await prisma.item.findFirst({
          where: { name: itemName }
        })
        
        if (!item) {
          const category = row.category?.trim() || "Uncategorized"
          item = await prisma.item.create({
            data: {
              name: itemName,
              category,
              unit: unitType,
              currentStock: 0,
              costPerUnit: isNaN(costPerUnit) ? undefined : costPerUnit,
              sellPrice: isNaN(sellPrice as number) ? undefined : sellPrice,
              piecesPerBox: isNaN(piecesPerBox as number) ? undefined : piecesPerBox,
            }
          })
        }

        // Find or create vendor
        let vendor = null
        const selectedVendorId = row.selectedVendorId
        
        if (selectedVendorId) {
          vendor = await prisma.vendor.findUnique({ where: { id: selectedVendorId } })
        }
        
        if (!vendor && vendorName) {
          vendor = await prisma.vendor.findFirst({ where: { name: vendorName } })
          if (!vendor) {
            vendor = await prisma.vendor.create({
              data: { name: vendorName }
            })
          }
        }

        // Calculate stock difference
        const currentStock = item.currentStock || 0
        const itemPiecesPerBox = item.piecesPerBox || 1
        const isContainer = unitType === "box" || unitType === "packet" || unitType === "plate"
        
        let stockDifference = 0
        let isAdjustment = false

        if (newTotalStock !== undefined && !isNaN(newTotalStock)) {
          stockDifference = newTotalStock - currentStock
          isAdjustment = true
        } else if (!isNaN(addStock) && addStock !== 0) {
          stockDifference = isContainer ? addStock * itemPiecesPerBox : addStock
        }

        const unitCost = isContainer && !isNaN(costPerUnit) ? costPerUnit / itemPiecesPerBox : costPerUnit

        if (stockDifference === 0) {
           // Maybe just an update of price/vendor
           // Let's do an update to ensure price is updated even if quantity is 0
           await prisma.item.update({
             where: { id: item.id },
             data: {
               costPerUnit: !isNaN(unitCost) && unitCost > 0 ? unitCost : undefined,
               sellPrice: sellPrice !== undefined && !isNaN(sellPrice) ? sellPrice : undefined,
               piecesPerBox: piecesPerBox !== undefined && !isNaN(piecesPerBox) ? piecesPerBox : undefined,
             }
           })
           
           results.push({
             rowNum,
             itemName: item.name,
             quantity: currentStock,
             unitType,
             vendor: vendor?.name || "No Vendor",
             totalCost: "0.00",
             status: "success (updated details)"
           })
           continue 
        }

        const totalCost = (unitCost || 0) * Math.abs(stockDifference)
        const finalQuantity = currentStock + stockDifference

        // Create inventory ledger entry
        await prisma.$transaction([
          prisma.inventoryLedger.create({
            data: {
              type: stockDifference >= 0 ? "STOCK_IN" : "ADJUSTMENT",
              itemId: item.id,
              quantity: Math.abs(stockDifference),
              vendorId: vendor?.id || null,
              userId: session.user.id,
              notes: `[MANUAL-BULK] ${isAdjustment ? "TOTAL_UPDATE" : "ENTRY"}: Diff=${stockDifference > 0 ? "+" : ""}${stockDifference} ${unitType}. Cost=${isNaN(unitCost) ? 0 : unitCost.toFixed(4)}. ${notes}`,
            }
          }),
          prisma.item.update({
            where: { id: item.id },
            data: {
              currentStock: finalQuantity,
              costPerUnit: isNaN(unitCost) || unitCost === 0 ? undefined : unitCost,
              sellPrice: sellPrice !== undefined && !isNaN(sellPrice) ? sellPrice : undefined,
              piecesPerBox: piecesPerBox !== undefined && !isNaN(piecesPerBox) ? piecesPerBox : undefined,
            }
          })
        ])

        results.push({
          rowNum,
          itemName: item.name,
          quantity: finalQuantity,
          unitType,
          vendor: vendor?.name || "No Vendor",
          totalCost: totalCost.toFixed(2),
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
    console.error("Manual Import error:", error)
    return NextResponse.json({ error: "Failed to process data" }, { status: 500 })
  }
}
