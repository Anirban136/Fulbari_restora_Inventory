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
  let ingredients: { itemId: string, quantity: number }[] = []
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

  let ingredients: { itemId: string, quantity: number }[] = []
  if (ingredientsRaw) {
    try {
      ingredients = JSON.parse(ingredientsRaw)
    } catch (e) {
      console.error("Failed to parse ingredients", e)
    }
  }

  if (!id || !outletId || !name || isNaN(price)) return

  await prisma.$transaction(async (tx) => {
    // Update main item
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

    // Sync ingredients (delete and recreate)
    await tx.menuItemIngredient.deleteMany({ where: { menuItemId: id } })
    
    if (ingredients.length > 0) {
      await tx.menuItemIngredient.createMany({
        data: ingredients.map(ing => ({
          menuItemId: id,
          itemId: ing.itemId,
          quantity: ing.quantity,
        }))
      })
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
