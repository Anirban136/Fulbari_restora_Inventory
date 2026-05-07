"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function wipeTestData(pin: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized: Administrative authorization required")
  }

  // Double verification: check if provided PIN matches the user's PIN in DB
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { pin: true }
  })

  if (!user || user.pin !== pin) {
    throw new Error("Invalid PIN: Verification failed. Data was not wiped.")
  }

  // Delete operational data first to avoid foreign key constraints
  await prisma.$transaction([
    prisma.tabItem.deleteMany(),
    prisma.tab.deleteMany(),
    prisma.vendorPayment.deleteMany(),
    prisma.inventoryLedger.deleteMany(),
    prisma.outletStock.deleteMany(),
    prisma.menuItem.deleteMany(),
    prisma.item.deleteMany(),
    prisma.vendor.deleteMany(),
  ])

  revalidatePath("/")
  revalidatePath("/dashboard")
}
