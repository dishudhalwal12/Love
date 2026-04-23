"use client";

import { useFirestore } from "@/features/hooks";
import { Payment, Order } from "@/features/types";
import { triggerPaymentWebhook } from "@/features/webhooks";
import { activityEvents, deleteActivityLogs } from "@/features/activity";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Wallet, CalendarDays, RefreshCcw, Loader2, Plus, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";

import { useState, useMemo } from "react";
import { orderBy } from "firebase/firestore";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSettings } from "@/context/SettingsContext";

export default function PaymentsPage() {
  const { data: payments, loading: paymentsLoading, add: addPayment, remove: removePayment } = useFirestore<Payment>("payments", [orderBy("paidAt", "desc")]);

  const { data: orders, update: updateOrder } = useFirestore<Order>("orders");
  const { settings } = useSettings();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({
    orderId: "", amount: 0, method: "UPI", status: "Paid", note: "",
  });

  // Selected order for payment preview
  const selectedOrderData = useMemo(
    () => orders.find((o) => o.orderId === newPayment.orderId) ?? null,
    [orders, newPayment.orderId]
  );

  // Previous payments for selected order
  const orderPaymentHistory = useMemo(
    () => payments.filter((p) => p.orderId === newPayment.orderId && p.status === "Paid"),
    [payments, newPayment.orderId]
  );

  const orderPreviouslyPaid = useMemo(
    () => orderPaymentHistory.reduce((acc, p) => acc + p.amount, 0),
    [orderPaymentHistory]
  );

  // Stats
  const collectedToday = payments
    .filter((p) => p.status === "Paid" && new Date(p.paidAt).toDateString() === new Date().toDateString())
    .reduce((acc, p) => acc + p.amount, 0);

  const pendingOrders = orders.filter((o) => o.amount > o.amountPaid);
  const pendingTotal = pendingOrders.reduce((acc, o) => acc + (o.amount - o.amountPaid), 0);

  const thisMonth = payments
    .filter((p) => p.status === "Paid" && new Date(p.paidAt).getMonth() === new Date().getMonth())
    .reduce((acc, p) => acc + p.amount, 0);

  // Overdue detection
  const reminderDays = settings?.paymentReminderDays ?? 2;
  const overdueOrders = orders.filter((o) => {
    if (o.amount <= o.amountPaid || o.status === "Closed" || o.status === "Delivered") return false;
    const ageMs = Date.now() - o.createdAt;
    return ageMs > reminderDays * 24 * 60 * 60 * 1000;
  });

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const order = selectedOrderData;
      const clientName = order ? order.clientName : "Unknown Client";
      const paymentAmount = Number(newPayment.amount) || 0;

      const paymentData = {
        orderId: newPayment.orderId || "Unknown",
        amount: paymentAmount,
        method: newPayment.method || "UPI",
        clientName,
        note: newPayment.note || "",
        status: (newPayment.status as Payment["status"]) || "Paid",
        paidAt: Date.now(),
        updatedAt: Date.now(),
      };

      const paymentId = await addPayment(paymentData);

      // Auto-update order amountPaid + remaining balance
      if (order && paymentData.status === "Paid") {

        const newAmountPaid = order.amountPaid + paymentAmount;
        const remainingBalance = order.amount - newAmountPaid;
        const isFullyPaid = remainingBalance <= 0;

        await updateOrder(order.id!, {
          amountPaid: newAmountPaid,
        });

        if (isFullyPaid) {
          toast.success(`✅ Order ${order.orderId} is now FULLY PAID!`, {
            duration: 5000,
            action:
              order.status === "Final Payment"
                ? {
                    label: "Mark Delivered",
                    onClick: async () => {
                      await updateOrder(order.id!, {
                        status: "Delivered",
                        deliveredAt: Date.now(),
                      });
                      toast.success(`Order ${order.orderId} marked as Delivered`);
                    },
                  }
                : undefined,
          });
        } else {
          toast.success("Payment added successfully!");
        }
      } else {
        toast.success("Payment added successfully!");
      }

      setIsAddOpen(false);
      setNewPayment({ orderId: "", amount: 0, method: "UPI", status: "Paid", note: "" });

      activityEvents.paymentAdded(paymentData.orderId, paymentData.amount, paymentData.method, paymentId);
      triggerPaymentWebhook(paymentData);

    } catch {
      toast.error("Failed to add payment");
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this payment record?")) return;
    try {
      await removePayment(id);
      await deleteActivityLogs(id);
      toast.success("Payment record deleted");
    } catch {

      toast.error("Failed to delete payment");
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Payments</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage revenue and collections.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 w-full sm:w-auto h-11 sm:h-9" />}>
            <Plus className="w-4 h-4" /> Add Payment
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px] bg-card border-border/50">
            <DialogHeader>
              <DialogTitle>Add Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPayment} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Select
                  value={newPayment.orderId}
                  onValueChange={(v) => v && setNewPayment({ ...newPayment, orderId: v })}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Select Order" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingOrders.map((o) => (
                      <SelectItem key={o.id} value={o.orderId}>
                        {o.orderId} — {o.clientName} (Pending: ₹{o.amount - o.amountPaid})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment history for selected order */}
              {selectedOrderData && orderPaymentHistory.length > 0 && (
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Previous Payments</p>
                  {orderPaymentHistory.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{format(new Date(p.paidAt), "MMM dd")} · {p.method}</span>
                      <span className="font-medium text-status-success">+₹{p.amount}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs pt-1 border-t border-border/30 mt-1">
                    <span className="text-muted-foreground">Total Paid</span>
                    <span className="font-semibold">₹{selectedOrderData.amountPaid}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className="font-semibold text-status-urgent">₹{selectedOrderData.amount - selectedOrderData.amountPaid}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="Amount (₹)"
                    value={newPayment.amount || ""}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                    required
                    className="bg-background/50 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Select value={newPayment.method} onValueChange={(v) => v && setNewPayment({ ...newPayment, method: v })}>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Stripe">Stripe</SelectItem>
                      <SelectItem value="PayPal">PayPal</SelectItem>
                      <SelectItem value="Crypto">Crypto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Select value={newPayment.status} onValueChange={(v) => v && setNewPayment({ ...newPayment, status: v as Payment["status"] })}>
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Optional Note"
                  value={newPayment.note || ""}
                  onChange={(e) => setNewPayment({ ...newPayment, note: e.target.value })}
                  className="bg-background/50 border-border/50"
                />
              </div>
              <Button type="submit" className="w-full mt-4">Save Payment</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overdue alert banner */}
      {overdueOrders.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-2xl border border-status-urgent/30 bg-status-urgent/5 text-status-urgent text-xs animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold">{overdueOrders.length} order(s)</span> are overdue:{" "}
            <span className="opacity-80">
              {overdueOrders.slice(0, 3).map((o) => o.orderId).join(", ")}
              {overdueOrders.length > 3 ? ` +${overdueOrders.length - 3} more` : ""}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-card border-border/40 shadow-none rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 pt-3 md:pt-4 px-3 md:px-4 space-y-0">
            <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider font-bold">Today</CardTitle>
            <DollarSign className="w-3.5 h-3.5 text-status-success" />
          </CardHeader>
          <CardContent className="px-3 md:px-4 pb-3 md:pb-4">
            <div className="text-xl md:text-2xl font-bold">₹{collectedToday}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/40 shadow-none rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 pt-3 md:pt-4 px-3 md:px-4 space-y-0">
            <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider font-bold">Pending</CardTitle>
            <RefreshCcw className="w-3.5 h-3.5 text-status-pending" />
          </CardHeader>
          <CardContent className="px-3 md:px-4 pb-3 md:pb-4">
            <div className="text-xl md:text-2xl font-bold">₹{pendingTotal}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/40 shadow-none rounded-2xl overflow-hidden col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 pt-3 md:pt-4 px-3 md:px-4 space-y-0">
            <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider font-bold">This Month</CardTitle>
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
          </CardHeader>
          <CardContent className="px-3 md:px-4 pb-3 md:pb-4">
            <div className="text-xl md:text-2xl font-bold">₹{thisMonth}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <div className="px-1 md:px-4 py-3 flex items-center justify-between mb-4">
          <h3 className="font-bold tracking-tight text-white uppercase text-xs tracking-[0.2em]">Recent Transactions</h3>
        </div>

        <div className="hidden md:block border border-border/50 rounded-2xl overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="font-medium">TX ID</TableHead>
                <TableHead className="font-medium">Order</TableHead>
                <TableHead className="font-medium">Client</TableHead>
                <TableHead className="font-medium">Amount</TableHead>
                <TableHead className="font-medium">Method</TableHead>
                <TableHead className="font-medium">Date</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No payments found.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((tx) => (
                  <TableRow key={tx.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">TX-{tx.id?.slice(0, 6)}</TableCell>
                    <TableCell className="font-medium">{tx.orderId}</TableCell>
                    <TableCell className="text-muted-foreground">{tx.clientName}</TableCell>
                    <TableCell className="font-medium text-foreground font-bold">₹{tx.amount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                        <Wallet className="w-3.5 h-3.5" />
                        <span>{tx.method}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(tx.paidAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`font-bold text-[10px] uppercase tracking-wider ${
                          tx.status === "Paid"
                            ? "bg-status-success/20 text-status-success border-status-success/30"
                            : tx.status === "Pending"
                            ? "bg-status-pending/20 text-status-pending border-status-pending/30"
                            : "bg-status-urgent/20 text-status-urgent border-status-urgent/30"
                        } border`}
                      >
                        {tx.status === "Paid" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-status-urgent hover:bg-status-urgent/10"
                        onClick={() => handleDeletePayment(tx.id!)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          {paymentsLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed border-border/50">
              No payments found.
            </div>
          ) : (
            payments.map((tx) => (
              <Card key={tx.id} className="bg-card/50 border-white/[0.05] rounded-2xl overflow-hidden shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-base">₹{tx.amount}</span>
                        <Badge
                          variant="secondary"
                          className={`text-[9px] px-1.5 py-0 rounded-full font-bold uppercase tracking-wider ${
                            tx.status === "Paid" ? "bg-status-success/20 text-status-success" : "bg-status-pending/20 text-status-pending"
                          }`}
                        >
                          {tx.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                        {tx.orderId} · {tx.clientName}
                      </p>
                    </div>
                    <div className="text-[10px] text-muted-foreground text-right">
                      {format(new Date(tx.paidAt), "MMM dd, hh:mm a")}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                      <Wallet className="w-3 h-3" /> {tx.method}
                      {tx.note && <span className="opacity-60 italic">· {tx.note}</span>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-status-urgent hover:bg-status-urgent/10"
                      onClick={() => handleDeletePayment(tx.id!)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
