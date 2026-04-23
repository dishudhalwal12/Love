"use client";

import { useFirestore } from "@/features/hooks";
import { Lead, Order, Payment, ActivityLog, Task } from "@/features/types";
import { runSmartReminderEngine } from "@/features/workflow";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users, DollarSign, Briefcase, Star, Activity,
  ArrowUpRight, UserPlus, CreditCard,
  Search, CheckSquare, Zap, Clock, Loader2, BellRing, Handshake,
  Package, Target, ListTodo, FileText, Calendar
} from "lucide-react";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { orderBy } from "firebase/firestore";
import { formatDistanceToNow, differenceInMinutes, differenceInDays, differenceInHours } from "date-fns";
import { useSettings } from "@/context/SettingsContext";

const FALLBACK_7D = [
  { date: "Mon", revenue: 0 }, { date: "Tue", revenue: 0 }, { date: "Wed", revenue: 0 },
  { date: "Thu", revenue: 0 }, { date: "Fri", revenue: 0 }, { date: "Sat", revenue: 0 }, { date: "Sun", revenue: 0 },
];

export default function DashboardPage() {
  const router = useRouter();
  const [chartPeriod, setChartPeriod] = useState<"7d" | "30d">("7d");
  const { settings } = useSettings();
  const reminderRanRef = useRef(false);

  const { data: leads, loading: leadsLoading } = useFirestore<Lead>("leads");
  const { data: orders, loading: ordersLoading } = useFirestore<Order>("orders");
  const { data: payments, loading: paymentsLoading } = useFirestore<Payment>("payments");
  const { data: activityLogs, loading: logsLoading } = useFirestore<ActivityLog>("activity_logs", [orderBy("timestamp", "desc")]);
  const { data: tasks } = useFirestore<Task>("tasks");

  const loading = leadsLoading || ordersLoading || paymentsLoading || logsLoading;

  useEffect(() => {
    if (!reminderRanRef.current && leads.length + orders.length > 0) {
      reminderRanRef.current = true;
      runSmartReminderEngine();
    }
  }, [leads, orders]);

  const todayLeads = leads.filter((l) => new Date(l.createdAt).toDateString() === new Date().toDateString()).length;
  const revenueToday = payments
    .filter((p) => p.status === "Paid" && new Date(p.paidAt).toDateString() === new Date().toDateString())
    .reduce((acc, p) => acc + p.amount, 0);
  const pendingCollections = orders.reduce((acc, o) => acc + Math.max(0, o.amount - o.amountPaid), 0);
  const activeProjects = orders.filter((o) => o.status !== "Delivered" && o.status !== "Closed").length;
  const pendingProjects = orders.filter((o) => o.status === "Booked" || o.status === "Synopsis").length;

  const totalLeads = leads.length;
  const bookedLeads = leads.filter((l) => l.status === "Booked").length;
  const totalBookedOrders = orders.length;
  const paidOrders = orders.filter((o) => o.amountPaid >= o.amount && o.amount > 0).length;
  const deliveredOrders = orders.filter((o) => o.status === "Delivered" || o.status === "Closed").length;

  const leadsToBookedRate = totalLeads ? Math.round((bookedLeads / totalLeads) * 100) : 0;
  const bookedToPaidRate = totalBookedOrders ? Math.round((paidOrders / totalBookedOrders) * 100) : 0;
  const paidToDeliveredRate = paidOrders ? Math.round((deliveredOrders / paidOrders) * 100) : 0;

  // Additional metrics
  const contactedLeads = leads.filter(l => l.status === "Contacted" || l.status === "Interested" || l.status === "Negotiating" || l.status === "Booked").length;
  const interestedLeads = leads.filter(l => l.status === "Interested" || l.status === "Negotiating" || l.status === "Booked").length;
  const contactedToInterestedRate = contactedLeads ? Math.round((interestedLeads / contactedLeads) * 100) : 0;

  const closedOrders = orders.filter(o => o.status === "Closed").length;
  const deliveredToClosedRate = (deliveredOrders + closedOrders) ? Math.round((closedOrders / (deliveredOrders + closedOrders)) * 100) : 0;

  const overdueTasks = tasks.filter(
    (t) => t.dueAt && t.dueAt < Date.now() && t.columnId !== "done"
  ).length;

  const intelligenceAlerts = useMemo(() => {
    const alerts: {
      id: string;
      type: "urgent" | "warning" | "success" | "info";
      title: string;
      desc: string;
      icon: any;
    }[] = [];
    const now = new Date();

    const uncontacted = leads.filter(
      (l) => l.status === "New" && differenceInMinutes(now, new Date(l.createdAt)) > 30
    );
    if (uncontacted.length > 0) {
      const names = uncontacted.slice(0, 2).map((l) => l.name).join(", ");
      alerts.push({
        id: "uncontacted-leads",
        type: "warning",
        title: "Cold Leads Alert",
        desc: `${names}${uncontacted.length > 2 ? ` +${uncontacted.length - 2} more` : ""} waiting > 30 mins.`,
        icon: Users,
      });
    }

    const idleInterested = leads.filter(
      (l) =>
        l.status === "Interested" &&
        l.updatedAt &&
        differenceInHours(now, new Date(l.updatedAt)) > 24
    );
    if (idleInterested.length > 0) {
      alerts.push({
        id: "idle-interested",
        type: "warning",
        title: "Interested Lead Going Cold",
        desc: `${idleInterested.slice(0, 2).map((l) => l.name).join(", ")} idle for > 24h.`,
        icon: Clock,
      });
    }

    const highValue = leads.filter((l) => {
      const budgetVal = typeof l.budget === "number"
        ? l.budget
        : Number((l.budget as unknown as string)?.replace(/[^0-9]/g, "") || 0);
      return (l.status === "New" || l.status === "Negotiating") && budgetVal >= 5000;
    });
    if (highValue.length > 0) {
      alerts.push({
        id: "high-value-lead",
        type: "success",
        title: "High Intent Leads",
        desc: `${highValue.map((l) => l.name).slice(0, 2).join(", ")} — high budget, prioritize now.`,
        icon: Target,
      });
    }

    const tightDeadlines = orders.filter(
      (o) =>
        o.status !== "Delivered" &&
        o.status !== "Closed" &&
        o.deadline &&
        differenceInDays(new Date(o.deadline), now) <= 3 &&
        differenceInDays(new Date(o.deadline), now) >= 0
    );
    if (tightDeadlines.length > 0) {
      alerts.push({
        id: "tight-deadlines",
        type: "urgent",
        title: "Deadlines Approaching",
        desc: `${tightDeadlines.slice(0, 2).map((o) => o.orderId).join(", ")} — due in ≤3 days.`,
        icon: Calendar,
      });
    }

    const reminderDays = settings?.paymentReminderDays ?? 2;
    const agingBalances = orders.filter(
      (o) =>
        o.amount > o.amountPaid &&
        differenceInDays(now, new Date(o.createdAt)) > reminderDays &&
        o.status !== "Closed"
    );
    if (agingBalances.length > 0) {
      alerts.push({
        id: "aging-balances",
        type: "warning",
        title: "Overdue Payments",
        desc: `${agingBalances.slice(0, 2).map((o) => `${o.orderId} (₹${o.amount - o.amountPaid})`).join(", ")}.`,
        icon: DollarSign,
      });
    }

    if (overdueTasks > 0) {
      alerts.push({
        id: "overdue-tasks",
        type: "urgent",
        title: "Tasks Overdue",
        desc: `${overdueTasks} task(s) past their due date. Check the task board.`,
        icon: ListTodo,
      });
    }

    return alerts;
  }, [leads, orders, overdueTasks, settings?.paymentReminderDays]);

  const realChartData7d = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return days.map((date) => ({
      date: date.toLocaleDateString("en-US", { weekday: "short" }),
      revenue: payments
        .filter((p) => p.status === "Paid" && new Date(p.paidAt).toDateString() === date.toDateString())
        .reduce((acc, p) => acc + p.amount, 0),
    }));
  }, [payments]);

  const realChartData30d = useMemo(() => {
    return ["Week 1", "Week 2", "Week 3", "Week 4"].map((w, i) => {
      const now = new Date();
      const start = new Date(now.getTime() - (4 - i) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - (3 - i) * 7 * 24 * 60 * 60 * 1000);
      return {
        date: w,
        revenue: payments
          .filter((p) => p.status === "Paid" && p.paidAt >= start.getTime() && p.paidAt < end.getTime())
          .reduce((acc, p) => acc + p.amount, 0),
      };
    });
  }, [payments]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const chartData = chartPeriod === "7d" ? realChartData7d : realChartData30d;

  return (
    <div className="space-y-8 pb-8 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            Mission Control
            {settings?.seasonModeEnabled && (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px] uppercase tracking-wider font-bold">
                <Zap className="w-3 h-3 mr-1 fill-current" /> Season Mode
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Overview of your daily operations and live intelligence.</p>
        </div>
      </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">

        {/* LEFT: KPI Cards */}
        <div className="xl:col-span-3 flex flex-row xl:flex-col gap-4 overflow-x-auto xl:overflow-x-visible pb-2 xl:pb-0 scrollbar-hide snap-x">
          <Card className="min-w-[240px] xl:min-w-0 flex-1 rounded-xl border-white/[0.05] bg-card/50 backdrop-blur-sm shadow-sm flex flex-col relative overflow-hidden group snap-center">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
            <CardHeader className="pb-1 md:pb-2">
              <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground tracking-tight">Revenue Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-semibold text-white group-hover:scale-105 transition-transform origin-left">₹{revenueToday}</div>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] xl:min-w-0 flex-1 rounded-xl border-white/[0.05] bg-card/50 backdrop-blur-sm shadow-sm flex flex-col group snap-center">
            <CardHeader className="pb-1 md:pb-2">
              <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground tracking-tight">New Leads Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-semibold group-hover:scale-105 transition-transform origin-left">{todayLeads}</div>
            </CardContent>
          </Card>

          <Card className="min-w-[240px] xl:min-w-0 flex-1 rounded-xl border-white/[0.05] bg-card/50 backdrop-blur-sm shadow-sm flex flex-col group snap-center">
            <CardHeader className="pb-1 md:pb-2">
              <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground tracking-tight">Pending Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-semibold text-white group-hover:scale-105 transition-transform origin-left">₹{pendingCollections}</div>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] xl:min-w-0 flex-1 rounded-xl border-white/[0.05] bg-card/50 backdrop-blur-sm shadow-sm flex flex-col group snap-center">
            <CardHeader className="pb-1 md:pb-2">
              <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground tracking-tight">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-semibold group-hover:scale-105 transition-transform origin-left">{activeProjects}</div>
              {overdueTasks > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-status-urgent mt-1">
                  <BellRing className="w-3 h-3" /> {overdueTasks} task{overdueTasks > 1 ? "s" : ""} overdue
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-[200px] xl:min-w-0 flex-1 rounded-xl border-white/[0.05] bg-card/50 backdrop-blur-sm shadow-sm flex flex-col group snap-center">
            <CardHeader className="pb-1 md:pb-2">
              <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground tracking-tight">Pending Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-semibold group-hover:scale-105 transition-transform origin-left">{pendingProjects}</div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-6 space-y-4 md:space-y-6 flex flex-col h-full">
          {/* Live Intelligence Feed */}
          <Card className="rounded-xl border-white/[0.05] bg-card/30 shadow-sm flex flex-col h-[350px] md:h-[300px]">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </div>
                <CardTitle className="text-sm font-medium">Live Intelligence Feed</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex flex-col divide-y divide-border/10">
                {intelligenceAlerts.map((alert) => {
                  const colors = {
                    urgent: "text-rose-500 bg-rose-500/10",
                    warning: "text-amber-500 bg-amber-500/10",
                    success: "text-emerald-500 bg-emerald-500/10",
                    info: "text-blue-500 bg-blue-500/10",
                  };
                  const colorClass = colors[alert.type];
                  const Icon = alert.icon;

                  return (
                    <div key={alert.id} className="py-3 hover:bg-white/[0.05] px-2 -mx-2 rounded-lg transition-colors flex items-start gap-3 border-b border-white/[0.05] last:border-0 cursor-default">
                      <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{alert.title}</p>
                        <p className="text-xs text-white mt-0.5 line-clamp-2">{alert.desc}</p>
                      </div>
                    </div>
                  );
                })}
                {activityLogs.slice(0, 12).map((log) => {
                  const getLogIcon = (type: string) => {
                    switch (type) {
                      case "lead":
                      case "lead_status": return Users;
                      case "conversion": return Target;
                      case "order_status": return Package;
                      case "payment": return DollarSign;
                      case "task": return ListTodo;
                      case "partner": return UserPlus;
                      case "file": return FileText;
                      case "reminder": return BellRing;
                      default: return Activity;
                    }
                  };
                  const getLogLink = (type: string) => {
                    switch (type) {
                      case "lead":
                      case "lead_status":
                      case "conversion": return "/leads";
                      case "order_status": return "/orders";
                      case "payment": return "/payments";
                      case "task": return "/tasks";
                      case "partner": return "/partners";
                      default: return "#";
                    }
                  };
                  const Icon = getLogIcon(log.type);
                  const href = getLogLink(log.type);

                  return (
                    <Link 
                      key={log.id} 
                      href={href}
                      className="py-3 hover:bg-white/[0.05] px-2 -mx-2 rounded-lg transition-colors flex items-start gap-3 border-b border-white/[0.05] last:border-0"
                    >
                      <div className="mt-0.5 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-muted-foreground">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white leading-relaxed">{log.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {log.timestamp ? formatDistanceToNow(log.timestamp, { addSuffix: true }) : "just now"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
                {intelligenceAlerts.length === 0 && activityLogs.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    All clear — no alerts right now.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-white/[0.05] bg-card/30 shadow-sm flex flex-col flex-1 min-h-[300px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Revenue Trend</CardTitle>
              <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                <button
                  onClick={() => setChartPeriod("7d")}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${chartPeriod === "7d" ? "bg-white/10 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  7d
                </button>
                <button
                  onClick={() => setChartPeriod("30d")}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${chartPeriod === "30d" ? "bg-white/10 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  30d
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2 flex-1 h-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#09090b", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }}
                    itemStyle={{ color: "#10b981" }}
                    formatter={(value: any) => [`₹${value}`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-3 space-y-4 md:space-y-6 flex flex-col h-full pb-8 md:pb-0">
          <Card className="rounded-xl border-white/[0.05] bg-card/30 shadow-sm flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-1 flex flex-col gap-2">
              <Button
                className="w-full justify-start h-9 text-xs font-medium rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] transition-all text-white"
                onClick={() => router.push("/leads")}
              >
                <UserPlus className="w-3.5 h-3.5 mr-2 text-blue-500" /> Add Lead
              </Button>
              <Button
                className="w-full justify-start h-9 text-xs font-medium rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] transition-all text-white"
                onClick={() => router.push("/payments")}
              >
                <CreditCard className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Add Payment
              </Button>
              <Button
                className="w-full justify-start h-9 text-xs font-medium rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] transition-all text-white"
                onClick={() => router.push("/orders")}
              >
                <Search className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> Search Order
              </Button>
              <Button
                className="w-full justify-start h-9 text-xs font-medium rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] transition-all text-white"
                onClick={() => router.push("/tasks")}
              >
                <CheckSquare className="w-3.5 h-3.5 mr-2 text-amber-500" /> Create Task
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-white/[0.05] bg-card/30 shadow-sm flex flex-col flex-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium">Conversion Trend</CardTitle>
              <CardDescription className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Funnel progression</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-2 flex flex-col justify-center gap-5 flex-1">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <span>Contacted → Interested</span>
                  <span className="text-foreground">{contactedToInterestedRate}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${contactedToInterestedRate}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <span>Leads → Booked</span>
                  <span className="text-foreground">{leadsToBookedRate}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${leadsToBookedRate}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <span>Booked → Paid</span>
                  <span className="text-foreground">{bookedToPaidRate}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${bookedToPaidRate}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <span>Paid → Delivered</span>
                  <span className="text-foreground">{paidToDeliveredRate}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${paidToDeliveredRate}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <span>Delivered → Closed</span>
                  <span className="text-foreground">{deliveredToClosedRate}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-500 rounded-full transition-all duration-500" style={{ width: `${deliveredToClosedRate}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
