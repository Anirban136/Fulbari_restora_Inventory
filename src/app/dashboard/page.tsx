import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { TrendingUp, CreditCard, Activity, BarChart3, Crown, Receipt, AlertTriangle, Coffee } from "lucide-react"
import { getISTDateBounds } from "@/lib/utils"
import { GrossRevenueModal } from "@/components/GrossRevenueModal"
import { TransactionsFeed } from "@/components/TransactionsFeed"
import { OutletStockFeed } from "@/components/OutletStockFeed"
import { CriticalSupplyAlert } from "./CriticalSupplyAlert"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { FinancialReports } from "@/components/FinancialReports"
import { HeroHeader } from "@/components/ui/hero-header"

export default async function DashboardOverview() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  
  const role = session.user?.role
  if (role === "INV_MANAGER") redirect('/dashboard/inventory')
  if (role !== "OWNER") redirect('/login')
  
  const { startUTC: startOfDay, endUTC: endOfDay } = getISTDateBounds();
  

  // 1. Fetch Data
  const [todaysClosedTabs, lowStockItems, outletStocks] = await Promise.all([
    prisma.tab.findMany({
      where: { 
        status: { in: ["CLOSED", "PAID_HOLD"] }, 
        closedAt: { gte: startOfDay, lte: endOfDay } 
      },
      include: { 
        Outlet: true,
        Items: {
          include: {
            MenuItem: true
          }
        }
      }
    }),
    prisma.item.findMany({
      where: { minStock: { gt: 0 } },
      orderBy: { name: 'asc' }
    }),
    prisma.outletStock.findMany({
      include: {
        Item: true,
        Outlet: true
      },
      orderBy: {
        Item: { name: 'asc' }
      }
    })
  ])

  // Filter low stock items in JS - strictly check global catalog
  const criticalAlerts = lowStockItems.filter(item => item.currentStock <= item.minStock)

  // 2. Compute the analytics
  let totalRevenue = 0
  
  // Filtered for Chai & Cafe Hero Metrics
  let chaiCafeTotal = 0
  let chaiCafeCash = 0
  let chaiCafeDigital = 0

  const outletStats: Record<string, { total: number, cash: number, online: number, split: number }> = {}
  const categorySales: Record<string, number> = {}
  const itemSales: Record<string, {name: string, qty: number, rev: number}> = {}

  todaysClosedTabs.forEach(tab => {
    const outletName = tab.Outlet.name.toUpperCase();
    const isChai = outletName.includes("CHAI");
    const isCafe = outletName.includes("CAFE");
    const isChaiOrCafe = isChai || isCafe;
    
    if (tab.paymentMode !== "COMPLEMENTARY") {
      totalRevenue += tab.totalAmount
    }

    // Populate Chai/Cafe Specific Metrics
    if (isChaiOrCafe) {
      if (tab.paymentMode !== "COMPLEMENTARY") {
        chaiCafeTotal += tab.totalAmount
      }
      if (tab.paymentMode === "CASH") chaiCafeCash += tab.totalAmount
      if (tab.paymentMode === "ONLINE") chaiCafeDigital += tab.totalAmount
      if (tab.paymentMode === "SPLIT") {
        chaiCafeCash += tab.splitCashAmount ?? (tab.totalAmount / 2)
        chaiCafeDigital += tab.splitOnlineAmount ?? (tab.totalAmount / 2)
      }
    }
    
    if (!outletStats[tab.Outlet.name]) {
      outletStats[tab.Outlet.name] = { total: 0, cash: 0, online: 0, split: 0 }
    }
    if (tab.paymentMode !== "COMPLEMENTARY") {
      outletStats[tab.Outlet.name].total += tab.totalAmount
    }
    if (tab.paymentMode === "CASH") outletStats[tab.Outlet.name].cash += tab.totalAmount
    if (tab.paymentMode === "ONLINE") outletStats[tab.Outlet.name].online += tab.totalAmount
    if (tab.paymentMode === "SPLIT") {
      outletStats[tab.Outlet.name].split += tab.totalAmount
      outletStats[tab.Outlet.name].cash += tab.splitCashAmount ?? (tab.totalAmount / 2)
      outletStats[tab.Outlet.name].online += tab.splitOnlineAmount ?? (tab.totalAmount / 2)
    }

    tab.Items.forEach(item => {
      const cat = item.MenuItem.categoryId || "Misc"
      if (!categorySales[cat]) categorySales[cat] = 0
      const itemRev = tab.paymentMode === "COMPLEMENTARY" ? 0 : (item.priceAtTime * item.quantity)
      categorySales[cat] += itemRev

      if (!itemSales[item.menuItemId]) {
        itemSales[item.menuItemId] = { name: item.MenuItem.name, qty: 0, rev: 0 }
      }
      itemSales[item.menuItemId].qty += item.quantity
      itemSales[item.menuItemId].rev += itemRev
    })
  })

  const sortedCategories = Object.entries(categorySales).sort((a, b) => b[1] - a[1])
  const sortedItems = Object.entries(itemSales).sort((a, b) => b[1].qty - a[1].qty)

  // Explicitly extract cafe and chai entries for the cards
  const cafeEntry = Object.entries(outletStats).find(([name]) => name.toUpperCase().includes("CAFE"));
  const chaiEntry = Object.entries(outletStats).find(([name]) => name.toUpperCase().includes("CHAI"));

  const cafeTotal = cafeEntry ? cafeEntry[1].total : 0;
  const cafeCash = cafeEntry ? cafeEntry[1].cash : 0;
  const cafeDigital = cafeEntry ? cafeEntry[1].online : 0;

  const chaiTotal = chaiEntry ? chaiEntry[1].total : 0;
  const chaiCash = chaiEntry ? chaiEntry[1].cash : 0;
  const chaiDigital = chaiEntry ? chaiEntry[1].online : 0;

  return (
    <div className="space-y-10 relative px-4 pt-6 pb-20 max-w-[1600px] mx-auto">
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <HeroHeader 
        title="Command"
        highlightedWord="Center"
        subtitle={`Live Flow Analysis • ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}`}
        badgeText="Overview"
        statusText="Systems Active"
        icon={<Activity className="w-6 h-6 text-foreground" />}
        sideComponent={<FinancialReports />}
        colorGradient="from-primary/50 to-emerald-500"
        className="mb-8"
      />

      {/* Primary Alerts (Mobile-First / Top Sticky) */}
      <CriticalSupplyAlert criticalAlerts={criticalAlerts} />


      {/* Main Executive Panel (Chai + Cafe) */}
      <div className="space-y-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Hero Card - 7 Column Width on Desktop */}
          <div className="md:col-span-7">
            <GrossRevenueModal totalRevenue={chaiCafeTotal} />
          </div>
          
          {/* Quick Stats - 5 Column Width on Desktop */}
          <div className="md:col-span-5 grid grid-cols-2 gap-4 sm:gap-6">
             <div className="glass-card p-6 rounded-[2.5rem] flex flex-col justify-between hover:-translate-y-2 transition-all duration-500 bg-emerald-500/5 group">
                <div className="flex justify-between items-center">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl group-hover:rotate-12 transition-transform">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground/80 dark:text-muted-foreground/40 uppercase tracking-[0.2em]">Hard Cash</span>
                </div>
                <div className="mt-8">
                  <p className="text-[10px] font-black text-muted-foreground uppercase opacity-80 mb-1">Combined Collected</p>
                  <p className="text-3xl font-black text-foreground">₹{chaiCafeCash.toFixed(0)}</p>
                </div>
             </div>

             <div className="glass-card p-6 rounded-[2.5rem] flex flex-col justify-between hover:-translate-y-2 transition-all duration-500 bg-blue-500/5 group">
                <div className="flex justify-between items-center">
                  <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:rotate-12 transition-transform">
                    <CreditCard className="w-6 h-6 text-blue-500" />
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground/80 dark:text-muted-foreground/40 uppercase tracking-[0.2em]">Digital</span>
                </div>
                <div className="mt-8">
                  <p className="text-[10px] font-black text-muted-foreground uppercase opacity-80 mb-1">Combined UPI</p>
                  <p className="text-3xl font-black text-foreground">₹{chaiCafeDigital.toFixed(0)}</p>
                </div>
             </div>

             {/* Specific Outlet Cards with Breakdowns */}
             <div className="glass-card p-6 rounded-[2.5rem] flex flex-col justify-between hover:-translate-y-2 transition-all duration-500 bg-amber-500/5 group">
                <div className="flex justify-between items-center">
                  <div className="p-3 bg-amber-500/10 rounded-2xl group-hover:rotate-12 transition-transform">
                    <Coffee className="w-6 h-6 text-amber-500" />
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground/80 dark:text-muted-foreground/40 uppercase tracking-[0.2em]">Cafe Branch</span>
                </div>
                <div className="mt-6">
                  <p className="text-[10px] font-black text-muted-foreground uppercase opacity-80 mb-1">Volume</p>
                  <p className="text-3xl font-black text-foreground mb-4">₹{cafeTotal.toFixed(0)}</p>
                  <div className="flex justify-between border-t border-border pt-4">
                    <div className="flex flex-col bg-emerald-500/5 px-3 py-2 rounded-xl">
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Cash</span>
                      <span className="text-lg font-black text-foreground">₹{cafeCash.toFixed(0)}</span>
                    </div>
                    <div className="flex flex-col items-end bg-blue-500/5 px-3 py-2 rounded-xl">
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">UPI</span>
                      <span className="text-lg font-black text-foreground">₹{cafeDigital.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
             </div>

             <div className="glass-card p-6 rounded-[2.5rem] flex flex-col justify-between hover:-translate-y-2 transition-all duration-500 bg-indigo-500/5 group">
                <div className="flex justify-between items-center">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl group-hover:rotate-12 transition-transform">
                    <Activity className="w-6 h-6 text-indigo-500" />
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground/80 dark:text-muted-foreground/40 uppercase tracking-[0.2em]">Chai Joint</span>
                </div>
                <div className="mt-6">
                  <p className="text-[10px] font-black text-muted-foreground uppercase opacity-80 mb-1">Volume</p>
                  <p className="text-3xl font-black text-foreground mb-4">₹{chaiTotal.toFixed(0)}</p>
                  <div className="flex justify-between border-t border-border pt-4">
                    <div className="flex flex-col bg-emerald-500/5 px-3 py-2 rounded-xl">
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Cash</span>
                      <span className="text-lg font-black text-foreground">₹{chaiCash.toFixed(0)}</span>
                    </div>
                    <div className="flex flex-col items-end bg-blue-500/5 px-3 py-2 rounded-xl">
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">UPI</span>
                      <span className="text-lg font-black text-foreground">₹{chaiDigital.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
        
        {/* Category Performance */}
        <div className="glass-panel p-8 rounded-[3rem] relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-[80px]"></div>
          
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-2xl font-black text-foreground tracking-tight uppercase">High Selling Category</h3>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1 opacity-80">Revenue Distribution</p>
            </div>
            <BarChart3 className="text-primary w-8 h-8" />
          </div>

          <div className="space-y-8">
            {sortedCategories.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground font-black uppercase tracking-widest opacity-20 italic">No flow detected</div>
            ) : (
              sortedCategories.slice(0, 6).map(([cat, amount], idx) => {
                const percentage = (amount / totalRevenue) * 100
                return (
                  <div key={cat} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black text-foreground uppercase tracking-tight">{cat}</span>
                      <span className="text-lg font-black text-primary">₹{amount.toFixed(0)}</span>
                    </div>
                    <div className="h-3 bg-muted/20 dark:bg-foreground/5 rounded-full overflow-hidden border border-border">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        style={{ 
                          width: `${percentage}%`,
                          background: `linear-gradient(90deg, oklch(0.55 0.16 150 / 0.6), oklch(0.55 0.16 150))`
                        }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Elite Rank (Top Sellers) */}
        <div className="glass-panel p-8 rounded-[3rem] relative overflow-hidden group">
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]"></div>
          
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-2xl font-black text-foreground tracking-tight uppercase">High Selling Product</h3>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1 opacity-80">High-Velocity Items</p>
            </div>
            <Crown className="text-amber-500 w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-5">
            {sortedItems.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground font-black uppercase tracking-widest opacity-20 italic">Awaiting performers</div>
            ) : (
              sortedItems.slice(0, 5).map(([id, stats], idx) => (
                <div key={id} className={`flex items-center gap-5 p-5 rounded-[2rem] transition-all border ${idx === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-muted/5 border-transparent hover:border-border'}`}>
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${idx === 0 ? 'bg-amber-500 text-primary-foreground shadow-[0_20px_30px_-10px_rgba(245,158,11,0.5)]' : 'bg-muted/20 text-muted-foreground'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-foreground uppercase truncate tracking-tight">{stats.name}</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase mt-0.5">{stats.qty} Units Sold</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-foreground">₹{stats.rev.toFixed(0)}</p>
                    <div className="flex gap-1 mt-1 justify-end">
                      {[...Array(5 - idx)].map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Local Outlet Stock View */}
        <div className="lg:col-span-2">
           <OutletStockFeed stocks={outletStocks} />
        </div>
      </div>

      {/* Real-time Activity Stream with Outlet Filter */}
      <TransactionsFeed tabs={todaysClosedTabs} userRole={session?.user?.role} />

      <div className="text-center pt-10">
         <a href="/dashboard/transactions" className="inline-flex items-center gap-3 px-10 py-4 bg-muted/10 hover:bg-primary hover:text-primary-foreground border border-border rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-xl">
           Explore Full Flow Ledger <Receipt className="w-4 h-4" />
         </a>
      </div>
    </div>
  )
}
