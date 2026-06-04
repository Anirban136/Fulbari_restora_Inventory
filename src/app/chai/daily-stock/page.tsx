import { prisma } from "@/lib/prisma"
export const dynamic = "force-dynamic"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import AppLayout from "@/components/layouts/app-layout"
import { ChaiDailyStockSheet, type StockItem } from "@/components/ChaiDailyStockSheet"
import { ClipboardList, CupSoda, CalendarDays, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

function getISTDateOnly(): Date {
  const istOffset = 5.5 * 3600000
  const logicalDate = new Date(new Date().getTime() + istOffset)
  if (logicalDate.getUTCHours() < 4) {
    logicalDate.setUTCDate(logicalDate.getUTCDate() - 1)
  }
  return new Date(
    Date.UTC(
      logicalDate.getUTCFullYear(),
      logicalDate.getUTCMonth(),
      logicalDate.getUTCDate()
    )
  )
}

export default async function ChaiDailyStockPage() {
  const session = await getServerSession(authOptions)

  const chaiJoint = await prisma.outlet.findFirst({
    where: { type: "CHAI_JOINT" },
  })

  if (!chaiJoint) {
    return (
      <div className="min-h-screen bg-background text-foreground p-10 font-bold">
        Chai Joint outlet not configured.
      </div>
    )
  }

  const today = getISTDateOnly()
  const dateStr = today.toISOString().split("T")[0]

  // Formatted date for display
  const displayDate = new Date(today.getTime() + 5.5 * 3600000).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })

  // All available menu items
  const menuItems = await prisma.menuItem.findMany({
    where: { outletId: chaiJoint.id, isAvailable: true },
    include: { ingredients: true },
    orderBy: [{ categoryId: "asc" }, { name: "asc" }],
  })

  // Outlet stock
  const outletStocks = await prisma.outletStock.findMany({
    where: { outletId: chaiJoint.id },
  })
  const stockMap = new Map(outletStocks.map((s) => [s.itemId, s.quantity]))

  // Any existing submission for today
  const todaySubmissions = await prisma.chaiHubDailyStock.findMany({
    where: { outletId: chaiJoint.id, date: today },
  })
  const submissionMap = new Map(todaySubmissions.map((s) => [s.menuItemId, s]))

  const items: StockItem[] = menuItems.map((mi) => {
    const existing = submissionMap.get(mi.id)
    
    let startStock = 0;
    let actualItemId = mi.itemId;
    
    if (mi.itemId && stockMap.has(mi.itemId)) {
      startStock = stockMap.get(mi.itemId) ?? 0;
    } else if (mi.ingredients && mi.ingredients.length > 0) {
      const primaryIng = mi.ingredients[0];
      actualItemId = primaryIng.itemId;
      const stock = stockMap.get(primaryIng.itemId) ?? 0;
      startStock = primaryIng.quantity > 0 ? Math.floor(stock / primaryIng.quantity) : 0;
    }

    return {
      menuItemId: mi.id,
      menuItemName: mi.name,
      category: mi.categoryId ?? "Uncategorized",
      price: mi.price,
      itemId: actualItemId ?? null,
      startStock: existing ? existing.startStock : startStock,
      endStock: existing ? existing.endStock : null,
      salesQty: existing ? existing.salesQty : null,
      salesAmount: existing ? existing.salesAmount : null,
      alreadySubmitted: !!existing,
    }
  })

  return (
    <AppLayout user={session?.user}>
      <div className="w-full max-w-6xl px-6 py-10 relative z-10 flex flex-col min-h-full">

        {/* Page Header */}
        <header className="flex items-start justify-between pb-8 mb-8 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-sky-600 rounded-2xl flex items-center justify-center border border-border shadow-[0_0_30px_-5px_oklch(0.65_0.22_25_/_0.5)] p-1">
              <div className="h-full w-full bg-background/50 rounded-xl flex items-center justify-center backdrop-blur-md">
                <ClipboardList className="text-blue-600 dark:text-blue-400 w-6 h-6" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight">
                Daily Closing Stock
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <CupSoda className="w-3.5 h-3.5 text-blue-500" />
                <p className="text-blue-600 dark:text-blue-500 font-bold tracking-widest uppercase text-xs">
                  {chaiJoint.name}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <Link href="/chai">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-4 text-[10px] font-black text-muted-foreground hover:text-foreground hover:bg-foreground/5 border border-border rounded-xl uppercase tracking-widest"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Chai Hub
              </Button>
            </Link>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/5 border border-border">
              <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] font-black text-foreground/70 uppercase tracking-wider">{displayDate}</span>
            </div>
          </div>
        </header>

        {/* Instructions Banner */}
        <div className="mb-8 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/15 flex items-start gap-4">
          <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <ClipboardList className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-black text-foreground uppercase tracking-tight mb-1">How to use this page</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Count the physical stock remaining at the Chai Hub counter for each product and enter it in the{" "}
              <span className="font-black text-blue-500">Ending Stock</span> column.
              The system automatically calculates <span className="font-black text-foreground">Today's Sales</span> and{" "}
              <span className="font-black text-foreground">Revenue</span>.
              When done, press <span className="font-black text-foreground">Finalise Daily Closing Stock</span> — this saves
              the data and downloads the Excel report. The ending stock you enter tonight becomes tomorrow's starting stock.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center opacity-20">
            <ClipboardList className="w-16 h-16 mb-4" />
            <p className="font-black tracking-[0.4em] uppercase text-xs text-muted-foreground">
              No menu items found for this outlet
            </p>
          </div>
        ) : (
          <ChaiDailyStockSheet
            initialItems={items}
            date={dateStr}
            outletId={chaiJoint.id}
            outletName={chaiJoint.name}
          />
        )}
      </div>
    </AppLayout>
  )
}
