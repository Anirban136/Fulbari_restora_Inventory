import { config } from 'dotenv'
config({ path: '.env.local' })
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Starting data wipe...")

  // Delete in order of dependencies (child to parent) to avoid foreign key constraints
  console.log("Deleting TabItems and Tabs...")
  await prisma.tabItem.deleteMany()
  await prisma.tab.deleteMany()
  
  console.log("Deleting Vendor Payments and Inventory Ledgers...")
  await prisma.vendorPayment.deleteMany()
  await prisma.inventoryLedger.deleteMany()
  
  console.log("Deleting Outlet Stocks...")
  await prisma.outletStock.deleteMany()
  
  console.log("Deleting MenuItems and Items...")
  await prisma.menuItem.deleteMany()
  await prisma.item.deleteMany()
  
  console.log("Deleting Vendors...")
  await prisma.vendor.deleteMany()

  console.log("\nDatabase successfully wiped!")
  console.log("RETAINED: Users (Passwords) and Outlets.")
}

main()
  .catch((e: any) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
