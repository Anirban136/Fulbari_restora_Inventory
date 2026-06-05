import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { consumeStock } from "./actions"
import { UserControls } from "@/components/user-controls"
import { ChefHat, Flame, Search, PackageOpen } from "lucide-react"
import AppLayout from "@/components/layouts/app-layout"
import { formatTimeIST, formatDateIST } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HeroHeader } from "@/components/ui/hero-header"

export default async function RestaurantDashboard() {
  const restaurant = await prisma.outlet.findFirst({ where: { type: "RESTAURANT" }})
  
  if (!restaurant) return <div className="min-h-screen bg-background text-foreground p-10 font-bold">Restaurant outlet not configured.</div>

  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const role = session.user?.role
  if (role !== "OWNER" && role !== "REST_STAFF") {
    if (role === "CAFE_STAFF") redirect('/cafe')
    if (role === "CHAI_STAFF") redirect('/chai')
    redirect('/dashboard')
  }

  const [localStock, incomingDispatches] = await Promise.all([
    prisma.outletStock.findMany({
      where: { outletId: restaurant.id, quantity: { gt: 0 } },
      include: { Item: true },
      orderBy: { Item: { name: 'asc' } }
    }),
    prisma.inventoryLedger.findMany({
      where: { outletId: restaurant.id, type: "DISPATCH" },
      include: { Item: true, User: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ])

  return (
    <AppLayout user={session?.user}>
      <div className="selection:bg-rose-500/30 relative overflow-hidden flex flex-col items-center w-full min-h-full">
        
        <div className="w-full max-w-6xl px-4 sm:px-6 py-10 relative z-10 flex flex-col min-h-full">
          
          <HeroHeader 
            title="Restaurant"
            highlightedWord="Hub"
            subtitle="Kitchen Operations Interface"
            badgeText="Outlet Operations"
            icon={<ChefHat className="w-6 h-6 text-foreground" />}
            colorGradient="from-rose-500/50 to-orange-500"
            className="mb-8"
            sideComponent={<UserControls />}
          />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 flex-1">
          
          {/* Incoming Dispatches */}
          <div className="lg:col-span-12 glass-panel rounded-[2.5rem] overflow-hidden flex flex-col min-h-[300px] border border-foreground/5 shadow-xl bg-foreground/5">
             <div className="p-8 border-b border-foreground/5 bg-foreground/5 backdrop-blur-md flex items-center gap-4 shrink-0">
               <PackageOpen className="w-6 h-6 text-rose-500" />
               <h2 className="text-xl font-bold text-foreground uppercase tracking-widest">Incoming Deliveries from Warehouse</h2>
             </div>
             
             <div className="flex-1 overflow-auto p-8 max-h-[400px] custom-scrollbar">
                {incomingDispatches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-10 animate-pulse h-full text-opacity-40">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-bold tracking-widest uppercase text-sm">No dispatches received yet.</p>
                  </div>
                ) : (
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {incomingDispatches.map(log => (
                      <li key={log.id} className="flex items-center justify-between p-5 rounded-2xl border border-border bg-foreground/5 hover:bg-foreground/10 transition-all group shadow-sm">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground mb-1 leading-none">{formatDateIST(log.createdAt)} at {formatTimeIST(log.createdAt)}</p>
                          <span className="font-bold text-foreground/80 group-hover:text-foreground text-lg transition-colors leading-tight block mb-1">{log.Item.name}</span>
                          <p className="text-[10px] text-muted-foreground font-medium leading-none">By: <span className="text-muted-foreground/60">{log.User.name}</span></p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl text-lg lg:text-xl drop-shadow-[0_0_5px_rgba(244,63,94,0.3)]">
                            +{log.quantity} <span className="text-[10px] ml-1 opacity-70 uppercase text-rose-300 tracking-widest">{log.Item.piecesPerBox ? 'pcs' : log.Item.unit}</span>
                          </span>
                          {log.Item.piecesPerBox && (
                            <span className="text-[10px] text-rose-500/50 font-black uppercase tracking-tighter mt-1">
                              ({(log.quantity / log.Item.piecesPerBox).toFixed(1)} {log.Item.unit})
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
             </div>
          </div>

          {/* Consumption Logger */}
          <div className="lg:col-span-5 glass-panel p-8 rounded-[2.5rem] self-start transition-all border border-foreground/5 shadow-xl bg-foreground/5">
            <div className="flex items-center gap-3 mb-8">
               <Flame className="w-6 h-6 text-orange-500" />
               <h2 className="text-2xl font-black text-foreground">Log Usage</h2>
            </div>
            
            <form action={consumeStock} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="itemId" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ingredient</Label>
                <select name="itemId" id="itemId" required defaultValue="" className="w-full h-14 px-4 py-3 rounded-xl border border-foreground/5 bg-foreground/5 text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all shadow-inner font-medium text-lg">
                  <option value="" disabled className="bg-background text-muted-foreground">Select from fridge / pantry...</option>
                  {localStock.map(stock => (
                    <option key={stock.itemId} value={stock.itemId} className="bg-background text-foreground">
                      {stock.Item.name} — {stock.quantity} {stock.Item.unit} avl.
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Amount Consumed</Label>
                <Input id="quantity" name="quantity" type="number" step="0.01" min="0.01" className="h-14 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/30 rounded-xl focus-visible:ring-rose-500/50 shadow-inner font-mono text-2xl" placeholder="2.5" required />
              </div>

              <Button type="submit" className="w-full h-16 text-xl font-black tracking-widest uppercase bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white rounded-xl transition-all shadow-[0_0_30px_-5px_rgba(244,63,94,0.5)] active:scale-95 mt-4">
                Deduct from Stock
              </Button>
            </form>
          </div>

          {/* Current Stock */}
          <div className="lg:col-span-7 glass-panel rounded-[2.5rem] overflow-hidden flex flex-col max-h-[700px] border border-foreground/5 bg-foreground/5 shadow-xl">
             <div className="p-8 border-b border-foreground/5 bg-foreground/5 backdrop-blur-md flex justify-between items-center">
               <h2 className="text-xl font-bold text-foreground uppercase tracking-widest">Current Local Stock</h2>
               <div className="px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 font-bold text-xs flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div> Live
               </div>
             </div>
             
             <div className="flex-1 overflow-auto p-8 relative">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {localStock.length === 0 ? (
                    <div className="col-span-2 flex flex-col items-center justify-center text-muted-foreground py-20 animate-pulse text-opacity-40">
                      <Search className="w-12 h-12 mb-4 opacity-20" />
                      <p className="font-bold tracking-widest uppercase text-sm">No inventory available. Await dispatch.</p>
                    </div>
                  ) : (
                    localStock.map(stock => (
                      <li key={stock.id} className="flex flex-col p-5 rounded-2xl border border-border bg-foreground/5 hover:bg-foreground/10 transition-all group shadow-sm hover:shadow-[0_5px_20px_-5px_rgba(244,63,94,0.2)]">
                        <span className="font-bold text-foreground/80 group-hover:text-foreground text-lg transition-colors">{stock.Item.name}</span>
                        <div className="mt-4 flex justify-between items-end">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Available</span>
                          <div className="font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg text-lg drop-shadow-[0_0_5px_rgba(244,63,94,0.3)] flex flex-col items-end">
                            <span>
                              {stock.quantity} <span className="text-[10px] ml-1 opacity-70 uppercase text-rose-300 tracking-widest">{stock.Item.piecesPerBox ? 'pcs' : stock.Item.unit}</span>
                            </span>
                            {stock.Item.piecesPerBox && (
                              <span className="text-[9px] opacity-60 font-black uppercase tracking-tighter">
                                ({(stock.quantity / stock.Item.piecesPerBox).toFixed(1)} {stock.Item.unit})
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
             </div>
          </div>

          </div>
        </div>
      </div>
    </AppLayout>
  )
}
