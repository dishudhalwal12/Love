"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LayoutTemplate, Plus, Copy, FileText, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useFirestore } from "@/features/hooks";
import { Lead } from "@/features/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function TemplatesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUseOpen, setIsUseOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const { data: leads } = useFirestore<Lead>("leads");

  const [templates, setTemplates] = useState([
    { title: "Standard Welcome", type: "WhatsApp", usage: 145 },
    { title: "Invoice Reminder", type: "Email", usage: 89 },
    { title: "Project Handover Synopsis", type: "Document", usage: 56 },
    { title: "Payment Receipt", type: "WhatsApp", usage: 210 },
  ]);
  const [newTitle, setNewTitle] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setTemplates([{ title: newTitle, type: "WhatsApp", usage: 0 }, ...templates]);
    setNewTitle("");
    setIsCreateOpen(false);
    toast.success("Template created successfully!");
  };

  const handleSend = (leadName: string) => {
    setIsUseOpen(false);
    toast.success(`Template "${selectedTemplate.title}" sent to ${leadName}!`);
  };

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage reusable messages, documents, and emails.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button className="bg-primary text-primary-foreground hover:bg-primary/90" />}>
            <Plus className="w-4 h-4 mr-2" /> Create Template
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <Input
                placeholder="Template Title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="bg-background/50 border-border/50"
                required
              />
              <Button type="submit" className="w-full">Save Template</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {templates.map((tpl, i) => (
          <Card key={i} className="bg-card border-border/40 hover:border-border/80 transition-all shadow-sm group">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  {tpl.type === "WhatsApp" ? <Send className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                  {tpl.type}
                </div>
              </div>
              <CardTitle className="text-lg leading-tight">{tpl.title}</CardTitle>
              <CardDescription>Used {tpl.usage} times</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 mt-4">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => toast.info("Editing enabled in full version")}>Edit</Button>
                <Button
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(tpl);
                    setIsUseOpen(true);
                  }}
                >
                  <Send className="w-3.5 h-3.5 mr-2" /> Use
                </Button>
                <Button variant="outline" size="sm" className="px-2" onClick={() => toast.success("Template copied to clipboard")}>
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isUseOpen} onOpenChange={setIsUseOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Send Template</DialogTitle>
            <p className="text-sm text-muted-foreground">Select a recipient for "{selectedTemplate?.title}"</p>
          </DialogHeader>
          <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-2">
            {leads.length === 0 ? (
              <p className="text-center py-4 text-sm text-muted-foreground">No leads found to send to.</p>
            ) : leads.map(lead => (
              <button
                key={lead.id}
                onClick={() => handleSend(lead.name)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] transition-all text-left group"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{lead.name}</span>
                  <span className="text-xs text-muted-foreground">{lead.phone || "No phone"}</span>
                </div>
                <Send className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
