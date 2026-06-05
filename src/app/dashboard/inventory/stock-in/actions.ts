"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function logStockIn(data: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER")) {
      throw new Error("Unauthorized")
    }

    const itemId = data.get("itemId") as string
    const quantityStr = data.get("quantity") as string
    const costStr = data.get("cost") as string
    const notes = (data.get("notes") as string) || ""
    const vendorId = data.get("vendorId") as string || null
    const unitType = data.get("unitType") as string
    const autoDispatchOutletId = data.get("autoDispatchOutletId") as string || null


    const item = await prisma.item.findUnique({ where: { id: itemId } }) as any
    if (!item) return { error: "Item not found" }

    const quantity = parseFloat(quantityStr)
    const inputCost = costStr ? parseFloat(costStr) : 0

    if (isNaN(quantity) || quantity <= 0) {
      return { error: "Invalid quantity" }
    }

    const piecesPerBox = item.piecesPerBox || 1
    const isContainer = unitType === "box" || unitType === "packet" || unitType === "plate"
    const finalQuantity = isContainer ? quantity * piecesPerBox : quantity
    const unitCost = isContainer ? inputCost / piecesPerBox : inputCost
    
    const notePrefix = isContainer ? `[${unitType.toUpperCase()}-ENTRY: ${quantity} ${unitType}s @ ₹${inputCost}/${unitType}] ` : ""

    // Transaction to update Inventory Ledger and Global Catalog
    const transactionOps: any[] = [
      prisma.inventoryLedger.create({
        data: {
          type: "STOCK_IN",
          itemId,
          quantity: finalQuantity,
          vendorId,
          userId: session.user.id,
          notes: `${notePrefix}Cost Info: Cost=${isNaN(unitCost) ? 0 : unitCost.toFixed(4)}. ${notes}`,
        }
      })
    ]

    if (autoDispatchOutletId) {
      transactionOps.push(
        prisma.inventoryLedger.create({
          data: {
            type: "DISPATCH",
            itemId,
            outletId: autoDispatchOutletId,
            quantity: finalQuantity,
            userId: session.user.id,
            notes: `[Auto-dispatched during stock intake] ${notePrefix}`,
          }
        }),
        prisma.outletStock.upsert({
          where: { outletId_itemId: { outletId: autoDispatchOutletId, itemId } },
          update: { quantity: { increment: finalQuantity } },
          create: { outletId: autoDispatchOutletId, itemId, quantity: finalQuantity }
        }),
        prisma.item.update({
          where: { id: itemId },
          data: {
            costPerUnit: isNaN(unitCost) ? undefined : (unitCost || undefined),
          }
        })
      )
    } else {
      transactionOps.push(
        prisma.item.update({
          where: { id: itemId },
          data: {
            currentStock: { increment: finalQuantity },
            costPerUnit: isNaN(unitCost) ? undefined : (unitCost || undefined),
          }
        })
      )
    }

    await prisma.$transaction(transactionOps)


    revalidatePath("/dashboard/inventory/stock-in")
    revalidatePath("/dashboard/inventory")
    return { success: true }
  } catch (error) {
    console.error("Stock In Error:", error)
    return { error: "Failed to log intake. Please try again." }
  }
}
