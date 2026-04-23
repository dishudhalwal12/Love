"use client";

import { useFirestore } from "@/features/hooks";
import { Order } from "@/features/types";
import { onOrderStatusChange } from "@/features/workflow";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, GraduationCap, FileText, ChevronRight, Loader2, Search, AlertTriangle, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useState } from "react";
import { orderBy } from "firebase/firestore";
import { toast } from "sonner";
import { OrderDrawer } from "@/components/orders/OrderDrawer";
import { useSmartSearch } from "@/features/hooks";
import { deleteActivityLogs } from "@/features/activity";


const RISK_FLAG_LABELS: Record<string, string> = {
  unpaid_near_deadline: "Unpaid + Deadline Near",
  no_client_reply_5d: "No Reply 5d",
  status_delay: "Delayed",
};

export default function OrdersPage() {
  const { data: orders, loading, update, remove } = useFirestore<Order>("orders", [orderBy("createdAt", "desc")]);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);

  // Fuzzy search across orderId, clientName, topic, college
  const filteredOrders = useSmartSearch<Order>(
    orders,
    ["orderId", "clientName", "topic", "college"],
    search
  );

  const handleStatusChange = async (order: Order, newStatus: string) => {
    if (!order.id) return;
    setStatusChangingId(order.id);
    try {
      await onOrderStatusChange(order, newStatus as Order["status"]);
      toast.success(`Order moved to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setStatusChangingId(null);
    }
  };

  const handleUpdateOrder = async (id: string, updates: Partial<Order>) => {
    try {
      await update(id, updates);
      toast.success("Order updated");
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder({ ...selectedOrder, ...updates });
      }
    } catch {
      toast.error("Failed to update order");
    }
  };

  const handleDeleteOrder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      await remove(id);
      await deleteActivityLogs(id);
      toast.success("Order deleted successfully");
    } catch {

      toast.error("Failed to delete order");
    }
  };

  const openDrawer = (order: Order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Booked": return "bg-status-active/10 text-status-active border-status-active/20";
      case "Synopsis": return "bg-primary/10 text-primary border-primary/20";
      case "Development": return "bg-status-pending/10 text-status-pending border-status-pending/20";
      case "Review": return "bg-status-urgent/10 text-status-urgent border-status-urgent/20";
      case "Final Payment": return "bg-status-pending/20 text-status-pending border-status-pending/30";
      case "Delivered": return "bg-status-success/10 text-status-success border-status-success/20";
      case "Closed": return "bg-muted text-muted-foreground border-border/50";
      default: return "bg-muted text-muted-foreground border-border/50";
    }
  };

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Orders</h2>
          <p className="text-sm text-muted-foreground mt-1">Track and manage active assignments.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Order ID, Client, Topic..."
            className="pl-8 bg-card border-border/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-border/50">
          No orders found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const progress = order.amount > 0 ? Math.round((order.amountPaid / order.amount) * 100) : 0;
            const riskFlags = order.riskFlags || [];

            return (
              <Card
                key={order.id}
                className="bg-card border-border/40 hover:border-border/80 transition-all shadow-sm group flex flex-col cursor-pointer"
                onClick={() => openDrawer(order)}
              >
                <CardHeader className="p-5 pb-3 shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-medium text-muted-foreground">{order.orderId}</span>
                    <div className="flex items-center gap-1.5">
                      {riskFlags.length > 0 && (
                        <Badge variant="outline" className="bg-status-urgent/10 text-status-urgent border-status-urgent/30 text-[9px] px-1.5 py-0">
                          <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                          {RISK_FLAG_LABELS[riskFlags[0]] || "Risk"}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`border-border/50 font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg leading-tight line-clamp-1" title={order.topic}>{order.topic}</h3>
                  <p className="text-sm text-muted-foreground">{order.clientName}</p>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4 flex-1">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" />
                      <span className="truncate">{order.college}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{order.deadline}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Payment Status</span>
                      <span className="font-medium text-foreground">{progress}% Paid (₹{order.amountPaid}/₹{order.amount})</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${progress === 100 ? "bg-status-success" : "bg-status-pending"}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={order.status}
                      onValueChange={(v) => v && handleStatusChange(order, v)}
                      disabled={statusChangingId === order.id}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background/50 border-border/50">
                        {statusChangingId === order.id
                          ? <><Loader2 className="w-3 h-3 animate-spin mr-2" />Updating...</>
                          : <SelectValue placeholder="Update Status" />
                        }
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Booked">Booked</SelectItem>
                        <SelectItem value="Synopsis">Synopsis</SelectItem>
                        <SelectItem value="Development">Development</SelectItem>
                        <SelectItem value="Review">Review</SelectItem>
                        <SelectItem value="Final Payment">Final Payment</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>

                <CardFooter className="p-5 pt-0 border-t border-border/10 mt-auto flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); openDrawer(order); }}
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" /> Details
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="h-8 text-xs text-status-urgent hover:text-status-urgent hover:bg-status-urgent/10"
                      onClick={(e) => handleDeleteOrder(e, order.id!)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <OrderDrawer
        order={selectedOrder}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onUpdateOrder={handleUpdateOrder}
      />
    </div>
  );
}
