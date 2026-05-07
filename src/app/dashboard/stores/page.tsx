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
    <div className="min-h-screen bg-[#0a0a0c] relative overflow-hidden">
      {/* Background radial highlights */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] rounded-full"></div>
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-emerald-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 p-4 lg:p-8">
        <OutletStockClient 
          outlets={outlets} 
          recentConsumptions={recentActivities} 
        />
      </div>
    </div>
  )
}
