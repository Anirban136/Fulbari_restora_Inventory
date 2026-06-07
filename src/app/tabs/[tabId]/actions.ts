"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getISTDateBounds } from "@/lib/utils"

export async function addTabItem(tabId: string, menuItemId: string, price: number, forcedQuantity: number = 1, isBox: boolean = false) {
  // Check if it already exists to increment quantity instead
  const existingItem = await prisma.tabItem.findFirst({
    where: { tabId, menuItemId, isBox }
  })

  if (existingItem) {
    await prisma.tabItem.update({
      where: { id: existingItem.id },
      data: { quantity: { increment: forcedQuantity } }
    })
  } else {
    await prisma.tabItem.create({
      data: { tabId, menuItemId, priceAtTime: price, quantity: forcedQuantity, isBox }
    })
  }

  // Update tab total
  await prisma.tab.update({
    where: { id: tabId },
    data: { totalAmount: { increment: price * forcedQuantity } }
  })

  revalidatePath(`/tabs/${tabId}`)
}

export async function removeTabItem(tabItemId: string, tabId: string, priceDesc: number) {
  await prisma.tabItem.delete({ where: { id: tabItemId } })
  
  await prisma.tab.update({
    where: { id: tabId },
    data: { totalAmount: { decrement: priceDesc } }
  })

  revalidatePath(`/tabs/${tabId}`)
}

export async function adjustTabItemQuantity(tabItemId: string, tabId: string, delta: number, pricePerUnit: number) {
  const item = await prisma.tabItem.findUnique({ where: { id: tabItemId } })
  if (!item) return
  if (delta === 0) return

  let appliedDelta = delta

  // If decrement would bring quantity to zero (or below), remove item entirely.
  if (item.quantity + delta <= 0) {
    appliedDelta = -item.quantity
    await prisma.tabItem.delete({ where: { id: tabItemId } })
  } else {
    await prisma.tabItem.update({
      where: { id: tabItemId },
      data: { quantity: { increment: appliedDelta } }
    })
  }

  // Update tab total amount
  await prisma.tab.update({
    where: { id: tabId },
    data: { totalAmount: { increment: pricePerUnit * appliedDelta } }
  })

  revalidatePath(`/tabs/${tabId}`)
}

export async function updateTabItemQuantity(tabItemId: string, tabId: string, newQuantity: number, pricePerUnit: number) {
  const item = await prisma.tabItem.findUnique({ where: { id: tabItemId } })
  if (!item) return
  
  if (newQuantity <= 0) {
    const delta = -item.quantity
    await prisma.tabItem.delete({ where: { id: tabItemId } })
    await prisma.tab.update({
      where: { id: tabId },
      data: { totalAmount: { increment: pricePerUnit * delta } }
    })
  } else {
    const delta = newQuantity - item.quantity
    await prisma.tabItem.update({
      where: { id: tabItemId },
      data: { quantity: newQuantity }
    })
    await prisma.tab.update({
      where: { id: tabId },
      data: { totalAmount: { increment: pricePerUnit * delta } }
    })
  }

  revalidatePath(`/tabs/${tabId}`)
}


export async function closeTab(data: FormData) {
  const tabId = data.get("tabId") as string
  const isHold = data.get("isHold") === "true"
  const paymentMode = data.get("paymentMode") as string
  const splitCashAmountRaw = data.get("splitCashAmount") as string
  const splitOnlineAmountRaw = data.get("splitOnlineAmount") as string
  
  const splitCashAmount = splitCashAmountRaw ? parseFloat(splitCashAmountRaw) : null
  const splitOnlineAmount = splitOnlineAmountRaw ? parseFloat(splitOnlineAmountRaw) : null
  
  // Validate NaN (parseFloat can return NaN if input is trash)
  if (paymentMode === "SPLIT" && (isNaN(splitCashAmount || 0) || isNaN(splitOnlineAmount || 0))) {
    throw new Error("Invalid split amounts")
  }

  const tab = await prisma.tab.findUnique({ 
    where: { id: tabId }, 
    include: { 
      Outlet: true, 
      Items: { 
        include: { 
          MenuItem: { 
            include: { 
              ingredients: {
                include: {
                  Item: true
                }
              } 
            } 
          } 
        } 
      } 
    }
  })
  if (!tab) return

  // Deduct inventory ONLY for items not already paid
  const unpaidItems = tab.Items.filter(item => !item.isPaid)
  let sessionSubtotal = 0

  for (const tabItem of unpaidItems) {
     const { MenuItem: menuItem, quantity: orderQty } = tabItem
     sessionSubtotal += tabItem.priceAtTime * orderQty

     // 2. Handle Multi-Ingredient Recipes
     if (menuItem.ingredients && menuItem.ingredients.length > 0) {
       for (const ingredient of menuItem.ingredients) {
         const piecesMultiplier = tabItem.isBox ? (ingredient.Item.piecesPerBox || 1) : 1
         const totalDuction = ingredient.quantity * orderQty * piecesMultiplier
         try {
           await prisma.outletStock.upsert({
             where: { outletId_itemId: { outletId: tab.outletId, itemId: ingredient.itemId } },
             create: { 
               outletId: tab.outletId, 
               itemId: ingredient.itemId, 
               quantity: -totalDuction 
             },
             update: { quantity: { decrement: totalDuction } }
           })

           await prisma.inventoryLedger.create({
             data: {
               type: "CONSUMPTION",
               itemId: ingredient.itemId,
               outletId: tab.outletId,
               quantity: totalDuction,
               userId: tab.userId,
               notes: `POS Recipe Deduction for ${menuItem.name} (Tab ${tab.id})`
             }
           })
         } catch (e) {
           console.error(`Failed to deduct recipe ingredient (${ingredient.itemId}) for ${menuItem.name}`, e)
         }
       }
     }
  }

  // Mark all currently unpaid items as paid
  if (unpaidItems.length > 0) {
    await prisma.tabItem.updateMany({
      where: { id: { in: unpaidItems.map(i => i.id) } },
      data: { isPaid: true }
    })
  }

  // Generate token number for CAFE & CHAI_JOINT (daily auto-increment) if none exists
  let tokenNumber: number | null = tab.tokenNumber
  if (!tokenNumber && (tab.Outlet.type === "CAFE" || tab.Outlet.type === "CHAI_JOINT")) {
    const { startUTC: todayStart } = getISTDateBounds()
    
    const lastToken = await prisma.tab.findFirst({
      where: {
        outletId: tab.outletId,
        tokenNumber: { not: null },
        openedAt: { gte: todayStart }
      },
      orderBy: { tokenNumber: 'desc' }
    })
    
    tokenNumber = (lastToken?.tokenNumber || 0) + 1
  }

  await prisma.tab.update({
    where: { id: tabId },
    data: {
      status: isHold ? "PAID_HOLD" : "CLOSED",
      paymentMode,
      tokenNumber,
      totalPaid: { increment: paymentMode === "COMPLEMENTARY" ? 0 : sessionSubtotal },
      closedAt: new Date(),
      splitCashAmount: paymentMode === "SPLIT" ? splitCashAmount : null,
      splitOnlineAmount: paymentMode === "SPLIT" ? splitOnlineAmount : null
    }
  })

  revalidatePath(`/tabs/${tabId}`)
  revalidatePath(`/tabs`)
  revalidatePath(`/cafe`)
  revalidatePath(`/chai`)
  revalidatePath(`/dashboard`)
}

export async function reopenTab(tabId: string) {
  const tab = await prisma.tab.findUnique({ 
    where: { id: tabId }, 
    include: { 
      Outlet: true, 
      Items: { 
        include: { 
          MenuItem: { 
            include: { 
              ingredients: {
                include: {
                  Item: true
                }
              } 
            } 
          } 
        } 
      } 
    }
  })
  if (!tab || tab.status !== "CLOSED") return

  // Reverse inventory deductions (Both Legacy and Recipes)
  for (const tabItem of tab.Items) {
     const { MenuItem: menuItem, quantity: orderQty } = tabItem

     // 2. Revert Multi-Ingredient Recipes
     if (menuItem.ingredients && menuItem.ingredients.length > 0) {
       for (const ingredient of menuItem.ingredients) {
         const piecesMultiplier = tabItem.isBox ? (ingredient.Item.piecesPerBox || 1) : 1
         const totalReversal = ingredient.quantity * orderQty * piecesMultiplier
         try {
           await prisma.outletStock.update({
             where: { outletId_itemId: { outletId: tab.outletId, itemId: ingredient.itemId } },
             data: { quantity: { increment: totalReversal } }
           })

           await prisma.inventoryLedger.create({
             data: {
               type: "REVERSAL",
               itemId: ingredient.itemId,
               outletId: tab.outletId,
               quantity: totalReversal,
               userId: tab.userId,
               notes: `Recipe Reversal for ${menuItem.name} (Tab ${tab.id})`
             }
           })
         } catch (e) {
           console.error(`Failed to revert recipe ingredient (${ingredient.itemId}) for ${menuItem.name}`, e)
         }
       }
     }
  }

  await prisma.tab.update({
    where: { id: tabId },
    data: {
      status: "OPEN",
      closedAt: null
    }
  })

  // We are already in server action, next/navigation redirect works here
  redirect(`/tabs/${tabId}`)
}

export async function updateTab(tabId: string, totalAmount: number, paymentMode: string) {
  await prisma.tab.update({
    where: { id: tabId },
    data: { 
      totalAmount,
      paymentMode
    }
  })
  
  revalidatePath('/dashboard')
  revalidatePath('/cafe')
  revalidatePath('/chai')
  revalidatePath(`/tabs/${tabId}`)
}


export async function assignTokenToTab(tabId: string) {
  const tab = await prisma.tab.findUnique({
    where: { id: tabId },
    include: { Outlet: true }
  })
  if (!tab || tab.tokenNumber) return tab?.tokenNumber

  let tokenNumber: number | null = null
  if (tab.Outlet.type === "CAFE" || tab.Outlet.type === "CHAI_JOINT") {
    const { startUTC: todayStart } = getISTDateBounds()
    
    const lastToken = await prisma.tab.findFirst({
      where: {
        outletId: tab.outletId,
        tokenNumber: { not: null },
        openedAt: { gte: todayStart }
      },
      orderBy: { tokenNumber: 'desc' }
    })
    
    tokenNumber = (lastToken?.tokenNumber || 0) + 1
  }

  if (tokenNumber) {
    await prisma.tab.update({
      where: { id: tabId },
      data: { tokenNumber }
    })
    revalidatePath(`/tabs/${tabId}`)
    revalidatePath(`/tabs`)
    revalidatePath(`/cafe`)
    revalidatePath(`/chai`)
  }

  return tokenNumber
}

