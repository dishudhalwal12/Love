"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  UserPlus, 
  CheckSquare, 
  CreditCard, 
  ArrowRight,
  Plus
} from "lucide-react";
import { useRouter } from "next/navigation";

export function QuickAddDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();

  const actions = [
    {
      title: "Add New Lead",
      desc: "Capture a new potential client.",
      icon: UserPlus,
      href: "/leads",
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Create Task",
      desc: "Add something to your to-do list.",
      icon: CheckSquare,
      href: "/tasks",
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    },
    {
      title: "Record Payment",
      desc: "Log a new payment from a client.",
      icon: CreditCard,
      href: "/payments",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>Quick Add</DialogTitle>
          <DialogDescription>
            What would you like to add right now?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 pt-4">
          {actions.map((action) => (
            <button
              key={action.title}
              onClick={() => {
                router.push(action.href);
                onOpenChange(false);
              }}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] transition-all text-left group"
            >
              <div className={`w-10 h-10 rounded-lg ${action.bg} flex items-center justify-center shrink-0`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{action.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{action.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
