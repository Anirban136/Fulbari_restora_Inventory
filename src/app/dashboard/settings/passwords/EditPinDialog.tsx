"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Edit2, KeyRound, CheckCircle2 } from "lucide-react"
import { updateUserPinAdmin } from "./actions"
import { toast } from "sonner"

export function EditPinDialog({ userId, userName, currentPin }: { userId: string, userName: string, currentPin: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [newPin, setNewPin] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setLoading(true)

    try {
      await updateUserPinAdmin(userId, newPin)
      setSuccess(true)
      toast.success("PIN reset successful", {
        description: `New passcode applied for ${userName}.`,
        icon: <KeyRound className="w-5 h-5 text-emerald-500" />
      })
      setNewPin("")
      setTimeout(() => setIsOpen(false), 2000)
    } catch (err: any) {
      setError(err.message)
      toast.error("Failed to update PIN")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 flex items-center justify-center rounded-md transition-all active:scale-95 border border-white/5">
        <Edit2 className="w-4 h-4" />
      </DialogTrigger>
      <DialogContent className="border-border bg-background/95 backdrop-blur-2xl text-foreground shadow-[0_0_100px_-20px_oklch(0.55_0.16_150)]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
            <KeyRound className="w-6 h-6 text-emerald-400" />
            Update {userName}'s PIN
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-10 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            <h3 className="text-xl font-bold text-foreground mb-2">PIN Updated!</h3>
            <p className="text-slate-400 font-medium">The passcode has been successfully<br/>reset by the system administrator.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">New 4-Digit PIN</label>
              <Input 
                type="password" pattern="[0-9]*" inputMode="numeric" maxLength={4}
                value={newPin} onChange={e => setNewPin(e.target.value)}
                className="w-full text-center text-3xl tracking-[0.5em] h-14 bg-foreground/5 border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl focus-visible:ring-emerald-500/50 shadow-inner"
                placeholder="****"
                required
              />
            </div>
            {error && (
              <div className="text-red-400 text-sm font-bold text-center bg-red-950/40 border border-red-500/20 py-3 rounded-lg animate-in slide-in-from-top-2">
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading || newPin.length !== 4} className="w-full h-12 text-lg font-black tracking-widest uppercase bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black rounded-xl transition-all shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)] active:scale-95 disabled:opacity-50">
              {loading ? "Updating..." : "Save New PIN"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
