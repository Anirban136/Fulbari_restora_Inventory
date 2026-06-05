"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Navigation } from "lucide-react";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const res = await signIn("credentials", {
      pin,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid PIN code.");
      setIsLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-emerald-500/30">
      
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-900/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-[380px] z-10">
        
        {/* Simple Clean Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-6 shadow-lg shadow-emerald-500/20">
            <Navigation className="w-8 h-8 text-foreground fill-white/20" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Fulbari Operations</h1>
          <p className="text-muted-foreground text-sm font-medium">Log in to your terminal</p>
        </div>

        {/* Clean Card */}
        <div className="bg-card/60 backdrop-blur-xl border border-border p-8 rounded-[2rem] shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-500" /> Secure PIN
              </label>
              
              <Input
                type="password"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={isLoading}
                autoFocus
                className="w-full text-center text-4xl tracking-[0.5em] px-4 py-8 bg-foreground/5 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/30 transition-all font-mono shadow-inner disabled:opacity-50"
                placeholder="••••"
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm font-semibold text-center bg-red-500/10 border border-red-500/20 py-3 rounded-xl animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading || pin.length !== 4}
              className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl transition-all shadow-[0_4px_20px_-5px_rgba(16,185,129,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none"
            >
              {isLoading ? "Authenticating..." : "Sign In"}
            </Button>
            
          </form>
        </div>
        
        {/* Footer info */}
        <div className="mt-8 text-center text-muted-foreground text-xs font-medium">
          Authorized personnel only. Activities are logged.
        </div>

      </div>
    </div>
  );
}
