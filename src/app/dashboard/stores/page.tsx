import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { OutletStockClient } from "./OutletStockClient"

export default async function OutletsStockPage() {
  const outlets = await prisma.outlet.findMany({
    include: {
      Stock: {
        include: { Item: true }
      }
    },
    orderBy: { name: 'asc' }
  })

  // Fetch recent ledger entries
  const recentActivities = await prisma.inventoryLedger.findMany({
    where: { 
      OR: [
        { type: 'CONSUMPTION' },
        { type: 'ADJUSTMENT' }
      ]
    },
    include: { Item: true, Outlet: true },
    orderBy: { createdAt: 'desc' },
    take: 12
  })

  return (
    <div className="relative overflow-hidden p-4 lg:p-8">
      <OutletStockClient 
        outlets={outlets} 
        recentConsumptions={recentActivities} 
      />
    </div>
  )
}
