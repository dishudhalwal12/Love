"use client";

import { useSettings } from "@/context/SettingsContext";
import { useState, useEffect } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Save, Loader2, Webhook, Settings2, Moon, MessageCircle,
  DollarSign, Calendar, Clock, Trophy, Trash2, AlertTriangle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { resetActivityLogs } from "@/features/activity";

export default function SettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!formData) return;
    setSaving(true);
    try {
      await updateSettings(formData);
      toast.success("Settings saved successfully!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleResetFeed = async () => {
    if (!confirm("Are you sure you want to clear the entire Intelligence Feed? This cannot be undone.")) return;

    setResetting(true);
    try {
      await resetActivityLogs();
      toast.success("Intelligence Feed has been reset.");
    } catch {
      toast.error("Failed to reset feed.");
    } finally {
      setResetting(false);
    }
  };

  const updateWebhook = (name: string, url: string) => {
    setFormData((prev: any) => ({
      ...prev,
      webhookUrls: prev.webhookUrls.map((w: any) => w.name === name ? { ...w, url } : w),
    }));
  };

  const updateTemplate = (id: string, text: string) => {
    setFormData((prev: any) => ({
      ...prev,
      whatsappTemplates: prev.whatsappTemplates.map((t: any) =>
        t.id === id ? { ...t, text } : t
      ),
    }));
  };

  const updateCommissionSlab = (idx: number, field: string, value: number) => {
    setFormData((prev: any) => ({
      ...prev,
      commissionSlabs: prev.commissionSlabs.map((s: any, i: number) =>
        i === idx ? { ...s, [field]: value } : s
      ),
    }));
  };

  const addCommissionSlab = () => {
    setFormData((prev: any) => ({
      ...prev,
      commissionSlabs: [
        ...(prev.commissionSlabs || []),
        { minLeads: 1, maxLeads: 5, percentage: 10 },
      ],
    }));
  };

  const removeCommissionSlab = (idx: number) => {
    setFormData((prev: any) => ({
      ...prev,
      commissionSlabs: prev.commissionSlabs.filter((_: any, i: number) => i !== idx),
    }));
  };

  if (loading || !formData) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const webhooks = ["N8N_NEW_LEAD_WEBHOOK", "N8N_PAYMENT_WEBHOOK", "N8N_SYNOPSIS_WEBHOOK"].map((name) => {
    const existing = formData.webhookUrls?.find((w: any) => w.name === name);
    return existing || { name, url: "" };
  });

  // Ensure defaultTaskTimings exists
  const taskTimings = formData.defaultTaskTimings || { followUpHours: 2, synopsisDueHours: 24, progressCheckDays: 3 };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage integrations and system preferences.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6">
        {/* General Preferences */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Settings2 className="w-5 h-5 text-primary" />
              <CardTitle>General Preferences</CardTitle>
            </div>
            <CardDescription>System-wide defaults and modes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-status-success" />
                  <span className="font-medium">Season Mode</span>
                </div>
                <p className="text-xs text-muted-foreground">Highlight urgent actions and focus on rapid conversion.</p>
              </div>
              <Switch
                checked={formData.seasonModeEnabled}
                onCheckedChange={(c) => setFormData({ ...formData, seasonModeEnabled: c })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Default Booking Amount (Advance)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₹</span>
                <Input
                  type="number"
                  className="pl-7 bg-background/50 border-border/50"
                  value={formData.defaultBookingAmount}
                  onChange={(e) => setFormData({ ...formData, defaultBookingAmount: Number(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operational Settings — NEW */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-5 h-5 text-status-pending" />
              <CardTitle>Payment & Reminder Settings</CardTitle>
            </div>
            <CardDescription>Control when overdue alerts and reminders trigger.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Reminder After (Days)</label>
              <p className="text-xs text-muted-foreground">Flag a payment as overdue after this many days.</p>
              <Input
                type="number"
                min={1}
                max={30}
                className="bg-background/50 border-border/50 max-w-xs"
                value={formData.paymentReminderDays ?? 2}
                onChange={(e) => setFormData({ ...formData, paymentReminderDays: Number(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Season Dates */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5 text-primary" />
              <CardTitle>Season Dates</CardTitle>
            </div>
            <CardDescription>Define your business season window for smarter alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Season Start</label>
                <Input
                  type="date"
                  className="bg-background/50 border-border/50"
                  value={formData.seasonStart || ""}
                  onChange={(e) => setFormData({ ...formData, seasonStart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Season End</label>
                <Input
                  type="date"
                  className="bg-background/50 border-border/50"
                  value={formData.seasonEnd || ""}
                  onChange={(e) => setFormData({ ...formData, seasonEnd: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Task Timings */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-status-active" />
              <CardTitle>Default Task Timings</CardTitle>
            </div>
            <CardDescription>Control when auto-generated tasks are due after each trigger.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Follow-up After (Hours)</label>
                <p className="text-xs text-muted-foreground">When a lead becomes Interested</p>
                <Input
                  type="number"
                  min={1}
                  className="bg-background/50 border-border/50"
                  value={taskTimings.followUpHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultTaskTimings: { ...taskTimings, followUpHours: Number(e.target.value) },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Synopsis Due (Hours)</label>
                <p className="text-xs text-muted-foreground">After order enters Synopsis stage</p>
                <Input
                  type="number"
                  min={1}
                  className="bg-background/50 border-border/50"
                  value={taskTimings.synopsisDueHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultTaskTimings: { ...taskTimings, synopsisDueHours: Number(e.target.value) },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Progress Check (Days)</label>
                <p className="text-xs text-muted-foreground">After order enters Development</p>
                <Input
                  type="number"
                  min={1}
                  className="bg-background/50 border-border/50"
                  value={taskTimings.progressCheckDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultTaskTimings: { ...taskTimings, progressCheckDays: Number(e.target.value) },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commission Slabs */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <CardTitle>Commission Slabs</CardTitle>
            </div>
            <CardDescription>Auto-commission tiers based on leads converted by partners.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(formData.commissionSlabs || []).map((slab: any, idx: number) => (
              <div key={idx} className="grid grid-cols-4 gap-3 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Min Leads</label>
                  <Input
                    type="number"
                    min={0}
                    className="bg-background/50 border-border/50 h-8 text-sm"
                    value={slab.minLeads}
                    onChange={(e) => updateCommissionSlab(idx, "minLeads", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Max Leads</label>
                  <Input
                    type="number"
                    min={0}
                    className="bg-background/50 border-border/50 h-8 text-sm"
                    value={slab.maxLeads}
                    onChange={(e) => updateCommissionSlab(idx, "maxLeads", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Commission %</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="bg-background/50 border-border/50 h-8 text-sm"
                    value={slab.percentage}
                    onChange={(e) => updateCommissionSlab(idx, "percentage", Number(e.target.value))}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-status-urgent hover:text-status-urgent hover:bg-status-urgent/10"
                  onClick={() => removeCommissionSlab(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="mt-2 border-border/50" onClick={addCommissionSlab}>
              + Add Slab
            </Button>
          </CardContent>
        </Card>

        {/* WhatsApp Templates */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-5 h-5 text-status-success" />
              <CardTitle>WhatsApp Templates</CardTitle>
            </div>
            <CardDescription>Default messages used in one-click helper actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.whatsappTemplates?.map((template: any) => (
              <div key={template.id} className="space-y-2">
                <label className="text-sm font-medium">{template.name}</label>
                <Input
                  className="bg-background/50 border-border/50"
                  value={template.text}
                  onChange={(e) => updateTemplate(template.id, e.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Webhooks */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Webhook className="w-5 h-5 text-status-active" />
              <CardTitle>n8n Webhook Integrations</CardTitle>
            </div>
            <CardDescription>Configure endpoints for system events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {webhooks.map((webhook: any) => (
              <div key={webhook.name} className="space-y-2">
                <label className="text-sm font-medium">{webhook.name}</label>
                <Input
                  placeholder="https://n8n.yourdomain.com/webhook/..."
                  className="bg-background/50 border-border/50"
                  value={webhook.url}
                  onChange={(e) => {
                    const exists = formData.webhookUrls?.some((w: any) => w.name === webhook.name);
                    if (exists) {
                      updateWebhook(webhook.name, e.target.value);
                    } else {
                      setFormData((prev: any) => ({
                        ...prev,
                        webhookUrls: [...(prev.webhookUrls || []), { name: webhook.name, url: e.target.value }],
                      }));
                    }
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Maintenance & Data */}
        <Card className="bg-card border-border/40 shadow-sm border-status-urgent/20">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Trash2 className="w-5 h-5 text-status-urgent" />
              <CardTitle>Maintenance & Data</CardTitle>
            </div>
            <CardDescription>Advanced actions for system maintenance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-status-urgent/5 rounded-lg border border-status-urgent/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-urgent" />
                  <span className="font-medium text-sm">Reset Intelligence Feed</span>
                </div>
                <p className="text-xs text-muted-foreground">Clear all activity logs and start with a fresh feed. Leads and orders are NOT affected.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-status-urgent/30 text-status-urgent hover:bg-status-urgent hover:text-white transition-all"
                onClick={handleResetFeed}
                disabled={resetting}
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Feed"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
