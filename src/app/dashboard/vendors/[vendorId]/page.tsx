import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { notFound } from "next/navigation"
import Link from "next/link"
import { formatDateIST, formatTimeIST } from "@/lib/utils"
import { PayVendorDialog } from "../../inventory/PayVendorDialog"
import { AddManualBillDialog } from "../../inventory/AddManualBillDialog"
import {
  ArrowLeft, Phone, MapPin, Mail, IndianRupee,
  ShoppingCart, Wallet, Scale, Hash,
  TrendingUp, TrendingDown, Package, Trash2
} from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

export default async function VendorDetailPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "OWNER") {
    return <div className="p-8 text-center text-red-400">Unauthorized</div>
  }

  const { vendorId } = await params

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      Ledger: {
        where: { type: { in: ["STOCK_IN", "WASTE"] } },
        include: { Item: true, User: true },
        orderBy: { createdAt: 'asc' }
      },
      Payments: {
        include: { User: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!vendor) return notFound()

  // Build unified timeline
  type TimelineEntry = {
    id: string
    date: Date
    type: 'PURCHASE' | 'PAYMENT' | 'WASTE'
    description: string
    itemName?: string
    quantity?: number
    unit?: string,
    isPieceBased?: boolean,
    piecesPerBox?: number,
    rate?: number,
    debit: number,  // money we owe (purchase)
    credit: number, // money we paid
    user: string,
    notes?: string
  }

  const timeline: TimelineEntry[] = []

  // Add all stock-in and waste entries
  for (const entry of vendor.Ledger) {
    let rate = entry.Item.costPerUnit || 0
    // Check if cost was overridden in notes
    if (entry.notes && entry.notes.includes("Cost=")) {
      const match = entry.notes.match(/Cost=([\d.]+)/)
      if (match && match[1]) rate = parseFloat(match[1])
    }
    const amount = entry.quantity * rate

    const piecesPerBox = (entry.Item as any).piecesPerBox || 1
    const isPieceBased = piecesPerBox > 1
    
    let displayQty = `${entry.quantity} ${entry.Item.unit}`
    if (isPieceBased) {
      const boxCount = entry.quantity / piecesPerBox
      displayQty = `${entry.quantity} pieces (${boxCount} ${entry.Item.unit})`
    }

    if (entry.type === "STOCK_IN") {
      const isManualAdjustment = entry.itemId === "manual_adjustment_item"
      const rawNotes = entry.notes || ""
      const cleanNotes = rawNotes.replace(/Cost=[\d.]+/, "").trim()
      
      timeline.push({
        id: entry.id,
        date: entry.createdAt,
        type: 'PURCHASE',
        description: isManualAdjustment ? (cleanNotes || "Manual Bill Entry") : `${displayQty} ${entry.Item.name}`,
        itemName: entry.Item.name,
        quantity: entry.quantity,
        unit: entry.Item.unit,
        isPieceBased,
        piecesPerBox,
        rate,
        debit: amount,
        credit: 0,
        user: entry.User.name,
        notes: entry.notes || undefined
      })
    } else if (entry.type === "WASTE") {
      timeline.push({
        id: entry.id,
        date: entry.createdAt,
        type: 'WASTE',
        description: `Waste/Damage: ${displayQty} ${entry.Item.name}`,
        itemName: entry.Item.name,
        quantity: entry.quantity,
        unit: entry.Item.unit,
        isPieceBased,
        piecesPerBox,
        rate,
        debit: 0,
        credit: amount,
        user: entry.User.name,
        notes: entry.notes || undefined
      })
    }
  }

  // Add all payments as PAYMENT
  for (const payment of vendor.Payments) {
    timeline.push({
      id: payment.id,
      date: payment.createdAt,
      type: 'PAYMENT',
      description: payment.notes || `Payment of ₹${payment.amount}`,
      debit: 0,
      credit: payment.amount,
      user: payment.User.name,
    })
  }

  // Sort by date ascending
  timeline.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Calculate running balance
  let runningBalance = 0
  const ledger = timeline.map(entry => {
    runningBalance += entry.debit - entry.credit
    return { ...entry, balance: runningBalance }
  })

  // Calculate stats
  const totalPurchased = ledger.reduce((sum, e) => sum + (e.type === 'PURCHASE' ? e.debit : 0), 0)
  const totalPaid = ledger.reduce((sum, e) => sum + (e.type === 'PAYMENT' ? e.credit : 0), 0)
  const totalWaste = ledger.reduce((sum, e) => sum + (e.type === 'WASTE' ? e.credit : 0), 0)
  const balanceDue = totalPurchased - totalPaid - totalWaste
  const totalTransactions = ledger.length

  // Group by month for display
  const monthGroups: Record<string, typeof ledger> = {}
  for (const entry of ledger) {
    const key = `${entry.date.toLocaleString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' })} ${entry.date.toLocaleString('en-IN', { year: 'numeric', timeZone: 'Asia/Kolkata' })}`
    if (!monthGroups[key]) monthGroups[key] = []
    monthGroups[key].push(entry)
  }

  return (
    <div className="space-y-8 relative">
      {/* Background */}
      <div className="absolute top-[-50px] right-[-50px] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-100px] left-[-50px] w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Back Button + Header */}
      <div className="relative z-10">
        <Link
          href="/dashboard/vendors"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Vendor Management
        </Link>

        <div className="glass-panel p-6 rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            {/* Vendor Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Package className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-foreground tracking-tight">{vendor.name}</h1>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Vendor Audit History</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                {vendor.contact && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500/70" /> {vendor.contact}
                  </span>
                )}
                {vendor.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-500/70" /> {vendor.email}
                  </span>
                )}
                {vendor.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-500/70" /> {vendor.address}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <AddManualBillDialog vendor={vendor} />
              <PayVendorDialog vendor={vendor} balanceDue={Math.max(0, balanceDue)} wasteDeductions={totalWaste} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
        <div className="glass-panel p-5 rounded-2xl border-amber-500/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Total Bought</span>
          </div>
          <span className="text-2xl font-black text-foreground flex items-center gap-0.5">
            <IndianRupee className="w-5 h-5 text-amber-400" />
            {totalPurchased.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <p className="text-[10px] text-slate-500 mt-1 uppercase">All-time purchases</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-emerald-500/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Total Paid</span>
          </div>
          <span className="text-2xl font-black text-foreground flex items-center gap-0.5">
            <IndianRupee className="w-5 h-5 text-emerald-400" />
            {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <p className="text-[10px] text-slate-500 mt-1 uppercase">All-time payments</p>
        </div>

        <div className={`glass-panel p-5 rounded-2xl ${balanceDue > 0 ? 'border-red-500/10' : 'border-emerald-500/10'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${balanceDue > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
              <Scale className={`w-5 h-5 ${balanceDue > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${balanceDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>Balance Due</span>
          </div>
          <span className={`text-2xl font-black flex items-center gap-0.5 ${balanceDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            <IndianRupee className="w-5 h-5" />
            {Math.abs(balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <p className="text-[10px] text-slate-500 mt-1 uppercase">{balanceDue > 0 ? 'Outstanding' : 'Settled ✓'}</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-purple-500/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Hash className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Transactions</span>
          </div>
          <span className="text-2xl font-black text-foreground">{totalTransactions}</span>
          <p className="text-[10px] text-slate-500 mt-1 uppercase">Total entries</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-red-500/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Penalized</span>
          </div>
          <span className="text-2xl font-black text-foreground flex items-center gap-0.5">
            <IndianRupee className="w-5 h-5 text-red-400" />
            {totalWaste.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <p className="text-[10px] text-slate-500 mt-1 uppercase">Waste Return</p>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="glass-panel rounded-3xl overflow-hidden relative z-10 shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
            Transaction Ledger
            <span className="text-xs font-medium text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{totalTransactions} entries</span>
          </h3>
        </div>

        <div className="p-0 max-h-[65vh] overflow-auto custom-scrollbar-premium">
          {ledger.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Package className="w-12 h-12 opacity-20 mb-3" />
              <p className="text-sm">No transactions with this vendor yet.</p>
            </div>
          ) : (
            Object.entries(monthGroups).reverse().map(([month, entries]) => {
              const monthDebit = entries.reduce((s, e) => s + (e.type === 'PURCHASE' ? e.debit : 0), 0)
              const monthCredit = entries.reduce((s, e) => s + (e.type === 'PAYMENT' ? e.credit : 0), 0)
              const monthWaste = entries.reduce((s, e) => s + (e.type === 'WASTE' ? e.credit : 0), 0)

              return (
                <div key={month}>
                  {/* Month Header */}
                  <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md px-6 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-black text-slate-300 uppercase tracking-widest">{month}</span>
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="text-amber-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        ₹{monthDebit.toLocaleString('en-IN', { maximumFractionDigits: 0 })} bought
                      </span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        ₹{monthCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })} paid
                      </span>
                      {monthWaste > 0 && (
                        <span className="text-red-400 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          ₹{monthWaste.toLocaleString('en-IN', { maximumFractionDigits: 0 })} waste
                        </span>
                      )}
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-white/5 hover:bg-transparent">
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-widest h-10 px-6">Date</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-widest h-10 px-6">Type</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-widest h-10 px-6">Description</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-widest h-10 px-6">By</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-widest h-10 px-6 text-right">Debit (₹)</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-widest h-10 px-6 text-right">Credit (₹)</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-widest h-10 px-6 text-right">Balance (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id} className="border-b border-border hover:bg-foreground/[0.03] transition-colors">
                          {/* Date */}
                          <TableCell className="px-6 py-4">
                            <div className="text-xs text-slate-300 font-medium">{formatDateIST(entry.date)}</div>
                            <div className="text-[10px] text-slate-500">{formatTimeIST(entry.date)}</div>
                          </TableCell>

                          {/* Type Badge */}
                          <TableCell className="px-6 py-4">
                            {entry.type === 'PURCHASE' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                <ShoppingCart className="w-3 h-3" />
                                Purchase
                              </span>
                            ) : entry.type === 'PAYMENT' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                <Wallet className="w-3 h-3" />
                                Payment
                              </span>
                            ) : (
                               <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-wider">
                                <Trash2 className="w-3 h-3" />
                                Waste
                              </span>
                            )}
                          </TableCell>

                          {/* Description */}
                          <TableCell className="px-6 py-4">
                            <div className="text-sm text-slate-200 font-medium">{entry.description}</div>
                            {entry.type === 'PURCHASE' && entry.rate !== undefined && entry.rate > 0 && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {entry.isPieceBased ? (
                                    <>
                                        @ ₹{entry.rate.toFixed(2)} /piece 
                                        <span className="ml-1 opacity-60">(@ ₹{(entry.rate * (entry.piecesPerBox || 1)).toFixed(2)} /{entry.unit})</span>
                                    </>
                                ) : (
                                    `@ ₹${entry.rate.toFixed(2)} /${entry.unit}`
                                )}
                              </div>
                            )}
                          </TableCell>

                          {/* User */}
                          <TableCell className="px-6 py-4">
                            <span className="text-xs text-slate-400">{entry.user}</span>
                          </TableCell>

                          {/* Debit */}
                          <TableCell className="px-6 py-4 text-right">
                            {entry.debit > 0 ? (
                              <span className="text-sm font-bold text-amber-400">
                                {entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-600">—</span>
                            )}
                          </TableCell>

                          {/* Credit */}
                          <TableCell className="px-6 py-4 text-right">
                            {entry.credit > 0 ? (
                              <span className="text-sm font-bold text-emerald-400">
                                {entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-600">—</span>
                            )}
                          </TableCell>

                          {/* Running Balance */}
                          <TableCell className="px-6 py-4 text-right">
                            <span className={`text-sm font-black ${entry.balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {entry.balance > 0 ? '' : '-'}₹{Math.abs(entry.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            })
          )}
        </div>

        {/* Ledger Footer */}
        {ledger.length > 0 && (
          <div className="px-6 py-4 border-t border-border bg-muted/40 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Closing Balance</span>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[10px] text-amber-400/60 uppercase block">Total Debit</span>
                  <span className="text-sm font-black text-amber-400">₹{totalPurchased.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400/60 uppercase block">Total Credit</span>
                  <span className="text-sm font-black text-emerald-400">₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-red-400/60 uppercase block">Waste Deducted</span>
                  <span className="text-sm font-black text-red-400">₹{totalWaste.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="text-right pl-4 border-l border-white/10">
                  <span className="text-[10px] text-slate-500 uppercase block">Net Balance</span>
                  <span className={`text-lg font-black ${balanceDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    ₹{Math.abs(balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
