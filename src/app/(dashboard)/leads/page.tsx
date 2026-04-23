"use client";

import { useState, useCallback } from "react";
import { useFirestore, useSmartSearch } from "@/features/hooks";
import { Lead } from "@/features/types";
import {
  onLeadStatusChange,
  convertLeadToOrder,
  checkDuplicatePhone,
  computeLeadPriorityScore,
} from "@/features/workflow";
import { activityEvents, deleteActivityLogs } from "@/features/activity";

import { triggerNewLeadWebhook, triggerOrderBookedWebhook } from "@/features/webhooks";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Phone, MessageCircle, FileText, CheckCircle, Filter, Search,
  Loader2, Trash2, Download, UserMinus, BellRing, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { orderBy } from "firebase/firestore";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Checkbox } from "@/components/ui/checkbox";

// Simple display score badge (unchanged visuals)
const getScoreBadge = (score: number) => {
  if (score >= 80) return <Badge variant="outline" className="bg-status-urgent/10 text-status-urgent border-status-urgent/30">High Intent</Badge>;
  if (score >= 60) return <Badge variant="outline" className="bg-status-active/10 text-status-active border-status-active/30">Hot</Badge>;
  if (score >= 40) return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Warm</Badge>;
  return <Badge variant="outline" className="bg-muted text-muted-foreground border-border/50">Cold</Badge>;
};

const LOST_REASONS = [
  "Too Expensive",
  "No Reply",
  "Already Arranged",
  "Fake Lead",
  "Delayed",
  "Other",
];

export default function LeadsPage() {
  const { data: leads, loading, add, update, remove } = useFirestore<Lead>("leads", [orderBy("createdAt", "desc")]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // Lost reason dialog state
  const [lostReasonOpen, setLostReasonOpen] = useState(false);
  const [pendingLostLeads, setPendingLostLeads] = useState<Lead[]>([]);
  const [selectedLostReason, setSelectedLostReason] = useState(LOST_REASONS[0]);

  // Status change loading state (per lead)
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);

  // New Lead Form State
  const [newLead, setNewLead] = useState<Partial<Lead>>({ status: "New", score: 50 });
  const [duplicateWarning, setDuplicateWarning] = useState<Lead | null>(null);

  const filters = ["All", "New", "Contacted", "Interested", "Negotiating", "Lost", "Booked"];

  // Smart fuzzy search across multiple fields
  const searchedLeads = useSmartSearch<Lead>(
    leads,
    ["name", "phone", "college", "source", "partnerSource"],
    search
  );

  const filteredLeads = searchedLeads.filter(
    (lead) => filter === "All" || lead.status === filter
  );

  // Phone duplicate check
  const handlePhoneBlur = useCallback(async () => {
    if (!newLead.phone || newLead.phone.trim() === "") {
      setDuplicateWarning(null);
      return;
    }
    const existing = await checkDuplicatePhone(newLead.phone);
    if (existing) {
      setDuplicateWarning(existing);
    } else {
      setDuplicateWarning(null);
    }
  }, [newLead.phone]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();

    // Warn on duplicate but allow proceeding
    if (duplicateWarning) {
      const proceed = window.confirm(
        `⚠️ A lead with phone ${newLead.phone} already exists: "${duplicateWarning.name}" (${duplicateWarning.status}). Add anyway?`
      );
      if (!proceed) return;
    }

    try {
      const score = computeLeadPriorityScore(newLead);
      const leadData = {
        name: newLead.name || "Unknown",
        college: newLead.college || "Unknown",
        source: newLead.source || "Direct",
        phone: newLead.phone || "",
        deadline: newLead.deadline || "",
        budget: newLead.budget || 0,
        status: (newLead.status as Lead["status"]) || "New",
        score,
        priorityScore: score,
        partnerSource: newLead.partnerSource || "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const leadId = await add(leadData);
      toast.success("Lead added successfully!");
      setIsAddOpen(false);
      setNewLead({ status: "New", score: 50 });
      setDuplicateWarning(null);

      // Workflow triggers
      activityEvents.leadCreated(leadId, leadData.name, leadData.college);

      triggerNewLeadWebhook(leadData);
    } catch {
      toast.error("Failed to add lead");
    }
  };

  // Smart status change with workflow side-effects
  const handleStatusChange = async (lead: Lead, newStatus: Lead["status"]) => {
    if (newStatus === "Lost") {
      // Open lost reason dialog
      setPendingLostLeads([lead]);
      setLostReasonOpen(true);
      return;
    }

    if (newStatus === "Booked") {
      await handleConvertToOrder(lead);
      return;
    }

    setStatusChangingId(lead.id!);
    try {
      await onLeadStatusChange(lead, newStatus);
      toast.success(`Lead moved to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setStatusChangingId(null);
    }
  };

  const handleConvertToOrder = async (lead: Lead) => {
    if (!confirm(`Convert ${lead.name} to an Order?`)) return;
    try {
      const orderId = await convertLeadToOrder(lead);
      triggerOrderBookedWebhook({ clientName: lead.name, orderId });
      toast.success(`Converted to Order ${orderId}. Onboarding checklist created.`);
    } catch {
      toast.error("Failed to convert lead to order");
    }
  };

  // Confirm lost with reason
  const confirmMarkLost = async () => {
    try {
      for (const lead of pendingLostLeads) {
        await onLeadStatusChange(lead, "Lost", selectedLostReason);
      }
      toast.success(`${pendingLostLeads.length} lead(s) marked as Lost`);
      setLostReasonOpen(false);
      setPendingLostLeads([]);
      setSelectedLeads([]);
    } catch {
      toast.error("Failed to mark as lost");
    }
  };

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((l) => l.id!));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkMarkLost = () => {
    const leadsToMark = leads.filter((l) => selectedLeads.includes(l.id!));
    if (leadsToMark.length === 0) return;
    setPendingLostLeads(leadsToMark);
    setLostReasonOpen(true);
  };

  const handleBulkExportCSV = () => {
    const leadsToExport = leads.filter((l) => selectedLeads.includes(l.id!));
    if (leadsToExport.length === 0) return toast.error("No leads selected");

    const csvRows = ["Name,College,Source,Phone,Status,Budget,Deadline,Score,LostReason"];
    leadsToExport.forEach((l) => {
      const budgetVal =
        typeof l.budget === "number"
          ? l.budget
          : (l.budget as unknown as string)?.replace(/[^0-9]/g, "") || 0;
      csvRows.push(
        `${l.name},${l.college},${l.source},${l.phone || ""},${l.status},"₹${budgetVal}",${l.deadline},${l.score},${l.lostReason || ""}`
      );
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads_export.csv";
    a.click();
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this lead? This will also remove related intelligence feed alerts.")) return;
    try {
      await remove(id);
      await deleteActivityLogs(id);
      toast.success("Lead and related activity deleted");
    } catch {
      toast.error("Failed to delete lead");
    }
  };


  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      {/* Lost Reason Dialog */}
      <Dialog open={lostReasonOpen} onOpenChange={setLostReasonOpen}>
        <DialogContent className="sm:max-w-[380px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Why did this lead go cold?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Marking {pendingLostLeads.length} lead(s) as Lost. Select a reason:
            </p>
            <Select value={selectedLostReason} onValueChange={(v) => v && setSelectedLostReason(v)}>
              <SelectTrigger className="bg-background/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setLostReasonOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={confirmMarkLost}>
                Confirm Lost
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                  <Input placeholder="Name" value={newLead.name || ""} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} required className="bg-background/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Input placeholder="College" value={newLead.college || ""} onChange={(e) => setNewLead({ ...newLead, college: e.target.value })} required className="bg-background/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Input placeholder="Source (e.g. Insta, Partner)" value={newLead.source || ""} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })} required className="bg-background/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Partner Name (optional)"
                    value={newLead.partnerSource || ""}
                    onChange={(e) => setNewLead({ ...newLead, partnerSource: e.target.value })}
                    className="bg-background/50 border-border/50"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Input
                    placeholder="Phone Number"
                    value={newLead.phone || ""}
                    onChange={(e) => {
                      setNewLead({ ...newLead, phone: e.target.value });
                      setDuplicateWarning(null);
                    }}
                    onBlur={handlePhoneBlur}
                    className={`bg-background/50 border-border/50 ${duplicateWarning ? "border-status-urgent/50" : ""}`}
                  />
                  {duplicateWarning && (
                    <div className="flex items-center gap-1.5 text-xs text-status-urgent mt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Duplicate phone: "{duplicateWarning.name}" ({duplicateWarning.status}) already exists
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase ml-1">Deadline</label>
                  <Input
                    type="date"
                    value={newLead.deadline || ""}
                    onChange={(e) => setNewLead({ ...newLead, deadline: e.target.value })}
                    className="bg-background/50 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Budget (e.g. 500)"
                    type="number"
                    value={newLead.budget || ""}
                    onChange={(e) => setNewLead({ ...newLead, budget: Number(e.target.value) })}
                    className="bg-background/50 border-border/50"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Select value={newLead.status} onValueChange={(v) => v && setNewLead({ ...newLead, status: v as Lead["status"] })}>
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
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, phone..."
              className="pl-8 bg-card border-border/50 h-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 sm:pb-0 scrollbar-hide">
            <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-full bg-muted/30 text-muted-foreground text-[10px] uppercase font-bold shrink-0">
              <Filter className="w-3 h-3" /> Filters
            </div>
            {filters.map((f) => (
              <Button
                key={f}
                variant={filter === f ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className={`shrink-0 h-8 rounded-full border-border/50 text-[10px] uppercase tracking-wider font-bold ${filter === f ? "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20" : "bg-card hover:bg-muted"}`}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        {selectedLeads.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            <Badge variant="secondary" className="mr-1 h-7 shrink-0">{selectedLeads.length} Selected</Badge>
            <Button variant="outline" size="sm" onClick={() => toast.info("Reminder sent")} className="h-8 shrink-0 text-[10px] uppercase font-bold">
              <BellRing className="w-3 h-3 mr-1.5" /> Remind
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkMarkLost} className="h-8 shrink-0 text-status-urgent hover:text-status-urgent hover:bg-status-urgent/10 text-[10px] uppercase font-bold">
              <UserMinus className="w-3 h-3 mr-1.5" /> Mark Lost
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkExportCSV} className="h-8 shrink-0 text-[10px] uppercase font-bold">
              <Download className="w-3 h-3 mr-1.5" /> CSV
            </Button>
          </div>
        )}
      </div>

      <div className="hidden md:block border border-border/50 rounded-lg overflow-hidden bg-card shadow-sm">
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
                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">{lead.source}{lead.partnerSource ? ` · ${lead.partnerSource}` : ""}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div>{lead.college}</div>
                    <div className="text-[10px] opacity-60">{lead.phone || "No phone"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{lead.priorityScore ?? lead.score}</span>
                      {getScoreBadge(lead.priorityScore ?? lead.score)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">₹{lead.budget}</TableCell>
                  <TableCell>
                    <Select
                      value={lead.status}
                      onValueChange={(v) => v && handleStatusChange(lead, v as Lead["status"])}
                      disabled={statusChangingId === lead.id}
                    >
                      <SelectTrigger className="h-7 text-xs bg-transparent border-0 p-0 shadow-none focus:ring-0 w-auto gap-1">
                        <Badge
                          variant="secondary"
                          className={`font-medium cursor-pointer ${
                            lead.status === "Booked" ? "bg-status-success/20 text-status-success border-status-success/30" :
                            lead.status === "New" ? "bg-status-active/20 text-status-active border-status-active/30" :
                            lead.status === "Lost" ? "bg-muted text-muted-foreground border-border/50" :
                            lead.status === "Interested" || lead.status === "Contacted" ? "bg-primary/20 text-primary border-primary/30" :
                            "bg-status-pending/20 text-status-pending border-status-pending/30"
                          } border`}
                        >
                          {statusChangingId === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : lead.status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Interested">Interested</SelectItem>
                        <SelectItem value="Negotiating">Negotiating</SelectItem>
                        <SelectItem value="Booked">Booked (Convert)</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                    {lead.lostReason && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">{lead.lostReason}</div>
                    )}
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
                        onClick={() => lead.phone && window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`, "_blank")}
                        disabled={!lead.phone}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      {lead.status !== "Booked" && lead.status !== "Lost" && (
                        <Button variant="ghost" size="icon" onClick={() => handleConvertToOrder(lead)} className="h-8 w-8 text-muted-foreground hover:text-status-success" title="Convert to Order">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteLead(lead.id!)} className="h-8 w-8 text-muted-foreground hover:text-status-urgent" title="Delete">
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed border-border/50">
            No leads found.
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <Card key={lead.id} className="bg-card/50 border-white/[0.05] rounded-2xl overflow-hidden shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedLeads.includes(lead.id!)}
                      onCheckedChange={() => toggleSelect(lead.id!)}
                      className="mt-1"
                    />
                    <div>
                      <h3 className="font-semibold text-white leading-tight">{lead.name}</h3>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{lead.college}</p>
                    </div>
                  </div>
                  <Select
                    value={lead.status}
                    onValueChange={(v) => v && handleStatusChange(lead, v as Lead["status"])}
                    disabled={statusChangingId === lead.id}
                  >
                    <SelectTrigger className="h-auto p-0 border-0 bg-transparent shadow-none focus:ring-0 w-auto">
                      <Badge
                        variant="secondary"
                        className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                          lead.status === "Booked" ? "bg-status-success/20 text-status-success border-status-success/20" :
                          lead.status === "New" ? "bg-status-active/20 text-status-active border-status-active/20" :
                          lead.status === "Lost" ? "bg-muted text-muted-foreground border-border/50" :
                          "bg-primary/20 text-primary border-primary/20"
                        } border`}
                      >
                        {statusChangingId === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : lead.status}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Contacted">Contacted</SelectItem>
                      <SelectItem value="Interested">Interested</SelectItem>
                      <SelectItem value="Negotiating">Negotiating</SelectItem>
                      <SelectItem value="Booked">Booked (Convert)</SelectItem>
                      <SelectItem value="Lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.05]">
                  <div className="flex gap-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Budget</span>
                      <span className="text-xs font-semibold text-white">₹{lead.budget}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Intent</span>
                      <span className="text-xs font-semibold">{lead.priorityScore ?? lead.score}%</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-white/5 border border-white/10"
                      onClick={() => lead.phone && (window.location.href = `tel:${lead.phone}`)}
                      disabled={!lead.phone}
                    >
                      <Phone className="w-3.5 h-3.5 text-white" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                      onClick={() => lead.phone && window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`, "_blank")}
                      disabled={!lead.phone}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-white/5 border border-white/10"
                      onClick={() => handleDeleteLead(lead.id!)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-status-urgent" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
