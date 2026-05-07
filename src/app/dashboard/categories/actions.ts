"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { verifyAdminPin } from "@/lib/server-auth"

export async function getAggregatedCategories() {
  const [items, menuItems] = await Promise.all([
    prisma.item.findMany({ select: { category: true } }),
    prisma.menuItem.findMany({ select: { categoryId: true } })
  ])

  const categoryMap: Record<string, { name: string, inventoryCount: number, menuCount: number }> = {}

  items.forEach(item => {
    // Normalize to UpperCase and Trim
    const name = item.category?.trim().toUpperCase() || "UNCATEGORIZED"
    if (!categoryMap[name]) {
      categoryMap[name] = { name, inventoryCount: 0, menuCount: 0 }
    }
    categoryMap[name].inventoryCount++
  })

  menuItems.forEach(mi => {
    // Normalize to UpperCase and Trim
    const name = mi.categoryId?.trim().toUpperCase() || "UNCATEGORIZED"
    if (!categoryMap[name]) {
      categoryMap[name] = { name, inventoryCount: 0, menuCount: 0 }
    }
    categoryMap[name].menuCount++
  })

  return Object.values(categoryMap).sort((a, b) => 
    (b.inventoryCount + b.menuCount) - (a.inventoryCount + a.menuCount)
  )
}

export async function updateCategoryLabel(oldLabel: string, newLabel: string) {
  // Always standardize to UPPERCASE
  const standardizedNew = newLabel.trim().toUpperCase()
  const standardizedOld = oldLabel.trim().toUpperCase()

  await prisma.$transaction([
    prisma.item.updateMany({
      where: { category: { equals: standardizedOld, mode: 'insensitive' } },
      data: { category: standardizedNew }
    }),
    prisma.menuItem.updateMany({
      where: { categoryId: { equals: standardizedOld, mode: 'insensitive' } },
      data: { categoryId: standardizedNew }
    })
  ])
  
  revalidatePath("/dashboard/categories")
  revalidatePath("/dashboard/inventory")
  revalidatePath("/dashboard/menus")
  revalidatePath("/dashboard/inventory/stock-in")
}

export async function deleteCategory(label: string, pin: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }
  const standardizedLabel = label.trim().toUpperCase()

  await prisma.$transaction([
    prisma.item.updateMany({
      where: { category: { equals: standardizedLabel, mode: 'insensitive' } },
      data: { category: "UNCATEGORIZED" }
    }),
    prisma.menuItem.updateMany({
      where: { categoryId: { equals: standardizedLabel, mode: 'insensitive' } },
      data: { categoryId: "UNCATEGORIZED" }
    })
  ])
  
  revalidatePath("/dashboard/categories")
  revalidatePath("/dashboard/inventory")
  revalidatePath("/dashboard/menus")
}
