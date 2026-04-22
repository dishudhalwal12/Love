"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Workflow, Plus, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AutomationsPage() {
  const automations = [
    { title: "Lead to Order Handover", trigger: "Lead status = Booked", action: "Create Tasks & WA Group", active: true },
    { title: "Overdue Payment Alert", trigger: "Pending > 48h", action: "Send automated WhatsApp nudge", active: true },
    { title: "Partner Commission Payout", trigger: "Order status = Delivered", action: "Credit Partner Wallet", active: false }
  ];

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Automations</h2>
          <p className="text-sm text-muted-foreground mt-1">Set up rules to run your operations on autopilot.</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> New Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {automations.map((auto, i) => (
          <Card key={i} className="bg-card border-border/40 hover:border-border/80 transition-all shadow-sm group">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${auto.active ? 'bg-status-success/20 text-status-success' : 'bg-muted text-muted-foreground'}`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider ${auto.active ? 'bg-status-success/10 text-status-success' : 'bg-muted text-muted-foreground'}`}>
                  {auto.active ? "Active" : "Paused"}
                </div>
              </div>
              <CardTitle className="text-lg">{auto.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-background/50 rounded-lg p-3 border border-border/50 text-sm">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">When</div>
                <div>{auto.trigger}</div>
              </div>
              <div className="flex justify-center">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="bg-background/50 rounded-lg p-3 border border-border/50 text-sm">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Then</div>
                <div>{auto.action}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
