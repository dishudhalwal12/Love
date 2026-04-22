"use client";

import { useState } from "react";
import { Search, Bell, Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { QuickAddDialog } from "./QuickAddDialog";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { toast } from "sonner";

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

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
            className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted/80 px-3 py-1.5 rounded-md transition-colors w-64 border border-border/50"
          >
            <Search className="w-4 h-4" />
            <span>Search...</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              M + Space
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Bell className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Quick Add</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-status-urgent ml-2" title="Logout">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <GlobalSearch open={searchOpen} setOpen={setSearchOpen} />
      <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </>
  );
}
