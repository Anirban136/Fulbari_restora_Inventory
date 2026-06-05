import { getAggregatedCategories } from "./actions"
import { CategoryManagerClient } from "./CategoryManagerClient"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

import { HeroHeader } from "@/components/ui/hero-header"
import { Tags } from "lucide-react"

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <HeroHeader 
        title="Category"
        highlightedWord="Manager"
        subtitle="Audit, classify, and refine global product categories across all hubs."
        badgeText="Classification Hub"
        icon={<Tags className="w-6 h-6 text-foreground" />}
        colorGradient="from-blue-500/50 to-indigo-500"
      />

      <CategoryManagerClient initialCategories={initialCategories} />
    </div>
  )
}
