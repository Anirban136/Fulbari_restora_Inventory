"use client"

import { useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { UnifiedSidebar } from "@/components/navigation/unified-sidebar"
import { cn } from "@/lib/utils"

export default function AppLayout({
  children,
  user
}: {
  children: React.ReactNode
  user: any
}) {
  const { status } = useSession()

  useEffect(() => {
    if (status === "loading") return
    if (status === "authenticated" && typeof window !== "undefined" && sessionStorage.getItem("pin_verified") !== "true") {
      signOut({ callbackUrl: "/login" })
    }
  }, [status])
  return (
    <div className="flex h-[100dvh] lg:h-auto lg:min-h-screen bg-background selection:bg-emerald-500/30 overflow-hidden lg:overflow-visible">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-foreground/5 rounded-full blur-[120px]" />
      </div>

      <UnifiedSidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 w-full max-w-[1600px] mx-auto overflow-x-hidden relative">
          {children}
        </main>
      </div>
    </div>
  )
}
