"use client"

import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { LogOut, KeyRound, CheckCircle2, Sun, Moon } from "lucide-react"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { changeUserPin } from "@/app/actions/user"

export function UserControls({ role }: { role?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isOwner = role === "OWNER" || role === "ADMIN"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setLoading(true)

    try {
      await changeUserPin(currentPin, newPin)
      setSuccess(true)
      setCurrentPin("")
      setNewPin("")
      setTimeout(() => setIsOpen(false), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end">
      {isOwner && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-muted h-9 px-4 py-2 border-border text-foreground/70 hover:text-foreground backdrop-blur-md shadow-sm">
            <KeyRound className="w-4 h-4 mr-2" /> Change PIN
          </DialogTrigger>
          <DialogContent className="border-border bg-background backdrop-blur-2xl text-foreground shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                <KeyRound className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                Reset Passcode
              </DialogTitle>
            </DialogHeader>

            {success ? (
              <div className="py-10 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                <h3 className="text-xl font-bold text-foreground mb-2">Success!</h3>
                <p className="text-muted-foreground font-medium">Your PIN has been updated.<br/>Please use it for future logins.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-foreground/60 uppercase tracking-widest">Current PIN</label>
                  <Input 
                    type="password" pattern="[0-9]*" inputMode="numeric" maxLength={4}
                    value={currentPin} onChange={e => setCurrentPin(e.target.value)}
                    className="w-full text-center text-3xl tracking-[0.5em] h-14 bg-muted/20 border-border text-foreground placeholder:text-muted-foreground rounded-xl focus-visible:ring-emerald-500/50 shadow-inner font-black"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-foreground/60 uppercase tracking-widest">New PIN</label>
                  <Input 
                    type="password" pattern="[0-9]*" inputMode="numeric" maxLength={4}
                    value={newPin} onChange={e => setNewPin(e.target.value)}
                    className="w-full text-center text-3xl tracking-[0.5em] h-14 bg-muted/20 border-border text-foreground placeholder:text-muted-foreground rounded-xl focus-visible:ring-emerald-500/50 shadow-inner font-black"
                    required
                  />
                </div>
                {error && (
                  <div className="text-red-600 dark:text-red-400 text-sm font-bold text-center bg-red-500/10 border border-red-500/20 py-3 rounded-lg animate-in slide-in-from-top-2">
                    {error}
                  </div>
                )}
                <Button type="submit" disabled={loading || currentPin.length !== 4 || newPin.length !== 4} className="w-full h-12 text-lg font-black tracking-widest uppercase bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50">
                  {loading ? "Updating..." : "Save New PIN"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}

      <Button onClick={() => signOut()} variant="outline" className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white backdrop-blur-md shadow-inner transition-colors">
        <LogOut className="w-4 h-4 mr-2" /> Logout
      </Button>
    </div>
  )
}
