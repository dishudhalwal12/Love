"use client";

import { useState, useEffect } from "react";
import { Search, Bell, Plus, LogOut, Clock, Sun, Moon, Sunset, Sunrise } from "lucide-react";


import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { QuickAddDialog } from "./QuickAddDialog";
import { AssistantModal } from "@/components/assistant/AssistantModal";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { toast } from "sonner";

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const [time, setTime] = useState(new Date());

  const getClockStyles = () => {
    const hour = time.getHours();
    if (hour >= 5 && hour < 12) return { icon: Sun, label: "Morning", color: "text-amber-400", glow: "shadow-[0_0_15px_rgba(251,191,36,0.3)]" };
    if (hour >= 12 && hour < 17) return { icon: Sun, label: "Afternoon", color: "text-orange-500", glow: "shadow-[0_0_20px_rgba(249,115,22,0.4)]", ring: "ring-2 ring-orange-500/20 p-0.5 rounded-full" };
    if (hour >= 17 && hour < 20) return { icon: Sunset, label: "Evening", color: "text-rose-400", glow: "shadow-[0_0_15px_rgba(251,113,133,0.3)]" };
    return { icon: Moon, label: "Night", color: "text-blue-400", glow: "shadow-[0_0_15px_rgba(96,165,250,0.3)]" };
  };

  const { icon: TimeIcon, color: iconColor, glow: glowClass, ring: ringClass } = getClockStyles();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
    } catch (e) {
      toast.error("Failed to logout");
    }
  };


  return (
    <>
      <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted/80 px-3 py-1.5 rounded-md transition-colors w-10 md:w-64 border border-border/50 justify-center md:justify-start"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">Search...</span>
            <kbd className="hidden md:inline-flex ml-auto pointer-events-none h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              M + Space
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-2 py-1 text-foreground font-mono text-sm tracking-widest transition-all duration-700">
            <div className={ringClass}>
              <TimeIcon className={`w-3.5 h-3.5 ${iconColor} animate-[pulse_3s_ease-in-out_infinite]`} />
            </div>
            <span>{time.toLocaleTimeString("en-IN", { hour12: false })}</span>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Bell className="w-4 h-4" />
          </Button>



          <Button
            size="sm"
            className="h-9 w-9 md:w-auto md:px-3 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full md:rounded-md"
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Quick Add</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-status-urgent ml-2" title="Logout">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <GlobalSearch open={searchOpen} setOpen={setSearchOpen} />
      <QuickAddDialog 
        open={quickAddOpen} 
        onOpenChange={setQuickAddOpen} 
        onOpenAssistant={() => setAssistantOpen(true)}
      />
      <AssistantModal open={assistantOpen} onOpenChange={setAssistantOpen} />
    </>
  );
}
