"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { verifyAdminPin } from "@/lib/server-auth"

export async function addVendor(data: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  const name = data.get("name") as string
  const contact = data.get("contact") as string
  const email = data.get("email") as string
  const address = data.get("address") as string
  const openingBalanceRaw = data.get("openingBalance") as string
  const openingBalance = openingBalanceRaw ? parseFloat(openingBalanceRaw) : 0

  const vendor = await prisma.vendor.create({
    data: { name, contact, email, address },
  })

  if (openingBalance > 0) {
    // Record opening balance as a manual STOCK_IN entry
    await prisma.inventoryLedger.create({
      data: {
        type: "STOCK_IN",
        itemId: "manual_adjustment_item",
        quantity: 1,
        vendorId: vendor.id,
        userId: session.user.id,
        notes: `Opening Balance Cost=${openingBalance}`,
      }
    })
  }

  revalidatePath("/dashboard/inventory")
}

export async function editVendor(data: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  const vendorId = data.get("vendorId") as string
  const name = data.get("name") as string
  const contact = data.get("contact") as string
  const email = data.get("email") as string
  const address = data.get("address") as string

  await prisma.vendor.update({
    where: { id: vendorId },
    data: { name, contact, email, address },
  })

  revalidatePath("/dashboard/vendors")
  revalidatePath("/dashboard/inventory")
}

export async function deleteVendor(data: FormData, pin: string) {
  await verifyAdminPin(pin)
  const vendorId = data.get("vendorId") as string

  // Gracefully remove vendor relation from ledger before deleting
  await prisma.$transaction([
    prisma.inventoryLedger.updateMany({
      where: { vendorId },
      data: { vendorId: null }
    }),
    prisma.vendor.delete({
      where: { id: vendorId }
    })
  ])

  revalidatePath("/dashboard/vendors")
  revalidatePath("/dashboard/inventory")
}

export async function payVendor(data: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  const vendorId = data.get("vendorId") as string
  const amountStr = data.get("amount") as string
  const notes = data.get("notes") as string || ""

  const amount = parseFloat(amountStr)
  if (!vendorId || isNaN(amount) || amount <= 0) {
    throw new Error("Invalid payment data")
  }

  await prisma.vendorPayment.create({
    data: {
      vendorId,
      amount,
      notes: notes || `Payment of ₹${amount}`,
      paidBy: session.user.id,
    }
  })

  revalidatePath("/dashboard/vendors")
}

export async function addManualBill(data: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  const vendorId = data.get("vendorId") as string
  const amountStr = data.get("amount") as string
  const notes = data.get("notes") as string || "Manual Bill Entry"

  const amount = parseFloat(amountStr)
  if (!vendorId || isNaN(amount) || amount <= 0) {
    throw new Error("Invalid bill data")
  }

  // Create a STOCK_IN ledger entry with quantity 1 and Cost=[amount]
  // We use the system-reserved 'manual_adjustment_item'
  await prisma.inventoryLedger.create({
    data: {
      type: "STOCK_IN",
      itemId: "manual_adjustment_item",
      quantity: 1,
      vendorId,
      userId: session.user.id,
      notes: `${notes} Cost=${amount}`,
    }
  })

  revalidatePath("/dashboard/vendors")
}

export async function addItem(data: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  const name = data.get("name") as string
  const category = data.get("category") as string || "Uncategorized"
  const unit = data.get("unit") as string || "pieces"
  const costPerUnitRaw = data.get("costPerUnit") as string
  const sellPriceRaw = data.get("sellPrice") as string
  const minStockRaw = data.get("minStock") as string
  
  const costPerUnit = costPerUnitRaw ? parseFloat(costPerUnitRaw) : null
  const sellPrice = sellPriceRaw ? parseFloat(sellPriceRaw) : null
  const minStock = minStockRaw ? parseFloat(minStockRaw) : 0
  const piecesPerBoxRaw = data.get("piecesPerBox") as string
  const piecesPerBox = piecesPerBoxRaw ? parseInt(piecesPerBoxRaw) : null
  const recipeUnit = data.get("recipeUnit") as string
  const conversionFactorRaw = data.get("conversionFactor") as string
  const conversionFactor = conversionFactorRaw ? parseFloat(conversionFactorRaw) : 1

  await (prisma.item as any).create({
    data: { 
      name, 
      category,
      unit, 
      recipeUnit: recipeUnit || null,
      conversionFactor,
      costPerUnit,
      sellPrice,
      minStock,
      piecesPerBox
    },
  })

  revalidatePath("/dashboard/inventory")
  revalidatePath("/dashboard/inventory/stock-in")
}

export async function addBulkItems(items: any[]) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  if (!items || items.length === 0) return { success: false, error: "No items provided" }

  const formattedItems = items.map(item => ({
    name: item.name,
    category: item.category || "Uncategorized",
    unit: item.unit || "pieces",
    costPerUnit: item.costPerUnit ? parseFloat(item.costPerUnit) : null,
    sellPrice: item.sellPrice ? parseFloat(item.sellPrice) : null,
    minStock: item.minStock ? parseFloat(item.minStock) : 0,
    piecesPerBox: item.piecesPerBox ? parseInt(item.piecesPerBox) : null,
    recipeUnit: item.recipeUnit || null,
    conversionFactor: item.conversionFactor ? parseFloat(item.conversionFactor) : 1,
  }))

  try {
    // using createMany to insert multiple records
    await (prisma.item as any).createMany({
      data: formattedItems,
      skipDuplicates: true, // skip items with same ID or potentially unique fields if defined
    })
  } catch (error) {
    console.error("Bulk add items error:", error)
    throw new Error("Failed to bulk add items")
  }

  revalidatePath("/dashboard/inventory")
  revalidatePath("/dashboard/inventory/stock-in")
  return { success: true, count: formattedItems.length }
}

export async function updateItem(data: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  const itemId = data.get("itemId") as string
  const name = data.get("name") as string
  const category = data.get("category") as string || "Uncategorized"
  const unit = data.get("unit") as string
  const costPerUnitRaw = data.get("costPerUnit") as string
  const sellPriceRaw = data.get("sellPrice") as string
  const minStockRaw = data.get("minStock") as string
  const currentStockRaw = data.get("currentStock") as string
  
  const costPerUnit = costPerUnitRaw ? parseFloat(costPerUnitRaw) : null
  const sellPrice = sellPriceRaw ? parseFloat(sellPriceRaw) : null
  const minStock = minStockRaw ? parseFloat(minStockRaw) : 0
  const currentStock = currentStockRaw ? parseFloat(currentStockRaw) : null
  const piecesPerBoxRaw = data.get("piecesPerBox") as string
  const piecesPerBox = piecesPerBoxRaw ? parseInt(piecesPerBoxRaw) : null

  const recipeUnit = data.get("recipeUnit") as string
  const conversionFactorRaw = data.get("conversionFactor") as string
  const conversionFactor = conversionFactorRaw ? parseFloat(conversionFactorRaw) : 1

  const existingItem = await prisma.item.findUnique({ where: { id: itemId } })
  if (!existingItem) throw new Error("Item not found")

  await (prisma.item as any).update({
    where: { id: itemId },
    data: { 
      name, 
      category,
      unit, 
      recipeUnit: recipeUnit || null,
      conversionFactor,
      costPerUnit,
      sellPrice,
      minStock,
      piecesPerBox,
      currentStock: currentStock !== null ? currentStock : existingItem.currentStock
    },
  })

  // Create adjustment ledger if stock was changed
  if (currentStock !== null && currentStock !== existingItem.currentStock) {
    await prisma.inventoryLedger.create({
      data: {
        type: "ADJUSTMENT",
        itemId: itemId,
        quantity: currentStock - existingItem.currentStock,
        userId: session.user.id,
        notes: `Global Stock Adjustment: ${existingItem.currentStock} -> ${currentStock}`,
      }
    })
  }

  revalidatePath("/dashboard/inventory")
}

export async function removeItem(itemId: string, pin: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  if (!itemId) return

  // Delete related records first to avoid FK constraint errors
  await prisma.$transaction([
    prisma.inventoryLedger.deleteMany({ where: { itemId } }),
    prisma.outletStock.deleteMany({ where: { itemId } }),
    prisma.menuItemIngredient.deleteMany({ where: { itemId } }),
    prisma.menuItem.updateMany({ 
      where: { itemId },
      data: { itemId: null }
    }),
    prisma.item.delete({ where: { id: itemId } }),
  ])

  revalidatePath("/dashboard/inventory")
  revalidatePath("/dashboard/inventory/stock-in")
  revalidatePath("/dashboard/inventory/dispatch")
  revalidatePath("/dashboard/stores")
}

export async function revertLedgerEntry(data: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized — only Admin Owner can revert stock entries")
  }

  const ledgerId = data.get("ledgerId") as string
  if (!ledgerId) return

  const entry = await prisma.inventoryLedger.findUnique({
    where: { id: ledgerId },
  })

  if (!entry) return

  if (entry.type === "STOCK_IN") {
    // Revert: remove what was added to central stock
    await prisma.$transaction([
      prisma.item.update({
        where: { id: entry.itemId },
        data: { currentStock: { decrement: entry.quantity } },
      }),
      prisma.inventoryLedger.delete({ where: { id: ledgerId } }),
    ])
  } else if (entry.type === "DISPATCH" && entry.outletId) {
    // Revert: add back to central stock, remove from outlet stock
    await prisma.$transaction([
      prisma.item.update({
        where: { id: entry.itemId },
        data: { currentStock: { increment: entry.quantity } },
      }),
      prisma.outletStock.update({
        where: { outletId_itemId: { outletId: entry.outletId, itemId: entry.itemId } },
        data: { quantity: { decrement: entry.quantity } },
      }),
      prisma.inventoryLedger.delete({ where: { id: ledgerId } }),
    ])
  }

  revalidatePath("/dashboard/inventory")
  revalidatePath("/dashboard/inventory/stock-in")
  revalidatePath("/dashboard/inventory/dispatch")
  revalidatePath("/dashboard/stores")
}

export async function editDispatchQuantity(data: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized — only Admin Owner can edit stock entries")
  }

  const ledgerId = data.get("ledgerId") as string
  const newQuantityRaw = data.get("newQuantity") as string
  const newQuantity = parseFloat(newQuantityRaw)

  if (!ledgerId || isNaN(newQuantity) || newQuantity <= 0) return

  const entry = await prisma.inventoryLedger.findUnique({
    where: { id: ledgerId },
  })

  if (!entry || entry.type !== "DISPATCH" || !entry.outletId) return

  const diff = newQuantity - entry.quantity

  if (diff === 0) return // No change

  if (diff > 0) {
    // Dispatching MORE: Check central stock
    const item = await prisma.item.findUnique({ where: { id: entry.itemId } })
    if (!item) throw new Error("Item not found")
    if (item.currentStock < diff) {
      throw new Error(`Cannot increase dispatch. Only ${item.currentStock} ${item.unit} available.`)
    }

    await prisma.$transaction([
      prisma.item.update({
        where: { id: entry.itemId },
        data: { currentStock: { decrement: diff } },
      }),
      prisma.outletStock.update({
        where: { outletId_itemId: { outletId: entry.outletId, itemId: entry.itemId } },
        data: { quantity: { increment: diff } },
      }),
      prisma.inventoryLedger.update({
        where: { id: ledgerId },
        data: { quantity: newQuantity, notes: (entry.notes || "") + ` (Edited: was ${entry.quantity})` },
      }),
    ])
  } else {
    // Dispatching LESS: Return difference to central stock
    const absDiff = Math.abs(diff)
    await prisma.$transaction([
      prisma.item.update({
        where: { id: entry.itemId },
        data: { currentStock: { increment: absDiff } },
      }),
      prisma.outletStock.update({
        where: { outletId_itemId: { outletId: entry.outletId, itemId: entry.itemId } },
        data: { quantity: { decrement: absDiff } },
      }),
      prisma.inventoryLedger.update({
        where: { id: ledgerId },
        data: { quantity: newQuantity, notes: (entry.notes || "") + ` (Edited: was ${entry.quantity})` },
      }),
    ])
  }

  revalidatePath("/dashboard/inventory")
  revalidatePath("/dashboard/inventory/stock-in")
  revalidatePath("/dashboard/inventory/dispatch")
  revalidatePath("/dashboard/stores")
}

export async function adjustOutletStock(data: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  const outletId = data.get("outletId") as string
  const itemId = data.get("itemId") as string
  const quantityRaw = data.get("quantity") as string
  const mode = data.get("mode") as "ADD" | "REMOVE" || "REMOVE"
  const quantity = parseFloat(quantityRaw)

  if (!outletId || !itemId || isNaN(quantity) || quantity <= 0) {
    throw new Error("Invalid adjustment data")
  }

  // Find the stock record first
  const stock = await prisma.outletStock.findUnique({
    where: { outletId_itemId: { outletId, itemId } }
  })

  if (mode === "REMOVE") {
    if (!stock || stock.quantity < quantity) {
      throw new Error(`Insufficient stock in outlet. Available: ${stock?.quantity || 0}`)
    }

    // Update outlet stock and log consumption
    await prisma.$transaction([
      prisma.outletStock.update({
        where: { outletId_itemId: { outletId, itemId } },
        data: { quantity: { decrement: quantity } },
      }),
      prisma.inventoryLedger.create({
        data: {
          type: "CONSUMPTION",
          itemId,
          quantity,
          outletId,
          userId: session.user.id,
          notes: `Manual adjustment (Removed from stock)`,
        },
      }),
    ])
  } else {
    // mode === "ADD"
    await prisma.$transaction([
      prisma.outletStock.upsert({
        where: { outletId_itemId: { outletId, itemId } },
        update: { quantity: { increment: quantity } },
        create: { outletId, itemId, quantity },
      }),
      prisma.inventoryLedger.create({
        data: {
          type: "ADJUSTMENT",
          itemId,
          quantity,
          outletId,
          userId: session.user.id,
          notes: `Manual adjustment (Added to stock)`,
        },
      }),
    ])
  }

  revalidatePath("/dashboard/stores")
  revalidatePath("/dashboard/inventory/dispatch")
}
