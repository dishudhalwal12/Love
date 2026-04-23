"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ShoppingCart, CreditCard, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  Briefcase, Handshake, CheckSquare, FileText, 
  Workflow, BarChart2, LayoutTemplate, Settings, LogOut, Sparkles 
} from "lucide-react";
import { AssistantModal } from "@/components/assistant/AssistantModal";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { toast } from "sonner";

const mainItems = [
  { name: "Dash", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Pay", href: "/payments", icon: CreditCard },
];

const secondaryItems = [
  { name: "Assistant", href: "#", icon: Sparkles, isAction: true },
  { name: "Projects", href: "/projects", icon: Briefcase },
  { name: "Partners", href: "/partners", icon: Handshake },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Files", href: "/files", icon: FileText },
  { name: "Automations", href: "/automations", icon: Workflow },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
  { name: "Templates", href: "/templates", icon: LayoutTemplate },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
    } catch (e) {
      toast.error("Failed to logout");
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-xl border-t border-border/50 z-50 px-4 flex items-center justify-between">
      {mainItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 py-1 transition-all relative",
              isActive ? "text-primary" : "text-muted-foreground/60"
            )}
          >
            {isActive && (
              <div className="absolute -top-1 w-8 h-[2px] bg-primary blur-[2px] rounded-full animate-in fade-in zoom-in duration-500" />
            )}
            <item.icon className={cn("w-5 h-5", isActive && "scale-110 drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
            <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest scale-90">{item.name}</span>
          </Link>
        );
      })}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<button className="flex flex-col items-center gap-1 flex-1 py-1 text-muted-foreground" />}>
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">More</span>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh] bg-card border-t border-border/50 rounded-t-3xl p-6">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-left text-xl font-bold tracking-tight">LOVE. Menu</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4 overflow-y-auto max-h-full pb-20">
            {secondaryItems.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  if ((item as any).isAction) {
                    setAssistantOpen(true);
                  } else {
                    window.location.href = item.href;
                  }
                  setOpen(false);
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[10px] font-medium text-center">{item.name}</span>
              </button>
            ))}
            <button
              onClick={() => {
                handleLogout();
                setOpen(false);
              }}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium text-center">Logout</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <AssistantModal open={assistantOpen} onOpenChange={setAssistantOpen} />
    </div>
  );
}
