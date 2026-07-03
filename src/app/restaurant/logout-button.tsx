"use client"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export default function LogoutButton() {
  return (
    <Button 
       variant="outline" 
       onClick={() => signOut({ callbackUrl: "/login" })}
       className="border-slate-300 text-foreground hover:bg-slate-100 font-semibold"
    >
       <LogOut className="w-4 h-4 mr-2" /> Exit
    </Button>
  )
}
