import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { Button } from "@/components/ui/button"
import { UserControls } from "@/components/user-controls"
import { CupSoda, PackageOpen, LayoutGrid, Search, History, Receipt, Edit, ClipboardList } from "lucide-react"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { formatTimeIST, formatDateIST, getISTDateBounds, getISTMonthBounds, cn } from "@/lib/utils"
import AppLayout from "@/components/layouts/app-layout"
import { TabReceiptModal } from "@/components/TabReceiptModal"
import { PrintReceiptButton } from "@/components/PrintReceiptButton"
import { reopenTab } from "@/app/tabs/[tabId]/actions"
import { DateRangePicker } from "@/components/DateRangePicker"
import { redirect } from "next/navigation"

export default async function ChaiDashboard({ searchParams }: { searchParams: Promise<{ start?: string, end?: string }> }) {
  const { start, end } = await searchParams || {}
  const chaiJoint = await prisma.outlet.findFirst({ where: { type: "CHAI_JOINT" }})
  
  if (!chaiJoint) return <div className="min-h-screen bg-background text-foreground p-10 font-bold">Chai Joint outlet not configured.</div>

  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const role = session.user?.role
  if (role !== "OWNER" && role !== "CHAI_STAFF") {
    if (role === "CAFE_STAFF") redirect('/cafe')
    if (role === "REST_STAFF") redirect('/restaurant')
    redirect('/dashboard')
  }
  const isOwner = role === "OWNER"

  const { startUTC: todayStart, endUTC: todayEnd } = getISTDateBounds();
  const { startUTC: monthStart, endUTC: monthEnd } = getISTMonthBounds();

  let reportStart = monthStart
  let reportEnd = monthEnd

  if (start) reportStart = getISTDateBounds(new Date(start)).startUTC
  if (end) reportEnd = getISTDateBounds(new Date(end)).endUTC

  // Generate last 7 days array for reporting
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const displayDate = d.toLocaleDateString("en-IN", { weekday: 'short', month: 'short', day: 'numeric' });
    return { dateStr, displayDate, isToday: i === 0 };
  });

  // Helper to get today's logical date for ChaiHubDailyStock
  const now = new Date();
  const istOffset = 5.5 * 3600000;
  const logicalDate = new Date(now.getTime() + istOffset);
  if (logicalDate.getUTCHours() < 4) {
    logicalDate.setUTCDate(logicalDate.getUTCDate() - 1);
  }
  const todayLogicalDate = new Date(Date.UTC(logicalDate.getUTCFullYear(), logicalDate.getUTCMonth(), logicalDate.getUTCDate()));

  const [localStock, incomingDispatches, recentTabs, dailyStockSales] = await Promise.all([
    prisma.outletStock.findMany({
      where: { outletId: chaiJoint.id, quantity: { gt: 0 } },
      include: { Item: true },
      orderBy: { Item: { name: 'asc' } }
    }),
    prisma.inventoryLedger.findMany({
      where: { outletId: chaiJoint.id, type: "DISPATCH" },
      include: { Item: true, User: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.tab.findMany({
      where: { 
        outletId: chaiJoint.id, 
        status: "CLOSED",
        closedAt: { gte: todayStart, lte: todayEnd } 
      },
      include: {
        User: true,
        Items: { include: { MenuItem: true } }
      },
      orderBy: { closedAt: 'desc' }
    }),
    prisma.chaiHubDailyStock.findMany({
      where: {
        outletId: chaiJoint.id,
        date: todayLogicalDate,
      }
    })
  ])

  const monthlyTabs = await prisma.tab.findMany({
    where: {
      outletId: chaiJoint.id,
      status: "CLOSED",
      closedAt: { gte: reportStart, lte: reportEnd }
    },
    include: { Items: { include: { MenuItem: true } } }
  })

  const itemStats: Record<string, number> = {}
  monthlyTabs.forEach(tab => {
    tab.Items.forEach(item => {
      const name = item.MenuItem.name
      itemStats[name] = (itemStats[name] || 0) + item.quantity
    })
  })
  const sortedItemStats = Object.entries(itemStats).sort((a, b) => b[1] - a[1])

  const todaysTabs = recentTabs;

  const dailyReport = todaysTabs.reduce((acc, tab) => {
    if (tab.paymentMode === 'CASH') {
      acc.CASH += tab.totalAmount
    } else if (tab.paymentMode === 'ONLINE') {
      acc.ONLINE += tab.totalAmount
    } else if (tab.paymentMode === 'SPLIT') {
      acc.CASH += tab.splitCashAmount ?? 0
      acc.ONLINE += tab.splitOnlineAmount ?? 0
      acc.SPLIT += tab.totalAmount
    }
    acc.TOTAL += tab.totalAmount
    return acc
  }, { CASH: 0, ONLINE: 0, SPLIT: 0, BULK_CASH: 0, TOTAL: 0 });

  const bulkSalesAmount = dailyStockSales.reduce((sum, stock) => sum + (stock.salesAmount || 0), 0);
  if (bulkSalesAmount > 0) {
    dailyReport.BULK_CASH = bulkSalesAmount;
    dailyReport.CASH += bulkSalesAmount;
    dailyReport.TOTAL += bulkSalesAmount;
  }

  return (
    <AppLayout user={session?.user}>
      <div className="w-full max-w-6xl px-6 py-10 relative z-10 flex flex-col min-h-full">
        
        <header className="flex items-center justify-between pb-8 mb-8 border-b border-border">
          <div className="flex items-center gap-4">
             <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-sky-600 rounded-2xl flex items-center justify-center border border-border shadow-[0_0_30px_-5px_oklch(0.65_0.22_25_/_0.5)] p-1">
               <div className="h-full w-full bg-background/50 rounded-xl flex items-center justify-center backdrop-blur-md">
                 <CupSoda className="text-blue-600 dark:text-blue-400 w-6 h-6" />
               </div>
             </div>
            <div>
              <h1 className="text-4xl font-black text-foreground tracking-tight">Chai Joint Hub</h1>
              <p className="text-blue-600 dark:text-blue-500 font-bold mt-1 tracking-widest uppercase text-xs">Manager & POS Operations</p>
            </div>
          </div>
        </header>

        <div className="space-y-12">
          {/* 1. TOP PRIORITY: TODAY'S REPORT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <section className="animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="glass-panel p-8 rounded-[2.5rem] group transition-all border border-blue-500/10 hover:border-blue-500/20 bg-foreground/5 shadow-xl">
                  <h2 className="text-xl font-black text-foreground uppercase tracking-widest mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-6 h-6 text-blue-500" />
                      <span>Today's Report</span>
                    </div>
                    {isOwner && (
                      <a href="/api/export/transactions?outlet=CHAI_JOINT" download>
                        <Button variant="ghost" size="sm" className="h-9 px-3 text-[10px] font-black text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 rounded-xl">
                          Download CSV
                        </Button>
                      </a>
                    )}
                  </h2>
                 
                 <div className="space-y-4">
                   <div className="flex justify-between items-center bg-foreground/5 p-5 rounded-2xl border border-border">
                     <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-3">
                          <span className="text-xl">💵</span>
                          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Cash Revenue</span>
                       </div>
                       {dailyReport.BULK_CASH > 0 && (
                         <span className="text-[9px] font-bold text-blue-500/80 uppercase tracking-widest ml-9">
                           Includes ₹{dailyReport.BULK_CASH.toFixed(2)} Bulk Sales
                         </span>
                       )}
                     </div>
                     <span className="text-xl font-black text-foreground">₹{dailyReport.CASH.toFixed(2)}</span>
                   </div>
                   
                   <div className="flex justify-between items-center bg-foreground/5 p-5 rounded-2xl border border-border">
                     <div className="flex items-center gap-3">
                        <span className="text-xl">💳</span>
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Online Revenue</span>
                     </div>
                     <span className="text-xl font-black text-foreground">₹{dailyReport.ONLINE.toFixed(2)}</span>
                   </div>
  
                   {dailyReport.SPLIT > 0 && (
                     <div className="flex justify-between items-center bg-foreground/5 p-5 rounded-2xl border border-border">
                       <div className="flex items-center gap-3">
                          <span className="text-xl">🔄</span>
                          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Split/Other</span>
                       </div>
                       <span className="text-xl font-black text-foreground">₹{dailyReport.SPLIT.toFixed(2)}</span>
                     </div>
                   )}
  
                   <div className="flex justify-between items-center bg-blue-500/[0.08] p-6 rounded-[2rem] border border-blue-500/20 mt-6 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.2)]">
                     <span className="text-sm font-black text-blue-500 uppercase tracking-[0.2em]">Total Gross</span>
                     <span className="text-3xl font-black text-blue-600 dark:text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.4)] text-glow">
                       ₹{dailyReport.TOTAL.toFixed(2)}
                     </span>
                   </div>
                 </div>
              </div>
            </section>
  
            {/* MONTHLY ITEM SALES SECTION */}
            <section className="animate-in fade-in slide-in-from-top-4 duration-700 delay-100">
               <div className="glass-panel p-8 rounded-[2.5rem] border border-border bg-foreground/5 h-full flex flex-col">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-xl font-black text-foreground uppercase tracking-widest flex items-center gap-3">
                        <PackageOpen className="w-6 h-6 text-blue-500" />
                        <span>Monthly Performance</span>
                      </h2>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Item-wise incentive count</p>
                    </div>
                    <div className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-widest uppercase">
                      {formatDateIST(reportStart)} - {formatDateIST(reportEnd)}
                    </div>
                  </div>

                  <div className="mb-8">
                    <DateRangePicker initialStart={start} initialEnd={end} />
                  </div>
  
                  <div className="flex-1 overflow-auto max-h-[300px] pr-2 custom-scrollbar-premium">
                    {sortedItemStats.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-10 opacity-20">
                        <Search className="w-10 h-10 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No sales this month</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sortedItemStats.map(([name, qty]) => (
                          <div key={name} className="flex items-center justify-between p-4 rounded-2xl bg-foreground/5 border border-border group hover:border-blue-500/20 transition-all">
                            <span className="text-sm font-bold text-foreground group-hover:text-blue-500 transition-colors uppercase tracking-tight truncate mr-4">
                              {name}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                               <span className="text-2xl font-black text-foreground tracking-tighter">{qty}</span>
                               <span className="text-[10px] font-black text-blue-500/60 uppercase">Units</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
               </div>
            </section>
          </div>

                 {/* 2. MAIN HUB ACTIONS & TRANSACTIONS (FLATTENED GRID FOR ORDERING) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* A. POS Register (Priority 2) */}
            <div className="lg:col-span-4 order-2">
               <div className="glass-panel p-8 rounded-[2.5rem] group hover:border-blue-500/30 transition-all border border-border bg-foreground/5 relative overflow-hidden shadow-2xl">
                  <div className="absolute -right-4 -top-4 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] group-hover:bg-blue-500/10 transition-all pointer-events-none"></div>
                  <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <LayoutGrid className="w-7 h-7 text-blue-600 dark:text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                  </div>
                  <h2 className="text-3xl font-black text-foreground mb-2 leading-none uppercase tracking-tighter italic">POS Register</h2>
                  <p className="text-muted-foreground font-medium text-xs mb-8 uppercase tracking-widest opacity-80">Take new orders & manage inventory</p>
                  <Link href="/tabs?target=CHAI_JOINT" className="w-full flex">
                    <Button className="flex-1 w-full h-16 text-sm font-black tracking-[0.2em] uppercase bg-blue-600 text-primary-foreground hover:bg-blue-700 transition-all rounded-2xl active:scale-95 shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)]">
                      Open Registers
                    </Button>
                  </Link>
               </div>
            </div>

            {/* D. Daily Closing Stock (Priority 1) */}
            <div className="lg:col-span-4 order-1">
               <div className="glass-panel p-8 rounded-[2.5rem] group hover:border-blue-500/30 transition-all border border-border bg-foreground/5 relative overflow-hidden shadow-2xl">
                  <div className="absolute -right-4 -top-4 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] group-hover:bg-blue-500/10 transition-all pointer-events-none"></div>
                  <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <ClipboardList className="w-7 h-7 text-blue-600 dark:text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                  </div>
                  <h2 className="text-3xl font-black text-foreground mb-2 leading-none uppercase tracking-tighter italic">Daily Closing</h2>
                  <p className="text-muted-foreground font-medium text-xs mb-8 uppercase tracking-widest opacity-80">Record ending stock & get sales Excel</p>
                  <Link href="/chai/daily-stock" className="w-full flex">
                    <Button className="flex-1 w-full h-16 text-sm font-black tracking-[0.2em] uppercase bg-blue-600 text-primary-foreground hover:bg-blue-700 transition-all rounded-2xl active:scale-95 shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)]">
                      Open Stock Sheet
                    </Button>
                  </Link>
               </div>
            </div>

            {/* B. Transactions Feed (Priority 4) */}
            <div className="lg:col-span-8 space-y-6 order-4 lg:row-span-2">
               <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Today's Transactions</h2>
                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-500 border border-blue-500/20 animate-pulse">Live</span>
                  </div>
               </div>

               {/* Redesigned History Log (Quick Archives) */}
               {isOwner && (
                 <div className="flex gap-2 overflow-x-auto pb-2 px-2 no-scrollbar custom-scrollbar-premium">
                    {last7Days.map((day) => (
                      <a key={day.dateStr} href={`/api/export/transactions?outlet=CHAI_JOINT&date=${day.dateStr}`} download className="shrink-0">
                        <div className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2",
                          day.isToday 
                            ? "bg-blue-500/20 border-blue-500/30 text-blue-500" 
                            : "bg-foreground/5 border-border text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                        )}>
                          <History className="w-3 h-3 opacity-50" />
                          {day.isToday ? "Today's Export" : day.displayDate}
                        </div>
                      </a>
                    ))}
                 </div>
               )}

               <div className="glass-panel rounded-[2.5rem] overflow-hidden border border-border bg-foreground/5 shadow-xl">
                 <div className="flex-1 overflow-auto max-h-[700px] p-6 lg:p-8 space-y-4 custom-scrollbar-premium">
                    {recentTabs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-muted-foreground py-32 opacity-20">
                        <Receipt className="w-16 h-16 mb-4" />
                        <p className="font-black tracking-[0.4em] uppercase text-xs">No transactions recorded</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {recentTabs.map(tab => (
                          <div key={tab.id} className="glass-card p-6 rounded-[2.5rem] border-border flex flex-col justify-between hover:border-blue-500/20 transition-all group relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
                             
                             <div className="flex justify-between items-start mb-6 relative z-10">
                               <div className="flex flex-col">
                                 <div className="flex items-center gap-2 mb-1.5">
                                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                   <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">{tab.paymentMode} Resolution</span>
                                 </div>
                                 <h3 className="text-xl font-black text-foreground tracking-tight truncate max-w-[200px] leading-tight">
                                   {tab.customerName || "Walk-In Capture"}
                                 </h3>
                                 <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Staff: {tab.User.name}</span>
                               </div>

                               <div className="flex flex-col items-end gap-1.5">
                                 {tab.tokenNumber ? (
                                   <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl shadow-[0_4px_15px_-3px_rgba(59,130,246,0.2)]">
                                     <span className="text-sm font-black text-blue-500 tracking-tight">TOKEN #{tab.tokenNumber}</span>
                                   </div>
                                 ) : (
                                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-foreground/5 px-3 py-1.5 rounded-xl border border-border">N/A</span>
                                 )}
                                 <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em] opacity-40">
                                   {formatTimeIST(tab.closedAt || tab.openedAt)}
                                 </span>
                               </div>
                             </div>

                             <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center pt-5 border-t border-border relative z-10 group/bottom">
                                <div className="flex flex-col mb-4 sm:mb-0">
                                   <p className={cn(
                                     "text-3xl font-black tracking-tighter transition-colors leading-none",
                                     tab.status === "CANCELLED" ? "text-muted-foreground/30 line-through" : "text-foreground group-hover:text-blue-500"
                                   )}>
                                     ₹{tab.totalAmount.toFixed(0)}
                                   </p>
                                   {tab.status === "CANCELLED" && <span className="text-[8px] font-black text-red-600 dark:text-red-500 uppercase tracking-widest mt-1">Order Revoked</span>}
                                </div>

                                <div className="flex items-center gap-2">
                                   <TabReceiptModal
                                     tabId={tab.id}
                                     customerName={tab.customerName}
                                     totalAmount={tab.totalAmount}
                                     paymentMode={tab.paymentMode}
                                     closedAt={tab.closedAt}
                                     items={tab.Items}
                                     accentColor="blue"
                                   />
                                   {tab.status === "CLOSED" && (
                                     <PrintReceiptButton
                                       outletName={chaiJoint.name}
                                       tokenNumber={tab.tokenNumber}
                                       tableName={tab.tableName}
                                       customerName={tab.customerName}
                                       tabId={tab.id}
                                       items={tab.Items}
                                       totalAmount={tab.totalAmount}
                                       paymentMode={tab.paymentMode}
                                       closedAt={tab.closedAt}
                                       accentColor="blue"
                                     />
                                   )}
                                   {(tab.status === "CLOSED" || tab.status === "CANCELLED") && (
                                    <form action={reopenTab.bind(null, tab.id)}>
                                      <Button type="submit" variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/20 transition-all">
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                    </form>
                                  )}
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
               </div>
            </div>

            {/* C. Live Stock (Priority 3) */}
            <div className="lg:col-span-4 order-3">
               <div className="glass-panel p-8 rounded-[2.5rem] border border-border bg-foreground/5 flex flex-col h-full shadow-xl">
                  <div className="flex items-center justify-between mb-8 px-1">
                    <h2 className="text-sm font-black text-foreground uppercase tracking-[0.3em] flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Live Stock
                    </h2>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter italic opacity-50">Real-time update</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 overflow-auto custom-scrollbar-premium max-h-[600px] pr-2">
                     {localStock.length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-10 opacity-30 gap-4">
                          <PackageOpen className="w-10 h-10 text-muted-foreground" />
                          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest text-center">Pantry Empty</p>
                       </div>
                     ) : (
                       localStock.map(stock => (
                         <div key={stock.id} className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            <div className="relative glass-panel p-4 rounded-2xl border border-border bg-foreground/5 hover:bg-foreground/10 hover:border-blue-500/20 transition-all flex items-center justify-between gap-4">
                               <div className="min-w-0">
                                  <p className="font-black text-foreground text-[11px] uppercase truncate tracking-tight mb-1 group-hover:text-blue-500 transition-colors">
                                    {stock.Item.name}
                                  </p>
                                  <div className="flex items-center gap-1.5">
                                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 group-hover:bg-emerald-500 transition-colors"></div>
                                     <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Available</span>
                                  </div>
                               </div>
                               <div className="flex flex-col items-end">
                                  <div className="flex items-baseline gap-1">
                                     <span className="font-black text-foreground text-lg tracking-tighter">
                                       {stock.quantity}
                                     </span>
                                     <span className="text-[9px] font-black text-blue-500/60 uppercase tracking-tight">
                                       {stock.Item.piecesPerBox ? 'pcs' : stock.Item.unit}
                                     </span>
                                  </div>
                                  {stock.Item.piecesPerBox && (
                                     <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-tighter">
                                       {(stock.quantity / stock.Item.piecesPerBox).toFixed(1)} {stock.Item.unit}
                                     </span>
                                  )}
                               </div>
                            </div>
                         </div>
                       ))
                     )}
                  </div>
               </div>
            </div>


          </div>

          {/* Incoming Dispatches */}
          <section className="glass-panel rounded-[2.5rem] overflow-hidden border border-border bg-foreground/5">
             <div className="p-8 border-b border-border bg-foreground/5 flex items-center gap-4">
               <PackageOpen className="w-6 h-6 text-muted-foreground" />
               <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Deliveries from Warehouse</h2>
             </div>
             
             <div className="p-8 overflow-auto max-h-[400px] custom-scrollbar-premium">
                {incomingDispatches.length === 0 ? (
                  <div className="text-center py-20 opacity-20">
                    <p className="font-black tracking-[0.4em] uppercase text-[10px] text-muted-foreground">No recent dispatches</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {incomingDispatches.map(log => (
                      <div key={log.id} className="flex items-center justify-between p-5 rounded-2xl border border-border bg-foreground/5 hover:bg-foreground/10 transition-all">
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground mb-1 uppercase tracking-widest">{formatTimeIST(log.createdAt)}</p>
                          <span className="font-black text-foreground text-sm uppercase">{log.Item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg text-sm border border-emerald-500/20">
                            +{log.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </section>
        </div>
      </div>
    </AppLayout>
  )
}
