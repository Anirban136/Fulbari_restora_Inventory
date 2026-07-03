"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { verifyAdminPin } from "@/lib/server-auth"

export async function addMenuItem(data: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  const outletId = data.get("outletId") as string
  const name = data.get("name") as string
  const price = parseFloat(data.get("price") as string)
  const categoryId = (data.get("category") as string)?.toUpperCase().trim() || "GENERAL"
  const itemId = data.get("itemId") as string // Keep for legacy
  const ingredientsRaw = data.get("ingredients") as string
  
  // Parse ingredients if provided
  let ingredients: { itemId: string, quantity: number, unitUsed?: string }[] = []
  if (ingredientsRaw) {
    try {
      ingredients = JSON.parse(ingredientsRaw)
    } catch (e) {
      console.error("Failed to parse ingredients", e)
    }
  }

  if (!outletId || !name || isNaN(price)) return

  if (outletId === "BOTH") {
    // Add to every CAFE and CHAI_JOINT outlet
    const outlets = await prisma.outlet.findMany({
      where: { type: { in: ["CAFE", "CHAI_JOINT"] } }
    })
    
    await prisma.$transaction(async (tx) => {
      for (const o of outlets) {
        const menuItem = await tx.menuItem.create({
          data: {
            outletId: o.id,
            name,
            price,
            categoryId,
            itemId: itemId || null,
          }
        })
        
        if (ingredients.length > 0) {
          await tx.menuItemIngredient.createMany({
            data: ingredients.map(ing => ({
              menuItemId: menuItem.id,
              itemId: ing.itemId,
              quantity: ing.quantity,
              unitUsed: ing.unitUsed || null,
            }))
          })
        }
      }
    })
  } else {
    const menuItem = await prisma.menuItem.create({
      data: {
        outletId,
        name,
        price,
        categoryId: categoryId,
        itemId: itemId || null,
      }
    })
    
    if (ingredients.length > 0) {
      await prisma.menuItemIngredient.createMany({
        data: ingredients.map(ing => ({
          menuItemId: menuItem.id,
          itemId: ing.itemId,
          quantity: ing.quantity,
          unitUsed: ing.unitUsed || null,
        }))
      })
    }
  }

  revalidatePath("/dashboard/menus")
}

export async function toggleMenuItem(menuItemId: string, isAvailable: boolean) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) throw new Error("Unauthorized")

  await prisma.menuItem.update({
    where: { id: menuItemId },
    data: { isAvailable: !isAvailable }
  })

  revalidatePath("/dashboard/menus")
}

export async function updateMenuItem(data: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) throw new Error("Unauthorized")

  const id = data.get("id") as string
  const outletId = data.get("outletId") as string
  const name = data.get("name") as string
  const price = parseFloat(data.get("price") as string)
  const categoryId = (data.get("category") as string)?.toUpperCase().trim() || "GENERAL"
  const itemId = data.get("itemId") as string
  const ingredientsRaw = data.get("ingredients") as string

  let ingredients: { itemId: string, quantity: number, unitUsed?: string }[] = []
  if (ingredientsRaw) {
    try {
      ingredients = JSON.parse(ingredientsRaw)
    } catch (e) {
      console.error("Failed to parse ingredients", e)
    }
  }

  if (!id || !outletId || !name || isNaN(price)) return

  await prisma.$transaction(async (tx) => {
    if (outletId === "BOTH") {
      const outlets = await tx.outlet.findMany({
        where: { type: { in: ["CAFE", "CHAI_JOINT"] } }
      })
      
      const currentItem = await tx.menuItem.findUnique({ where: { id } })
      if (!currentItem) throw new Error("Item not found")

      let primaryOutletId = currentItem.outletId;
      const outletIds = outlets.map(o => o.id);
      if (!outletIds.includes(primaryOutletId)) {
        primaryOutletId = outletIds[0];
      }

      // Update the main item
      await tx.menuItem.update({
        where: { id },
        data: {
          outletId: primaryOutletId,
          name,
          price,
          categoryId,
          itemId: itemId || null,
        }
      })

      // Sync ingredients for primary
      await tx.menuItemIngredient.deleteMany({ where: { menuItemId: id } })
      if (ingredients.length > 0) {
        await tx.menuItemIngredient.createMany({
          data: ingredients.map(ing => ({
            menuItemId: id,
            itemId: ing.itemId,
            quantity: ing.quantity,
            unitUsed: ing.unitUsed || null,
          }))
        })
      }

      // Sync to other outlets
      const remainingOutlets = outlets.filter(o => o.id !== primaryOutletId);
      for (const ro of remainingOutlets) {
        const existing = await tx.menuItem.findFirst({
          where: { outletId: ro.id, name }
        });

        if (existing) {
          await tx.menuItem.update({
            where: { id: existing.id },
            data: { price, categoryId, itemId: itemId || null }
          })
          await tx.menuItemIngredient.deleteMany({ where: { menuItemId: existing.id } })
          if (ingredients.length > 0) {
            await tx.menuItemIngredient.createMany({
              data: ingredients.map(ing => ({
                menuItemId: existing.id,
                itemId: ing.itemId,
                quantity: ing.quantity,
                unitUsed: ing.unitUsed || null,
              }))
            })
          }
        } else {
          const newItem = await tx.menuItem.create({
            data: {
              outletId: ro.id,
              name,
              price,
              categoryId,
              itemId: itemId || null,
            }
          })
          if (ingredients.length > 0) {
            await tx.menuItemIngredient.createMany({
              data: ingredients.map(ing => ({
                menuItemId: newItem.id,
                itemId: ing.itemId,
                quantity: ing.quantity,
                unitUsed: ing.unitUsed || null,
              }))
            })
          }
        }
      }
    } else {
      // Normal single-outlet update
      await tx.menuItem.update({
        where: { id },
        data: {
          outletId,
          name,
          price,
          categoryId,
          itemId: itemId || null,
        }
      })

      await tx.menuItemIngredient.deleteMany({ where: { menuItemId: id } })
      
      if (ingredients.length > 0) {
        await tx.menuItemIngredient.createMany({
          data: ingredients.map(ing => ({
            menuItemId: id,
            itemId: ing.itemId,
            quantity: ing.quantity,
            unitUsed: ing.unitUsed || null,
          }))
        })
      }
    }
  })

  revalidatePath("/dashboard/menus")
}

export async function deleteMenuItem(menuItemId: string, pin: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  // Delete related TabItems first to avoid foreign key constraint errors
  await prisma.$transaction([
    prisma.tabItem.deleteMany({ where: { menuItemId } }),
    prisma.menuItem.delete({ where: { id: menuItemId } })
  ])

  revalidatePath("/dashboard/menus")
}

export async function addBulkMenuItems(items: any[]) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  if (!items || items.length === 0) return { success: false, error: "No items provided" }

  try {
    let count = 0
    await prisma.$transaction(async (tx) => {
      // Find outlets if ANY of the items want BOTH
      const needsBoth = items.some(item => item.outletId === "BOTH")
      let bothOutlets: any[] = []
      if (needsBoth) {
        bothOutlets = await tx.outlet.findMany({
          where: { type: { in: ["CAFE", "CHAI_JOINT"] } }
        })
      }

      for (const item of items) {
        const name = item.name as string
        const price = parseFloat(item.price as string)
        const categoryId = item.category?.toUpperCase().trim() || "GENERAL"
        
        if (!name || isNaN(price)) continue

        if (item.outletId === "BOTH") {
          for (const o of bothOutlets) {
            const menuItem = await tx.menuItem.create({
              data: {
                outletId: o.id,
                name,
                price,
                categoryId,
              }
            })
            if (item.ingredientItemId) {
              await tx.menuItemIngredient.create({
                data: {
                  menuItemId: menuItem.id,
                  itemId: item.ingredientItemId,
                  quantity: parseFloat(item.ingredientQty) || 1
                }
              })
            }
            count++
          }
        } else {
          const menuItem = await tx.menuItem.create({
            data: {
              outletId: item.outletId,
              name,
              price,
              categoryId,
            }
          })
          if (item.ingredientItemId) {
            await tx.menuItemIngredient.create({
              data: {
                menuItemId: menuItem.id,
                itemId: item.ingredientItemId,
                quantity: parseFloat(item.ingredientQty) || 1,
                unitUsed: item.ingredientUnitUsed || null
              }
            })
          }
          count++
        }
      }
    })

    revalidatePath("/dashboard/menus")
    return { success: true, count }
  } catch (error) {
    console.error("Bulk add menu items error:", error)
    return { success: false, error: "Failed to bulk add menu items" }
  }
}
