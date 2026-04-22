"use client";

import { useSettings } from "@/context/SettingsContext";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Loader2, Webhook, Settings2, Moon, MessageCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const [saving, setSaving] = useState(false);
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
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
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
      whatsappTemplates: prev.whatsappTemplates.map((t: any) => t.id === id ? { ...t, text } : t),
    }));
  };

  if (loading || !formData) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Ensure default webhooks exist in state
  const webhooks = ["N8N_NEW_LEAD_WEBHOOK", "N8N_PAYMENT_WEBHOOK", "N8N_SYNOPSIS_WEBHOOK"].map(name => {
    const existing = formData.webhookUrls?.find((w: any) => w.name === name);
    return existing || { name, url: "" };
  });

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
                  onChange={e => setFormData({ ...formData, defaultBookingAmount: Number(e.target.value) })}
                />
              </div>
            </div>
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
                  onChange={e => updateTemplate(template.id, e.target.value)}
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
                  onChange={e => {
                    const exists = formData.webhookUrls?.some((w: any) => w.name === webhook.name);
                    if (exists) {
                      updateWebhook(webhook.name, e.target.value);
                    } else {
                      setFormData((prev: any) => ({
                        ...prev,
                        webhookUrls: [...(prev.webhookUrls || []), { name: webhook.name, url: e.target.value }]
                      }));
                    }
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
