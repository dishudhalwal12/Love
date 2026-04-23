"use client";

import { useFirestore } from "@/features/hooks";
import { Lead, Order, Payment } from "@/features/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Users, DollarSign, Clock, Target, ShieldAlert } from "lucide-react";
import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { subDays, isAfter } from "date-fns";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30");
  const { data: leads, loading: leadsLoading } = useFirestore<Lead>("leads");
  const { data: orders, loading: ordersLoading } = useFirestore<Order>("orders");
  const { data: payments, loading: paymentsLoading } = useFirestore<Payment>("payments");

  const loading = leadsLoading || ordersLoading || paymentsLoading;

  const filteredData = useMemo(() => {
    const days = parseInt(period);
    const cutoff = subDays(new Date(), days);

    const periodLeads = leads.filter(l => isAfter(new Date(l.createdAt), cutoff));
    const periodOrders = orders.filter(o => isAfter(new Date(o.createdAt), cutoff));
    const periodPayments = payments.filter(p => p.status === "Paid" && isAfter(new Date(p.paidAt), cutoff));

    return { leads: periodLeads, orders: periodOrders, payments: periodPayments };
  }, [leads, orders, payments, period]);

  // Aggregations
  const totalRevenue = filteredData.payments.reduce((acc, p) => acc + p.amount, 0);
  const avgOrderValue = filteredData.orders.length > 0 ? Math.round(filteredData.orders.reduce((acc, o) => acc + o.amount, 0) / filteredData.orders.length) : 0;

  // Leads by source (Pie Chart)
  const sourceCount = filteredData.leads.reduce((acc: any, l) => {
    acc[l.source] = (acc[l.source] || 0) + 1;
    return acc;
  }, {});
  const sourceData = Object.keys(sourceCount).map(k => ({ name: k, value: sourceCount[k] }));

  // Conversion by college (Bar Chart)
  const collegeMetrics = filteredData.leads.reduce((acc: any, l) => {
    if (!acc[l.college]) acc[l.college] = { name: l.college, leads: 0, converted: 0 };
    acc[l.college].leads += 1;
    if (l.status === "Booked") acc[l.college].converted += 1;
    return acc;
  }, {});
  const collegeData = Object.values(collegeMetrics).map((c: any) => ({
    name: c.name,
    rate: c.leads > 0 ? Math.round((c.converted / c.leads) * 100) : 0
  })).sort((a, b) => b.rate - a.rate).slice(0, 5); // Top 5

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">Deep dive into performance and metrics.</p>
        </div>

        <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
          <SelectTrigger className="w-[180px] bg-card border-border/50">
            <SelectValue placeholder="Select Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
            <SelectItem value="365">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Revenue Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-status-success">${totalRevenue}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" /> Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">${avgOrderValue}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" /> Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{filteredData.leads.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{filteredData.orders.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border/40 shadow-sm flex flex-col min-h-[350px]">
          <CardHeader>
            <CardTitle className="text-lg">Leads by Source</CardTitle>
            <CardDescription>Where your traffic is coming from.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                    itemStyle={{ color: "var(--foreground)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground text-sm">No lead data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/40 shadow-sm flex flex-col min-h-[350px]">
          <CardHeader>
            <CardTitle className="text-lg">Top Colleges by Conversion %</CardTitle>
            <CardDescription>Colleges yielding the highest close rates.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            {collegeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={collegeData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickFormatter={val => `${val}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                    cursor={{ fill: "var(--muted)", opacity: 0.2 }}
                    formatter={(val) => [`${val}%`, "Conversion Rate"]}
                  />
                  <Bar dataKey="rate" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground text-sm">No conversion data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
