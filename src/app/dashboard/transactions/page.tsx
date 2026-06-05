import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic'
import { TransactionsFeed } from "./_components/TransactionsFeed"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

import { HeroHeader } from "@/components/ui/hero-header"
import { Receipt } from "lucide-react"

export default async function AdminTransactionsPage() {
  const session = await getServerSession(authOptions)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const transactions = await prisma.tab.findMany({
    where: { 
      status: "CLOSED", 
      openedAt: { gte: thirtyDaysAgo } 
    },
    include: { 
      User: true,
      Outlet: true
    },
    orderBy: { openedAt: "desc" }
  })

  return (
    <div className="space-y-12 relative pb-20">
      <HeroHeader 
        title="Transaction"
        highlightedWord="Ledger"
        subtitle="Review historical sales, monitor cash flow, and rectify financial discrepancies."
        badgeText="Financial Records"
        icon={<Receipt className="w-6 h-6 text-foreground" />}
        colorGradient="from-blue-500/50 to-cyan-500"
      />

      <div className="relative z-10">
        <TransactionsFeed 
          initialTransactions={transactions} 
          userRole={session?.user?.role} 
        />
      </div>
    </div>
  )
}
