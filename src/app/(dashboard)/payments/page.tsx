"use client";

import { useFirestore } from "@/features/hooks";
import { Payment, Order } from "@/features/types";
import { logActivity } from "@/features/activity";
import { triggerPaymentWebhook } from "@/features/webhooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Wallet, CalendarDays, ArrowUpRight, ArrowDownRight, RefreshCcw, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { orderBy, query } from "firebase/firestore";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PaymentsPage() {
  const { data: payments, loading: paymentsLoading, add: addPayment } = useFirestore<Payment>("payments", [orderBy("paidAt", "desc")]);
  const { data: orders, update: updateOrder } = useFirestore<Order>("orders");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({ orderId: "", amount: 0, method: "Stripe", status: "Paid", note: "" });

  // Calculate stats
  const collectedToday = payments.filter(p => p.status === "Paid" && new Date(p.paidAt).toDateString() === new Date().toDateString()).reduce((acc, p) => acc + p.amount, 0);
  const pendingOrders = orders.filter(o => o.amount > o.amountPaid);
  const pendingTotal = pendingOrders.reduce((acc, o) => acc + (o.amount - o.amountPaid), 0);
  const thisMonth = payments.filter(p => p.status === "Paid" && new Date(p.paidAt).getMonth() === new Date().getMonth()).reduce((acc, p) => acc + p.amount, 0);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const order = orders.find(o => o.orderId === newPayment.orderId);
      const clientName = order ? order.clientName : "Unknown Client";

      const paymentData = {
        orderId: newPayment.orderId || "Unknown",
        amount: Number(newPayment.amount) || 0,
        method: newPayment.method || "Stripe",
        clientName,
        note: newPayment.note || "",
        status: newPayment.status as any || "Paid",
        paidAt: Date.now()
      };

      await addPayment(paymentData);

      // Update order amountPaid if payment is successful and order exists
      if (order && paymentData.status === "Paid") {
        await updateOrder(order.id!, { amountPaid: order.amountPaid + paymentData.amount });
      }

      toast.success("Payment added successfully!");
      setIsAddOpen(false);
      setNewPayment({ orderId: "", amount: 0, method: "Stripe", status: "Paid", note: "" });

      logActivity(`Payment of ₹${paymentData.amount} added for ${paymentData.orderId}`, paymentData.status === "Paid" ? "success" : "pending", "payment");
      triggerPaymentWebhook(paymentData);
    } catch (err) {
      toast.error("Failed to add payment");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Payments</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage revenue and pending collections.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" />}>
            <Plus className="w-4 h-4" /> Add Payment
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
            <DialogHeader>
              <DialogTitle>Add Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPayment} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Select value={newPayment.orderId} onValueChange={v => v && setNewPayment({ ...newPayment, orderId: v })}>
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Select Order" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingOrders.map(o => (
                      <SelectItem key={o.id} value={o.orderId}>{o.orderId} - {o.clientName} (Pending: ₹{o.amount - o.amountPaid})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input type="number" placeholder="Amount (₹)" value={newPayment.amount || ""} onChange={e => setNewPayment({ ...newPayment, amount: Number(e.target.value) })} required className="bg-background/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Select value={newPayment.method} onValueChange={v => v && setNewPayment({ ...newPayment, method: v })}>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stripe">Stripe</SelectItem>
                      <SelectItem value="PayPal">PayPal</SelectItem>
                      <SelectItem value="Zelle">Zelle</SelectItem>
                      <SelectItem value="Crypto">Crypto</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Select value={newPayment.status} onValueChange={v => v && setNewPayment({ ...newPayment, status: v as any })}>
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
                <Input placeholder="Optional Note" value={newPayment.note || ""} onChange={e => setNewPayment({ ...newPayment, note: e.target.value })} className="bg-background/50 border-border/50" />
              </div>
              <Button type="submit" className="w-full mt-4">Save Payment</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/40 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Collected Today</CardTitle>
            <DollarSign className="w-4 h-4 text-status-success" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-semibold">₹{collectedToday}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/40 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pending Payments</CardTitle>
            <RefreshCcw className="w-4 h-4 text-status-pending" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-semibold">₹{pendingTotal}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/40 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">This Month</CardTitle>
            <CalendarDays className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-semibold">₹{thisMonth}</div>
          </CardContent>
        </Card>
      </div>

      <div className="border border-border/50 rounded-lg overflow-hidden bg-card mt-6">
        <div className="px-4 py-3 border-b border-border/50 bg-muted/10">
          <h3 className="font-medium">Recent Transactions</h3>
        </div>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentsLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No payments found.
                </TableCell>
              </TableRow>
            ) : payments.map((tx) => (
              <TableRow key={tx.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-xs text-muted-foreground">TX-{tx.id?.slice(0, 6)}</TableCell>
                <TableCell className="font-medium">{tx.orderId}</TableCell>
                <TableCell className="text-muted-foreground">{tx.clientName}</TableCell>
                <TableCell className="font-medium">₹{tx.amount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                    <Wallet className="w-3.5 h-3.5" />
                    <span>{tx.method}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(tx.paidAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`font-medium ${tx.status === "Paid" ? "bg-status-success/20 text-status-success border-status-success/30" :
                        tx.status === "Pending" ? "bg-status-pending/20 text-status-pending border-status-pending/30" :
                          "bg-status-urgent/20 text-status-urgent border-status-urgent/30"
                      } border`}
                  >
                    {tx.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
