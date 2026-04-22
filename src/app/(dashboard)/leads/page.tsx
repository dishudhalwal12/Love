"use client";

import { useState } from "react";
import { useFirestore } from "@/features/hooks";
import { Lead } from "@/features/types";
import { logActivity } from "@/features/activity";
import { triggerNewLeadWebhook, triggerOrderBookedWebhook } from "@/features/webhooks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MessageCircle, FileText, CheckCircle, Filter, Search, Loader2, Trash2, Download, UserMinus, BellRing, Calendar } from "lucide-react";
import { toast } from "sonner";
import { orderBy, query } from "firebase/firestore";
import { addDoc, collection, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Checkbox } from "@/components/ui/checkbox";

// Simple scoring function
const calculateLeadScore = (lead: Partial<Lead>) => {
  let score = 50;
  if (lead.source?.toLowerCase().includes("partner") || lead.source?.toLowerCase().includes("referral")) score += 20;
  const budgetValue = typeof lead.budget === 'number' ? lead.budget : Number((lead.budget as unknown as string)?.replace(/[^0-9]/g, '') || 0);
  if (budgetValue > 2000) score += 15;
  if (budgetValue < 500) score -= 10;
  if (lead.status === "Lost") score -= 30;
  if (lead.status === "Negotiating") score += 15;
  if (lead.status === "Booked") score = 100;
  if (lead.deadline && lead.deadline.toLowerCase().includes("urgent")) score += 10;
  return Math.min(100, Math.max(0, score));
};

const getScoreBadge = (score: number) => {
  if (score >= 80) return <Badge variant="outline" className="bg-status-urgent/10 text-status-urgent border-status-urgent/30">High Intent</Badge>;
  if (score >= 60) return <Badge variant="outline" className="bg-status-active/10 text-status-active border-status-active/30">Hot</Badge>;
  if (score >= 40) return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Warm</Badge>;
  return <Badge variant="outline" className="bg-muted text-muted-foreground border-border/50">Cold</Badge>;
};

export default function LeadsPage() {
  const { data: leads, loading, add, update, remove } = useFirestore<Lead>("leads", [orderBy("createdAt", "desc")]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // New Lead Form State
  const [newLead, setNewLead] = useState<Partial<Lead>>({ status: "New", score: 50 });

  const filters = ["All", "New", "Interested", "Negotiating", "Lost", "Booked"];

  const filteredLeads = leads.filter(lead => {
    const matchesFilter = filter === "All" || lead.status === filter;
    const matchesSearch = lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.college.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const computedScore = calculateLeadScore(newLead);
      const leadData = {
        name: newLead.name || "Unknown",
        college: newLead.college || "Unknown",
        source: newLead.source || "Direct",
        phone: newLead.phone || "",
        deadline: newLead.deadline || "",
        budget: newLead.budget || 0,
        status: newLead.status as any || "New",
        score: computedScore,
        createdAt: Date.now()
      };
      await add(leadData);
      toast.success("Lead added successfully!");
      setIsAddOpen(false);
      setNewLead({ status: "New", score: 50 });

      // Workflow triggers
      logActivity(`New lead added: ${leadData.name} from ${leadData.college}`, "new", "lead");
      triggerNewLeadWebhook(leadData);
    } catch (err) {
      toast.error("Failed to add lead");
    }
  };

  const handleConvertToOrder = async (lead: Lead) => {
    if (!confirm(`Convert ${lead.name} to an Order?`)) return;

    try {
      await update(lead.id!, { status: "Booked", score: 100 });

      const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderData = {
        orderId,
        leadId: lead.id,
        clientName: lead.name,
        college: lead.college,
        topic: "TBD",
        amount: typeof lead.budget === 'number' ? lead.budget : Number((lead.budget as unknown as string)?.replace(/[^0-9]/g, '') || 0),
        amountPaid: 0,
        status: "Booked",
        deadline: lead.deadline,
        createdAt: Date.now()
      };
      const orderRef = await addDoc(collection(db, "orders"), orderData);

      // Create Onboarding Checklist Tasks
      const batch = writeBatch(db);
      const tasks = [
        { title: `Create WA Group for ${lead.name}`, columnId: "today", tags: ["onboarding", "comms"] },
        { title: `Send Welcome Message to ${lead.name}`, columnId: "today", tags: ["onboarding", "comms"] },
        { title: `Collect Advance for ${orderId}`, columnId: "urgent", tags: ["onboarding", "finance"] }
      ];

      tasks.forEach((t, i) => {
        const docRef = doc(collection(db, "tasks"));
        batch.set(docRef, { ...t, id: docRef.id, createdAt: Date.now(), order: i });
      });
      await batch.commit();

      logActivity(`Lead ${lead.name} converted to Order #${orderId}. Onboarding started.`, "success", "conversion");
      triggerOrderBookedWebhook(orderData);

      toast.success(`Converted to Order ${orderId}. Onboarding checklist created.`);
    } catch (err) {
      toast.error("Failed to convert lead to order");
    }
  };

  // Bulk Actions
  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id!));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkMarkLost = async () => {
    if (!confirm(`Mark ${selectedLeads.length} leads as Lost?`)) return;
    const batch = writeBatch(db);
    selectedLeads.forEach(id => {
      batch.update(doc(db, "leads", id), { status: "Lost", score: calculateLeadScore({ status: "Lost" }) });
    });
    await batch.commit();
    setSelectedLeads([]);
    toast.success("Leads marked as lost.");
  };

  const handleBulkExportCSV = () => {
    const leadsToExport = leads.filter(l => selectedLeads.includes(l.id!));
    if (leadsToExport.length === 0) return toast.error("No leads selected");

    const csvRows = ["Name,College,Source,Status,Budget,Deadline,Score"];
    leadsToExport.forEach(l => {
      const budgetVal = typeof l.budget === 'number' ? l.budget : (l.budget as unknown as string)?.replace(/[^0-9]/g, '') || 0;
      csvRows.push(`${l.name},${l.college},${l.source},${l.status},"₹${budgetVal}",${l.deadline},${l.score}`);
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads_export.csv";
    a.click();
  };

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Leads</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage and convert your incoming requests.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="bg-primary text-primary-foreground hover:bg-primary/90" />}>
            Add Lead
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddLead} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input placeholder="Name" value={newLead.name || ""} onChange={e => setNewLead({ ...newLead, name: e.target.value })} required className="bg-background/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Input placeholder="College" value={newLead.college || ""} onChange={e => setNewLead({ ...newLead, college: e.target.value })} required className="bg-background/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Input placeholder="Source (e.g. Insta, Partner)" value={newLead.source || ""} onChange={e => setNewLead({ ...newLead, source: e.target.value })} required className="bg-background/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Phone Number"
                    value={newLead.phone || ""}
                    onChange={e => setNewLead({ ...newLead, phone: e.target.value })}
                    className="bg-background/50 border-border/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase ml-1">Deadline</label>
                  <Input
                    type="date"
                    value={newLead.deadline || ""}
                    onChange={e => setNewLead({ ...newLead, deadline: e.target.value })}
                    className="bg-background/50 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Budget (e.g. 500)"
                    type="number"
                    value={newLead.budget || ""}
                    onChange={e => setNewLead({ ...newLead, budget: Number(e.target.value) })}
                    className="bg-background/50 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Select value={newLead.status} onValueChange={v => v && setNewLead({ ...newLead, status: v as any })}>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Contacted">Contacted</SelectItem>
                      <SelectItem value="Interested">Interested</SelectItem>
                      <SelectItem value="Negotiating">Negotiating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full mt-4">Save Lead</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-8 bg-card border-border/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 sm:pb-0">
            <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-muted/30 text-muted-foreground text-sm font-medium shrink-0">
              <Filter className="w-4 h-4" /> Filters
            </div>
            {filters.map((f) => (
              <Button
                key={f}
                variant={filter === f ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-full border-border/50 ${filter === f ? "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20" : "bg-card hover:bg-muted"}`}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        {selectedLeads.length > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <Badge variant="secondary" className="mr-2">{selectedLeads.length} Selected</Badge>
            <Button variant="outline" size="sm" onClick={() => toast.info("Reminder sent (mock)")} className="h-8">
              <BellRing className="w-4 h-4 mr-2" /> Remind
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkMarkLost} className="h-8 text-status-urgent hover:text-status-urgent hover:bg-status-urgent/10">
              <UserMinus className="w-4 h-4 mr-2" /> Mark Lost
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkExportCSV} className="h-8">
              <Download className="w-4 h-4 mr-2" /> CSV
            </Button>
          </div>
        )}
      </div>

      <div className="border border-border/50 rounded-lg overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-12 text-center">
                <Checkbox
                  checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="font-medium">Name</TableHead>
              <TableHead className="font-medium">College</TableHead>
              <TableHead className="font-medium">Score</TableHead>
              <TableHead className="font-medium">Budget</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="text-right font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No leads found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectedLeads.includes(lead.id!)}
                      onCheckedChange={() => toggleSelect(lead.id!)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{lead.name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">{lead.source}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div>{lead.college}</div>
                    <div className="text-[10px] opacity-60">{lead.phone || "No phone"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{lead.score || calculateLeadScore(lead)}</span>
                      {getScoreBadge(lead.score || calculateLeadScore(lead))}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">₹{lead.budget}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`font-medium ${lead.status === "Booked" ? "bg-status-success/20 text-status-success border-status-success/30" :
                        lead.status === "New" ? "bg-status-active/20 text-status-active border-status-active/30" :
                          lead.status === "Lost" ? "bg-muted text-muted-foreground border-border/50" :
                            lead.status === "Interested" || lead.status === "Contacted" ? "bg-primary/20 text-primary border-primary/30" :
                              "bg-status-pending/20 text-status-pending border-status-pending/30"
                        } border`}
                    >
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => lead.phone && (window.location.href = `tel:${lead.phone}`)}
                        disabled={!lead.phone}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-emerald-500"
                        onClick={() => lead.phone && window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`, '_blank')}
                        disabled={!lead.phone}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      {lead.status !== "Booked" && lead.status !== "Lost" && (
                        <Button variant="ghost" size="icon" onClick={() => handleConvertToOrder(lead)} className="h-8 w-8 text-muted-foreground hover:text-status-success" title="Convert to Order">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => remove(lead.id!)} className="h-8 w-8 text-muted-foreground hover:text-status-urgent" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
