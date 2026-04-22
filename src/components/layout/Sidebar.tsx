"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Users,
  ShoppingCart,
  Briefcase,
  CreditCard,
  Handshake,
  CheckSquare,
  FileText,
  Workflow,
  BarChart2,
  LayoutTemplate,
  Settings,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/context/SettingsContext";
import { Zap } from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Projects", href: "/projects", icon: Briefcase },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Partners", href: "/partners", icon: Handshake },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Files", href: "/files", icon: FileText },
  { name: "Automations", href: "/automations", icon: Workflow },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
  { name: "Templates", href: "/templates", icon: LayoutTemplate },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { settings, toggleSeasonMode } = useSettings();
  const isSeasonMode = settings?.seasonModeEnabled;

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col h-screen sticky top-0 shrink-0 hidden md:flex">
      {/* Logo Area */}
      <div className="h-14 flex items-center px-6 border-b border-border/50">
        <h1 className="font-bold tracking-widest text-lg">LOVE.</h1>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname === "/" && item.href === "/dashboard");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "")} />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 bg-sidebar/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-xs font-bold text-black">
                F
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-sidebar rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground leading-tight">Founder</span>
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => toggleSeasonMode()}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-all duration-300",
            isSeasonMode 
              ? "bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]" 
              : "text-muted-foreground hover:text-foreground bg-sidebar-accent/30 hover:bg-sidebar-accent/60"
          )}
        >
          <span className="flex items-center gap-2">
            {isSeasonMode ? <Zap className="w-3 h-3 fill-current animate-pulse" /> : <Moon className="w-3 h-3" />}
            Season Mode
          </span>
          <div className={cn(
            "w-7 h-3.5 rounded-full relative transition-colors duration-300",
            isSeasonMode ? "bg-orange-500" : "bg-muted"
          )}>
            <div className={cn(
              "w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-all duration-300 shadow-sm",
              isSeasonMode ? "right-0.5" : "left-0.5"
            )}></div>
          </div>
        </button>
      </div>
    </aside>
  );
}
