"use client";

import { Order, OrderTimelineEvent } from "@/features/types";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppHelper } from "@/components/whatsapp/WhatsAppHelper";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, CreditCard, FileText, CheckSquare, Clock, Plus, Trash2, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface OrderDrawerProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
}

export function OrderDrawer({ order, open, onOpenChange, onUpdateOrder }: OrderDrawerProps) {
  const [notes, setNotes] = useState(order?.clientNotes || "");

  if (!order) return null;

  const totalAmount = order.amount;
  const paidAmount = order.amountPaid;
  const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  const handleSaveNotes = async () => {
    await onUpdateOrder(order.id!, { clientNotes: notes });
  };

  const riskBadge = (score?: number) => {
    if (!score) return <Badge variant="outline">No Risk Data</Badge>;
    if (score > 75) return <Badge variant="outline" className="bg-status-urgent/10 text-status-urgent border-status-urgent/30">High Risk</Badge>;
    if (score > 40) return <Badge variant="outline" className="bg-status-pending/10 text-status-pending border-status-pending/30">Medium Risk</Badge>;
    return <Badge variant="outline" className="bg-status-success/10 text-status-success border-status-success/30">Low Risk</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-card border-border/50 sm:rounded-l-2xl">
        <SheetHeader className="pb-4 border-b border-border/10">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-2xl font-semibold flex items-center gap-2">
                {order.clientName}
                <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-primary/20">
                  {order.status}
                </Badge>
              </SheetTitle>
              <SheetDescription className="mt-1 flex items-center gap-2">
                <span className="font-mono text-xs">{order.orderId}</span>
                <span>•</span>
                <span>{order.college}</span>
              </SheetDescription>
            </div>
            {riskBadge(order.riskScore)}
          </div>

          <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Payment Progress</span>
              <span className="font-medium">${paidAmount} / ${totalAmount}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </SheetHeader>

        <div className="py-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted/30 p-1 rounded-lg">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center text-muted-foreground"><MessageCircle className="w-4 h-4 mr-2" /> WhatsApp Quick Actions</h3>
                <WhatsAppHelper clientName={order.clientName} orderId={order.orderId} />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center text-muted-foreground"><FileText className="w-4 h-4 mr-2" /> Client Notes</h3>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add private notes about this client..."
                  className="min-h-[120px] bg-background/50"
                />
                <Button variant="secondary" size="sm" onClick={handleSaveNotes}>Save Notes</Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border/50 bg-background/30">
                  <span className="text-xs text-muted-foreground block mb-1">Topic</span>
                  <span className="font-medium">{order.topic || "Not set"}</span>
                </div>
                <div className="p-4 rounded-xl border border-border/50 bg-background/30">
                  <span className="text-xs text-muted-foreground block mb-1 flex items-center"><Calendar className="w-3 h-3 mr-1" /> Deadline</span>
                  <span className="font-medium">{order.deadline || "Not set"}</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
                {order.timeline?.length ? order.timeline.map((event, i) => (
                  <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-muted/50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border/50 bg-card shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-sm text-foreground">{event.title}</h4>
                        <span className="text-xs font-medium text-muted-foreground">{formatDistanceToNow(event.date, { addSuffix: true })}</span>
                      </div>
                      {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
                    </div>
                  </div>
                )) : (
                  <div className="text-center p-8 text-muted-foreground">No timeline events yet.</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="files" className="mt-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="text-center p-8 border border-dashed border-border/50 rounded-xl bg-muted/10">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="font-medium text-foreground mb-1">No files attached</h3>
                <p className="text-sm text-muted-foreground mb-4">Upload documents, code, or synopsis files.</p>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Upload File
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="mt-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="text-center p-8 border border-dashed border-border/50 rounded-xl bg-muted/10">
                <CheckSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="font-medium text-foreground mb-1">No linked tasks</h3>
                <p className="text-sm text-muted-foreground mb-4">Create tasks linked directly to this order.</p>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Create Task
                </Button>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
