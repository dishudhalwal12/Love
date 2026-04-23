"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, UserPlus, ShieldCheck, Heart } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Account created successfully");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Login successful");
      }
      router.push("/dashboard");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#09090b] overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-[440px] px-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center justify-center mb-4 shadow-2xl backdrop-blur-sm">
            <Heart className="w-8 h-8 text-white fill-white/10" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter text-white mb-1">LOVE.</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] font-medium">Command Center</p>
        </div>

        <Card className="bg-white/[0.02] border-white/[0.08] backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden">
          <CardHeader className="pt-8 pb-4 text-center">
            <CardTitle className="text-xl font-semibold text-white">
              {isSignUp ? "Create Admin Account" : "Founder Login"}
            </CardTitle>
            <CardDescription className="text-muted-foreground/60">
              {isSignUp
                ? "Setup your administrative access"
                : "Secure access to your operations dashboard"}
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleAuth}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    required
                    className="bg-white/[0.03] border-white/[0.08] h-12 px-4 rounded-xl focus:ring-1 focus:ring-white/20 transition-all placeholder:text-muted-foreground/30"
                  />
                </div>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    required
                    className="bg-white/[0.03] border-white/[0.08] h-12 px-4 rounded-xl focus:ring-1 focus:ring-white/20 transition-all placeholder:text-muted-foreground/30"
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex-col gap-6 pb-10">
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-white text-black hover:bg-white/90 font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Verifying..." : isSignUp ? "Initialize Dashboard" : "Enter Dashboard"}
              </Button>

              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs font-medium text-muted-foreground/60 hover:text-white transition-colors uppercase tracking-widest"
              >
                {isSignUp ? "Back to Login" : "Create New Admin"}
              </button>
            </CardFooter>
          </form>
        </Card>

        <p className="mt-8 text-center text-[10px] text-muted-foreground/30 uppercase tracking-widest">
          Authorized Personnel Only • Secure 256-bit Encryption
        </p>
      </div>
    </div>
  );
}
