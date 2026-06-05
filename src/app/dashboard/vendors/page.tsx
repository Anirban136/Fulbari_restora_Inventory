import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import { Truck, IndianRupee, Phone, MapPin, FileText, History, AlertTriangle, ShieldCheck } from "lucide-react"
import { AddVendorDialog } from "../inventory/AddVendorDialog"
import { EditVendorDialog } from "../inventory/EditVendorDialog"
import { PayVendorDialog } from "../inventory/PayVendorDialog"
import { AddManualBillDialog } from "../inventory/AddManualBillDialog"
import { VendorDeleteButton } from "./VendorDeleteButton"
import {
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { HeroHeader } from "@/components/ui/hero-header"

export default async function VendorsPage() {
  const session = await getServerSession(authOptions)
  const isOwner = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN"
  const isAuthorized = isOwner || session?.user?.role === "INV_MANAGER"

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20 shadow-2xl">
          <ShieldCheck className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-foreground uppercase tracking-tighter">Access Denied</h2>
        <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">OWNER PRIVILEGES REQUIRED</p>
      </div>
    )
  }

  // Fetch vendors with their complete stock-in logs and payments so the
  // list totals stay in sync with each vendor's detail ledger.
  const vendors = await prisma.vendor.findMany({
    include: {
      Ledger: {
        where: {
          type: { in: ["STOCK_IN", "WASTE"] }
        },
        include: { Item: true }
      },
      Payments: {
        include: { User: true },
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { name: 'asc' }
  })

  // Calculate all-time stats for each vendor, matching the vendor detail ledger.
  const vendorStats = vendors.map((vendor: any) => {
    let totalCollection = 0
    let totalOwed = 0
    let totalWasteQty = 0
    let totalWasteValue = 0

    vendor.Ledger.forEach((log: any) => {
      let transactionCost = log.Item.costPerUnit || 0
      if (log.notes && log.notes.includes("Cost=")) {
        const match = log.notes.match(/Cost=([\d.]+)/)
        if (match && match[1]) transactionCost = parseFloat(match[1])
      }

      if (log.type === "STOCK_IN") {
        totalCollection += log.quantity
        totalOwed += log.quantity * transactionCost
      } else if (log.type === "WASTE") {
        totalWasteQty += log.quantity
        totalWasteValue += log.quantity * transactionCost
      }
    })

    const totalPaid = vendor.Payments.reduce((sum: number, p: any) => sum + p.amount, 0)
    const balanceDue = Math.max(0, totalOwed - totalPaid - totalWasteValue)
    const netCollection = Math.max(0, totalCollection - totalWasteQty)

    return {
      ...vendor,
      netCollection,
      totalOwed,
      totalPaid,
      balanceDue
    }
  })

  const totalOwed = vendorStats.reduce((sum: number, v: any) => sum + v.totalOwed, 0)
  const totalPaid = vendorStats.reduce((sum: number, v: any) => sum + v.totalPaid, 0)
  const totalBalance = vendorStats.reduce((sum: number, v: any) => sum + v.balanceDue, 0)

  return (
    <div className="space-y-10 relative pb-20">
      {/* Background Decorators - Vibrant Ambient blobs */}
      <div className="absolute top-[-100px] left-[-10% ] w-[30%] h-[500px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none -z-10"></div>
      <div className="absolute top-[20%] right-[-5%] w-[25%] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      <HeroHeader 
        title="Vendor"
        highlightedWord="Ledger"
        subtitle="Manage supplier profiles, payment settlements, and trace supply chain acquisitions."
        badgeText="Supply Chain"
        icon={<Truck className="w-6 h-6 text-foreground" />}
        sideComponent={<div className="flex items-center gap-3"><AddVendorDialog /></div>}
        colorGradient="from-emerald-500/50 to-primary"
      />

      {/* Executive Stats Widgets - High-Density Neon Design */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
        {/* Total Owed Card */}
        <div className="group relative glass-panel p-6 rounded-[2rem] border-border bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-all duration-500 overflow-hidden">
           <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
             <IndianRupee className="w-12 h-12 text-amber-500" />
           </div>
           <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-4">Total Bill Amount</p>
           <h3 className="text-4xl font-black text-foreground tracking-tighter drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]">
             ₹{totalOwed.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
           </h3>
           <div className="mt-4 flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_5px_#f59e0b]"></span>
             <span className="text-[9px] font-black text-amber-600 dark:text-amber-500/60 uppercase tracking-widest">Awaiting Settlement</span>
           </div>
        </div>

        {/* Total Paid Card */}
        <div className="group relative glass-panel p-6 rounded-[2rem] border-border bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-all duration-500 overflow-hidden">
           <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
             <History className="w-12 h-12 text-emerald-500" />
           </div>
           <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">Paid Already</p>
           <h3 className="text-4xl font-black text-foreground tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]">
             ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
           </h3>
           <div className="mt-4 flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></span>
             <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500/60 uppercase tracking-widest">Transaction Verified</span>
           </div>
        </div>

        {/* Balance Due Card */}
        <div className={cn(
          "group relative glass-panel p-6 rounded-[2rem] border border-foreground/5 transition-all duration-500 overflow-hidden",
          totalBalance > 0 
            ? "bg-red-500/[0.02] hover:bg-red-500/[0.04] border-red-500/10" 
            : "bg-emerald-500/[0.02] border-emerald-500/10"
        )}>
           <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
             <AlertTriangle className={cn("w-12 h-12", totalBalance > 0 ? "text-red-500" : "text-emerald-500")} />
           </div>
           <p className={cn("text-[10px] font-black uppercase tracking-[0.3em] mb-4", totalBalance > 0 ? "text-red-500" : "text-emerald-500")}>
             {totalBalance > 0 ? "Left to Pay" : "Account Master Settled"}
           </p>
           <h3 className="text-4xl font-black text-foreground tracking-tighter drop-shadow-[0_0_15px_rgba(239,68,68,0.2)]">
             ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
           </h3>
           <div className="mt-4 flex items-center gap-2">
             <span className={cn("w-1.5 h-1.5 rounded-full", totalBalance > 0 ? "bg-red-500 animate-ping shadow-[0_0_5px_#ef4444]" : "bg-emerald-500 shadow-[0_0_5px_#10b981]")}></span>
             <span className={cn("text-[9px] font-black uppercase tracking-widest leading-none", totalBalance > 0 ? "text-red-600 dark:text-red-500/60" : "text-emerald-600 dark:text-emerald-500/60")}>
               {totalBalance > 0 ? "BALANCE REMAINING" : "CLEAN LEDGER"}
             </span>
           </div>
        </div>
      </div>

      {/* Main Vendor Table - Premium Glass Experience */}
      <div className="glass-panel rounded-[3rem] border border-foreground/10 bg-foreground/[0.03] shadow-3xl overflow-hidden backdrop-blur-3xl relative w-full">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
        
        {/* Desktop View - Hidden on Mobile */}
        <div className="hidden lg:block overflow-x-auto custom-scrollbar-premium w-full">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-foreground/[0.03] border-b border-foreground/5">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 dark:text-muted-foreground/40">VENDOR PROFILE</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 dark:text-muted-foreground/40">COMMUNICATION</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 dark:text-muted-foreground/40 text-right">VOLUME</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 dark:text-muted-foreground/40 text-right">TOTAL BILL</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 dark:text-muted-foreground/40 text-right">PAID (₹)</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 dark:text-muted-foreground/40 text-right">DUE (₹)</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 dark:text-muted-foreground/40 text-center">OPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {vendorStats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-32 text-center">
                    <Truck className="w-16 h-16 text-muted-foreground/10 mx-auto mb-4 animate-pulse" />
                    <p className="text-muted-foreground/30 font-black uppercase tracking-[0.5em] text-xs">NO VENDORS REGISTERED</p>
                  </td>
                </tr>
              ) : (
                vendorStats.map(vendor => (
                  <TableRow key={vendor.id} className="group hover:bg-foreground/[0.04] transition-all duration-300">
                    <TableCell className="px-8 py-6">
                      <Link href={`/dashboard/vendors/${vendor.id}`} className="flex flex-col space-y-1 group/link">
                        <span className="text-lg font-black text-foreground uppercase tracking-tight group-hover/link:text-emerald-400 transition-colors">
                          {vendor.name}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-40">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[200px]">{vendor.address || 'Field Location Not Set'}</span>
                        </div>
                      </Link>
                    </TableCell>
                    
                    <TableCell className="px-8 py-6">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center gap-2">
                           <Phone className="w-3.5 h-3.5 text-emerald-500/70" />
                           <span className="text-xs font-black text-foreground/80 tracking-tight">{vendor.contact || 'No Direct Link'}</span>
                        </div>
                        {vendor.email && (
                          <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest ml-5">{vendor.email}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="px-8 py-6 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest">
                          {vendor.netCollection.toFixed(1)} UNITS
                        </span>
                        <span className="text-[8px] text-muted-foreground/80 dark:text-muted-foreground/30 font-black uppercase tracking-widest mt-1">NET RECEPTION</span>
                      </div>
                    </TableCell>

                    <TableCell className="px-8 py-6 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className="text-sm font-black text-amber-500/80">
                          ₹{vendor.totalOwed.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-8 py-6 text-right">
                      <span className="text-sm font-black text-emerald-400/80">
                        ₹{vendor.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </span>
                    </TableCell>

                    <TableCell className="px-8 py-6 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className={cn(
                          "text-xl font-black drop-shadow-[0_0_10px_rgba(239,68,68,0.2)]",
                          vendor.balanceDue > 0 ? "text-red-400" : "text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        )}>
                          ₹{vendor.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </span>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-[0.2em] mt-1 opacity-60",
                          vendor.balanceDue > 0 ? "text-red-500/80" : "text-emerald-500/80"
                        )}>
                          {vendor.balanceDue > 0 ? "BALANCE DUE" : "SETTLED"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-8 py-6">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/dashboard/vendors/${vendor.id}`} className="p-3 rounded-2xl bg-foreground/5 border border-foreground/5 text-blue-400/60 hover:text-blue-400 transition-all hover:bg-blue-500/10 active:scale-90" title="Full Ledger">
                          <FileText className="w-4 h-4" />
                        </Link>
                        <AddManualBillDialog vendor={vendor} />
                        <PayVendorDialog vendor={vendor} balanceDue={vendor.balanceDue} />
                        <EditVendorDialog vendor={vendor} />
                        
                        {isOwner && (
                          <VendorDeleteButton vendor={vendor} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Visible only on small screens */}
        <div className="lg:hidden divide-y divide-foreground/5">
          {vendorStats.length === 0 ? (
            <div className="py-20 text-center">
              <Truck className="w-12 h-12 text-muted-foreground/10 mx-auto mb-4" />
              <p className="text-muted-foreground/30 font-black uppercase tracking-[0.2em] text-[10px]">NO VENDORS REGISTERED</p>
            </div>
          ) : (
            vendorStats.map(vendor => (
              <div key={vendor.id} className="p-6 space-y-5 bg-foreground/[0.01] hover:bg-foreground/[0.02] transition-colors group">
                {/* Mobile Card Header */}
                <div className="flex justify-between items-start">
                  <Link href={`/dashboard/vendors/${vendor.id}`} className="flex flex-col space-y-1">
                    <span className="text-lg font-black text-foreground uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{vendor.name}</span>
                    <div className="flex items-center gap-1.5 opacity-40">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-[180px]">{vendor.address || 'Location Not Set'}</span>
                    </div>
                  </Link>
                  <div className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase border flex flex-col items-center",
                    vendor.balanceDue > 0 ? "bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  )}>
                    <span className="text-[8px] opacity-60 mb-0.5">DUE</span>
                    ₹{vendor.balanceDue.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Mobile Card Stats Row */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-foreground/[0.02] border border-foreground/5">
                  <div className="space-y-1 text-center border-r border-foreground/5">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Volume (Units)</span>
                    <span className="text-xs font-black text-emerald-400">{vendor.netCollection.toFixed(1)}</span>
                  </div>
                  <div className="space-y-1 text-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Total Bill</span>
                    <span className="text-xs font-black text-amber-500 font-mono">₹{vendor.totalOwed.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Mobile Card Actions */}
                <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1 no-scrollbar">
                  <Link href={`/dashboard/vendors/${vendor.id}`} className="flex-1 h-12 min-w-[100px] rounded-xl bg-foreground/5 border border-foreground/5 flex items-center justify-center text-blue-400 font-black text-[10px] uppercase tracking-widest group-hover:bg-blue-500/5 transition-colors">
                    <FileText className="w-3.5 h-3.5 mr-2" />
                    Ledger
                  </Link>
                  <div className="flex items-center gap-2">
                    <AddManualBillDialog vendor={vendor} />
                    <PayVendorDialog vendor={vendor} balanceDue={vendor.balanceDue} />
                    <EditVendorDialog vendor={vendor} />
                    {isOwner && (
                       <VendorDeleteButton vendor={vendor} />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>


    </div>
  )
}
