import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ShieldAlert, KeyRound, UserRound, ShieldCheck } from "lucide-react"
import { EditPinDialog } from "./EditPinDialog"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function PasscodeManagementPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== "OWNER") {
    redirect("/dashboard")
  }

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' }
  })

  return (
    <div className="w-full max-w-5xl px-6 py-10 relative z-10 flex flex-col min-h-full">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 mb-12 border-b border-border gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center border border-border/50 shadow-[0_0_35px_-5px_oklch(0.65_0.22_150_/_0.4)] p-1">
            <div className="h-full w-full bg-background/40 rounded-xl flex items-center justify-center backdrop-blur-md">
              <KeyRound className="text-emerald-600 dark:text-emerald-400 w-8 h-8" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-black text-foreground tracking-tight">Passcode Control</h1>
            <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-1 tracking-widest uppercase text-xs flex items-center gap-2">
              <ShieldCheck className="w-3 h-3" /> System Security Management
            </p>
          </div>
        </div>
      </header>

      <div className="glass-panel overflow-hidden rounded-[2.5rem] border border-foreground/10 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.5)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border/10">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Profile</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Role</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Current Passcode</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u: any) => (
                <tr key={u.id} className="group hover:bg-foreground/[0.02] transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <UserRound className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-foreground text-lg">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-foreground/5 border border-foreground/10 text-slate-400">
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <code className="text-2xl font-black tracking-[0.3em] font-mono text-emerald-400/90 bg-emerald-500/5 px-4 py-2 rounded-xl border border-emerald-500/10 shadow-inner">
                      {u.pin}
                    </code>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <EditPinDialog userId={u.id} userName={u.name} currentPin={u.pin} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20">
        <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-500 shrink-0" />
        <p className="text-sm font-medium text-amber-700 dark:text-amber-200/80">
          <strong>Security Warning:</strong> These PINs are currently visible and editable only by you as an administrator. Ensure you are in a private environment while managing these credentials.
        </p>
      </div>
    </div>
  )
}
