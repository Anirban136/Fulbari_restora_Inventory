import { getAggregatedCategories } from "./actions"
import { CategoryManagerClient } from "./CategoryManagerClient"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Category Manager | Fulbari",
  description: "Global category auditing and refinement dashboard for Fulbari Operations Unit.",
}

export default async function CategoryManagerPage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER" && session.user.role !== "ADMIN")) {
    redirect("/dashboard")
  }

  const initialCategories = await getAggregatedCategories()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12 relative z-10 glass-panel p-8 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
            Category Manager
            <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_15px_#10b981]"></div>
          </h2>
          <p className="text-muted-foreground/60 mt-2 font-bold text-sm tracking-widest uppercase flex items-center gap-2">
            <span className="text-emerald-500/80">AUDIT</span> • CLASSIFICATION & REFINEMENT HUB
          </p>
        </div>
      </div>

      <CategoryManagerClient initialCategories={initialCategories} />
    </div>
  )
}
