import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { addTabItem, removeTabItem, closeTab, adjustTabItemQuantity } from "./actions"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ShoppingCart, CreditCard, Banknote, SplitSquareHorizontal, CheckCircle2, Printer, Plus, Minus } from "lucide-react"
import { PosMenuGrid } from "./PosMenuGrid"
import { PrintReceiptButton } from "@/components/PrintReceiptButton"
import { CheckoutSidebar } from "./CheckoutSidebar"
import { cn } from "@/lib/utils"
import { QuantityInput } from "./QuantityInput"

export default async function TabTerminal({ params }: { params: Promise<{ tabId: string }> }) {
  const { tabId } = await params
  
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  
  const tab = await prisma.tab.findUnique({
    where: { id: tabId },
    include: {
      Items: { include: { MenuItem: { include: { Item: true } } } },
      Outlet: true,
      User: true
    }
  })

  if (!tab) return notFound()

  const isCafe = tab.Outlet.type === "CAFE"

  // ===== CLOSED STATE: Show Receipt + Print Screen =====
  if (tab.status === "CLOSED" || tab.status === "CANCELLED") {
    return (
      <div className={`min-h-screen bg-background flex items-center justify-center p-6 relative`}>
        {/* Background */}
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] ${isCafe ? "bg-orange-900/15" : "bg-sky-900/15"} rounded-full blur-[150px] pointer-events-none`}></div>
        
        <div className="w-full max-w-md relative z-10">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 ${isCafe ? "bg-orange-500/20 border border-orange-500/30 shadow-[0_0_40px_-5px_rgba(249,115,22,0.4)]" : "bg-sky-500/20 border border-sky-500/30 shadow-[0_0_40px_-5px_rgba(14,165,233,0.4)]"}`}>
              <CheckCircle2 className={`w-10 h-10 ${isCafe ? "text-orange-400" : "text-sky-400"}`} />
            </div>
            <h1 className="text-3xl font-black text-foreground mb-2">Bill Closed!</h1>
            {tab.tokenNumber && (
              <div className={`inline-block px-6 py-2 rounded-2xl ${isCafe ? "bg-orange-500/20 border border-orange-500/30" : "bg-sky-500/20 border border-sky-500/30"} mb-3`}>
                <span className={`text-4xl font-black ${isCafe ? "text-orange-400" : "text-sky-400"} tracking-tight`}>
                  Token #{tab.tokenNumber}
                </span>
              </div>
            )}
            <p className="text-muted-foreground text-sm font-medium">{tab.customerName || "Walk-in Customer"}</p>
          </div>

          {/* Receipt Summary */}
          <div className="glass-panel rounded-3xl p-6 mb-6">
            <div className="space-y-2 mb-4">
              {tab.Items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">{item.quantity}x {item.MenuItem.name}{item.isBox ? " (Box)" : ""}</span>
                  <span className="text-foreground font-bold">₹{(item.quantity * item.priceAtTime).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className={`border-t ${isCafe ? "border-orange-500/20" : "border-sky-500/20"} pt-4 flex justify-between items-center`}>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total</span>
              <span className="text-3xl font-black text-foreground">₹{tab.totalAmount.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Payment</span>
              <span className={`text-xs font-bold uppercase tracking-widest ${isCafe ? "text-orange-400" : "text-sky-400"}`}>{tab.paymentMode || "N/A"}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
                <PrintReceiptButton
                  outletName={tab.Outlet.name}
                  tokenNumber={tab.tokenNumber}
                  tableName={tab.tableName}
                  customerName={tab.customerName}
                  tabId={tab.id}
                  items={tab.Items}
                  totalAmount={tab.totalAmount}
                  paymentMode={tab.paymentMode}
                  closedAt={tab.closedAt}
                  accentColor={isCafe ? "amber" : "sky"}
                />

            {/* Go Back Button */}
            <Link href={`/tabs?target=${tab.Outlet.type}`} className="block">
              <Button variant="outline" className={`w-full h-12 text-sm font-bold tracking-widest uppercase rounded-xl transition-all active:scale-[0.98] border-border text-muted-foreground hover:bg-foreground/5`}>
                Done — Back to Terminal
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ===== OPEN STATE: Normal POS Interface =====
  const availableMenu = await prisma.menuItem.findMany({
    where: { outletId: tab.outletId, isAvailable: true },
    include: { 
      Item: { 
        include: { 
          OutletStock: { 
            where: { outletId: tab.outletId } 
          } 
        } 
      },
      ingredients: {
        include: {
          Item: {
            include: {
              OutletStock: {
                where: { outletId: tab.outletId }
              }
            }
          }
        }
      }
    },
    orderBy: { categoryId: 'asc' }
  })

  // Group menu by category
  const categorizedMenu = availableMenu.reduce((acc: any, item) => {
    const defaultCat = item.categoryId || 'GENERAL'
    const categoryName = defaultCat.toUpperCase().trim()
    if (!acc[categoryName]) acc[categoryName] = []
    acc[categoryName].push(item)
    return acc
  }, {})

  return (
    <div className={`min-h-screen lg:h-screen bg-background flex flex-col lg:flex-row lg:overflow-hidden ${isCafe ? "selection:bg-orange-500/30 selection:text-orange-100" : "selection:bg-sky-500/30 selection:text-sky-100"} relative`}>
      
      {/* Background Decorators */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none z-0"></div>
      <div className={`absolute top-1/2 left-1/4 w-[600px] h-[600px] ${isCafe ? "bg-orange-500/10" : "bg-sky-500/10"} rounded-full blur-[150px] pointer-events-none -translate-y-1/2 z-0`}></div>

      {/* Left Pane: MENU GRID */}
      <div className="flex-1 flex flex-col pt-4 z-10 relative min-h-0 overflow-hidden">
        <header className="p-4 sm:px-8 sm:pb-6 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between bg-background/50 backdrop-blur-md shrink-0">
          <Link href={`/tabs?target=${tab.Outlet.type}`}>
            <Button variant="outline" className="text-muted-foreground border-border hover:bg-foreground/5 hover:text-foreground rounded-xl h-10 sm:h-12 px-4 sm:px-6 gap-2 font-bold backdrop-blur-md">
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to Terminal</span><span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 mt-4 sm:mt-0">
            <div className={`h-2 w-2 rounded-full ${isCafe ? "bg-orange-500 shadow-[0_0_10px_#f97316]" : "bg-sky-500 shadow-[0_0_10px_#0ea5e9]"} animate-pulse`}></div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight uppercase">{tab.Outlet.name} <span className={isCafe ? "text-orange-500/50" : "text-sky-500/50"}>POS</span></h2>
          </div>
        </header>
        
        <PosMenuGrid categorizedMenu={categorizedMenu} tabId={tab.id} isCafe={isCafe} />
      </div>

      {/* Right Pane: CART / BILL */}
      <div className="w-full lg:w-1/3 lg:min-w-[400px] lg:max-w-[500px] bg-background/80 dark:bg-black/40 backdrop-blur-2xl flex flex-col border-t lg:border-t-0 lg:border-l border-border shadow-[0_-20px_80px_rgba(0,0,0,0.1)] dark:shadow-[0_-20px_80px_rgba(0,0,0,0.8)] lg:shadow-[-20px_0_40px_rgba(0,0,0,0.05)] lg:dark:shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-20 shrink-0 relative lg:h-full">
        <header className="p-3 sm:p-8 border-b border-border bg-foreground/5 relative overflow-hidden shrink-0">
          <div className={`absolute top-0 right-0 w-32 h-32 ${isCafe ? "bg-orange-500/10" : "bg-sky-500/10"} rounded-full blur-[40px] pointer-events-none`}></div>
          <h2 className="text-xl sm:text-3xl font-black text-foreground tracking-tight break-words relative z-10 text-glow">{tab.customerName}</h2>
          <p className={`${isCafe ? "text-orange-500/80" : "text-sky-500/80"} font-bold text-[10px] sm:text-xs tracking-widest mt-0 sm:mt-2 uppercase relative z-10`}>Tab #{tab.id.slice(-6)}</p>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {tab.Items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground animate-in fade-in duration-500">
              <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium tracking-wide">Awaiting Order</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {tab.Items.map((item: any) => (
                <li key={item.id} className={cn(
                  "p-2 sm:p-4 flex gap-2 sm:gap-4 bg-foreground/5 border border-border rounded-2xl animate-in slide-in-from-right-4 duration-300 hover:border-primary/20 transition-colors relative",
                  item.isPaid && "opacity-50 grayscale-[0.5] bg-foreground/[0.02] border-dashed"
                )}>
                  {item.isPaid && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20 z-10">
                      <CheckCircle2 className="w-3 h-3" /> PAID
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                       <div className="flex items-center bg-foreground/5 dark:bg-black/40 rounded-xl overflow-hidden border border-border shadow-inner px-1 shrink-0">
                          <QuantityInput item={item} tabId={tab.id} isCafe={isCafe} />
                          <span className={cn(
                            "text-[10px] font-black opacity-40 pr-1",
                            isCafe ? "text-orange-400" : "text-sky-400"
                          )}>X</span>
                       </div>
                       <p className="font-bold text-foreground text-sm sm:text-lg line-clamp-2 whitespace-normal flex-1">{item.MenuItem.name}{item.isBox && " (Box)"}</p>
                    </div>
                    <p className="text-muted-foreground font-medium text-[10px] sm:text-xs pl-1">₹{item.priceAtTime.toFixed(2)} each</p>
                  </div>
                  <div className="text-right flex flex-col items-end shrink-0">
                    <p className="font-black text-foreground text-sm sm:text-xl">₹{(item.quantity * item.priceAtTime).toFixed(2)}</p>
                    <form action={removeTabItem.bind(null, item.id, tab.id, item.quantity * item.priceAtTime)}>
                      <button type="submit" className="text-[10px] sm:text-xs text-red-400/70 hover:text-red-400 mt-1 sm:mt-2 font-bold tracking-widest uppercase hover:underline transition-all">Remove</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <CheckoutSidebar
          tabId={tab.id}
          totalAmount={tab.totalAmount}
          totalPaid={tab.totalPaid}
          isCafe={isCafe}
          outletName={tab.Outlet.name}
          tokenNumber={tab.tokenNumber}
          tableName={tab.tableName}
          customerName={tab.customerName || "Walk-in"}
          items={tab.Items}
        />
      </div>

    </div>
  )
}
