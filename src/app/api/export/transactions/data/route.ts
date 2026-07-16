import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getISTDateBounds } from "@/lib/utils"

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const fromDateStr = searchParams.get("from")
  const toDateStr = searchParams.get("to")
  const outletType = searchParams.get("outlet")

  if (session.user.role !== "OWNER") {
    return new NextResponse("Forbidden", { status: 403 })
  }

  // Determine the date bounds
  let startUTC: Date;
  let endUTC: Date;

  if (fromDateStr && toDateStr) {
    const fromBounds = getISTDateBounds(new Date(fromDateStr));
    const toBounds = getISTDateBounds(new Date(toDateStr));
    startUTC = fromBounds.startUTC;
    endUTC = toBounds.endUTC;
  } else {
    const bounds = getISTDateBounds();
    startUTC = bounds.startUTC;
    endUTC = bounds.endUTC;
  }

  const whereClause: any = {
    status: { in: ["CLOSED", "CANCELLED"] },
    closedAt: { gte: startUTC, lte: endUTC }
  }

  if (outletType) {
    const outlet = await prisma.outlet.findFirst({ where: { type: outletType } })
    if (outlet) whereClause.outletId = outlet.id
  }

  const tabs = await prisma.tab.findMany({
    where: whereClause,
    include: {
      Outlet: true,
      Items: {
        include: {
          MenuItem: true
        }
      }
    },
  })

  // Fetch bulk sales from Chai Daily Stock
  const bulkSales = await prisma.chaiHubDailyStock.findMany({
    where: {
      date: { gte: startUTC, lte: endUTC },
      ...(whereClause.outletId ? { outletId: whereClause.outletId } : {})
    },
    include: {
      Outlet: true
    }
  })

  return NextResponse.json({
    range: { from: fromDateStr, to: toDateStr },
    transactions: tabs,
    bulkSales
  })
}
