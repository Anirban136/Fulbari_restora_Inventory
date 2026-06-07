import React from "react"
import { cn } from "@/lib/utils"

interface HeroHeaderProps {
  title: string
  highlightedWord?: string
  subtitle: string
  badgeText: string
  statusText?: string
  icon: React.ReactNode
  colorGradient?: string
  sideComponent?: React.ReactNode
  className?: string
}

export function HeroHeader({
  title,
  highlightedWord,
  subtitle,
  badgeText,
  statusText,
  icon,
  colorGradient = "from-primary/50 to-primary",
  sideComponent,
  className
}: HeroHeaderProps) {
  return (
    <header className={cn("relative group perspective-1000", className)}>
      <div className={cn(
        "absolute -inset-1 bg-gradient-to-r blur-2xl opacity-30 group-hover:opacity-50 transition-all duration-1000 rounded-[3rem]",
        colorGradient
      )}></div>
      
      <div className="relative glass-panel p-8 lg:p-12 rounded-[3rem] border border-foreground/20 bg-foreground/[0.02] backdrop-blur-3xl overflow-hidden shadow-2xl flex flex-col xl:flex-row xl:items-center xl:flex-wrap justify-between gap-10">
        
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-foreground/20 to-transparent"></div>
        <div className="absolute -right-40 -top-40 w-96 h-96 bg-primary/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full"></div>
        
        <div className="relative z-10 flex-auto min-w-[280px] sm:min-w-[400px] xl:min-w-[600px]">
          <div className="flex items-center gap-3 mb-6">
            <div className={cn(
              "p-3 rounded-2xl shadow-lg border border-foreground/20 flex items-center justify-center animate-bounce-slow",
              "bg-gradient-to-br",
              colorGradient
            )}>
              {icon}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/60 mb-1">{badgeText}</span>
              {statusText && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">{statusText}</span>
                </div>
              )}
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl xl:text-7xl font-black text-foreground tracking-tighter leading-none mb-6">
            {title} {highlightedWord && (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60">
                {highlightedWord}
              </span>
            )}
          </h1>
          
          <p className="text-lg text-foreground/60 max-w-2xl font-medium leading-relaxed">
            {subtitle}
          </p>
        </div>

        {sideComponent && (
          <div className="relative z-10 flex flex-col gap-4 shrink-0 w-full sm:w-auto">
            {sideComponent}
          </div>
        )}
      </div>
    </header>
  )
}
