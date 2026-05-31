"use client"

import { useState } from "react"
import { Pencil, Loader2, LayoutGrid, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateTab, reopenTab } from "@/app/tabs/[tabId]/actions"
import { useRouter } from "next/navigation"

export function EditTransactionModal({ tabId, currentAmount, currentMode }: { tabId: string, currentAmount: number, currentMode: string }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(currentAmount.toString())
  const [mode, setMode] = useState(currentMode)
  const [loading, setLoading] = useState(false)
  const [reopenLoading, setReopenLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await updateTab(tabId, parseFloat(amount), mode)
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleReopen = async () => {
    setReopenLoading(true)
    try {
      await reopenTab(tabId)
    } catch (error) {
      console.error(error)
      setReopenLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-foreground/10 text-muted-foreground hover:text-primary">
          <Pencil className="h-4 w-4" />
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground rounded-[2rem] overflow-hidden">
        <DialogHeader className="pt-6 px-6">
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Modify Bill</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-8">
          {/* Action 1: Full Edit (Preferred) */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] px-1 italic">Option A: Detailed Correction</h3>
            <Button 
               onClick={handleReopen} 
               disabled={reopenLoading}
               className="w-full h-20 bg-primary/10 hover:bg-primary/20 border-2 border-primary/20 hover:border-primary/40 text-primary rounded-2xl flex items-center justify-between px-6 group transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-xl group-hover:scale-110 transition-transform">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-black uppercase text-xs tracking-wider">Open in Register</p>
                  <p className="text-[9px] font-bold opacity-60 uppercase tracking-tight">Edit items, quantity & payment</p>
                </div>
              </div>
              {reopenLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />}
            </Button>
          </div>

          <div className="relative">
             <div className="absolute inset-x-0 top-1/2 h-px bg-border"></div>
             <span className="relative bg-background px-4 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 left-1/2 -translate-x-1/2 italic">OR</span>
          </div>

          {/* Action 2: Quick Adjustment */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] px-1 italic">Option B: Quick Fix</h3>
            <div className="space-y-4 bg-foreground/5 p-5 rounded-2xl border border-border">
              <div className="grid gap-2">
                <Label htmlFor="amount" className="text-[9px] font-black uppercase text-muted-foreground tracking-widest opacity-40">Adjust Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-foreground/5 border-border h-11 text-base font-bold focus:border-primary/50 text-foreground"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mode" className="text-[9px] font-black uppercase text-muted-foreground tracking-widest opacity-40">Update Mode</Label>
                <Select value={mode} onValueChange={(val) => val && setMode(val)}>
                  <SelectTrigger className="bg-foreground/5 border-border h-11 text-sm font-bold text-foreground">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border text-foreground">
                    <SelectItem value="CASH">CASH</SelectItem>
                    <SelectItem value="ONLINE">ONLINE (UPI/CARD)</SelectItem>
                    <SelectItem value="SPLIT">SPLIT</SelectItem>
                    <SelectItem value="COMPLEMENTARY">COMPLEMENTARY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} disabled={loading} className="w-full h-11 bg-foreground/5 hover:bg-foreground/10 border border-border text-foreground font-black uppercase text-[10px] tracking-widest">
                {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                Update Metadata Only
              </Button>
            </div>
          </div>
        </div>
        
        <div className="bg-muted/30 p-4 flex justify-center">
           <button onClick={() => setOpen(false)} className="text-[10px] font-black text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors">Close Window</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
