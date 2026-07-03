"use client"

import { wipeTestData } from "./actions"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Loader2, AlertTriangle, ShieldCheck, Lock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function WipePage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleWipe() {
    if (!pin) {
      setError("Please enter your Admin PIN")
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      await wipeTestData(pin)
      setSuccess(true)
      setShowConfirm(false)
      toast.success("Database successfully wiped!")
    } catch (e: any) {
      setError(e.message)
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/20">
        <AlertTriangle className="w-10 h-10" />
      </div>
      <div>
        <h1 className="text-3xl font-black text-foreground mb-2">Reset Test Data</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          This will securely wipe all your test orders, inventory items, vendors, and menus so you can start fresh. <br/> <strong className="text-emerald-400">Your accounts, passwords, and outlets will be kept safe.</strong>
        </p>
      </div>

      <Button 
        onClick={() => setShowConfirm(true)}
        disabled={loading || success}
        variant="destructive"
        className="mt-6 h-14 px-8 text-lg font-bold rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.3)] transition-all active:scale-95"
      >
        {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Wiping Database...</> : success ? "Database Wiped Successfully!" : "Yes, Wipe All Test Data"}
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-[425px] bg-[#0A0A0B] border-foreground/10 rounded-2xl shadow-2xl">
          <DialogHeader>
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-4 border border-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-bold text-foreground">Security Verification</DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              This action is destructive and cannot be undone. To proceed, please enter your <strong className="text-foreground">Admin PIN</strong> for confirmation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pin" className="text-foreground ml-1">Admin PIN</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter 4-digit PIN"
                  className="pl-10 h-12 bg-foreground/5 border-foreground/10 text-foreground rounded-xl focus:ring-amber-500/50 focus:border-amber-500 transition-all text-lg tracking-widest"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value)
                    setError(null)
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleWipe()
                  }}
                />
              </div>
              {error && <p className="text-red-400 text-sm font-medium ml-1">{error}</p>}
            </div>
          </div>
          
          <DialogFooter className="mt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowConfirm(false)}
              className="rounded-xl border-foreground/10 hover:bg-foreground/5 text-foreground"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleWipe}
              disabled={loading || !pin}
              className="rounded-xl bg-red-500 hover:bg-red-600 font-bold shadow-lg shadow-red-500/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Wipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
