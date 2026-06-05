import React from "react"
import { cn } from "@/lib/utils"

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: "default" | "card" | "subtle"
}

export function GlassPanel({ 
  children, 
  variant = "default",
  className,
  ...props
}: GlassPanelProps) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden group",
        variant === "default" && "glass-panel p-8 lg:p-12 rounded-[3rem] border border-foreground/10 bg-foreground/[0.03] shadow-2xl backdrop-blur-3xl",
        variant === "card" && "glass-panel p-6 rounded-[2.5rem] border border-foreground/10 bg-foreground/5 hover:bg-foreground/[0.08] transition-all shadow-xl",
        variant === "subtle" && "glass-panel p-4 rounded-2xl border border-foreground/5 bg-foreground/[0.02] shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
