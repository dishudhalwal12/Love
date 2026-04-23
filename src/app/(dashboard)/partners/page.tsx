"use client";

import { useFirestore, useSmartSearch } from "@/features/hooks";
import { Partner } from "@/features/types";
import { refreshPartnerInactivity } from "@/features/workflow";
import { activityEvents, deleteActivityLogs } from "@/features/activity";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Mail, DollarSign, Loader2, Search, Trophy, Clock, Trash2 } from "lucide-react";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

export default function PartnersPage() {
  const { data: partners, loading, add, remove } = useFirestore<Partner>("partners");

  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPartner, setNewPartner] = useState<Partial<Partner>>({
    leadsSent: 0, converted: 0, commissionDue: 0, trustScore: 50, status: "Active",
  });

  // Refresh inactivity on mount
  useEffect(() => {
    refreshPartnerInactivity();
  }, []);

  // Fuzzy search across name, college, phone
  const searchedPartners = useSmartSearch<Partner>(partners, ["name", "college", "phone"], search);

  // Compute performance rank
  const rankedPartners = useMemo(() => {
    return [...searchedPartners]
      .map((p) => ({
        ...p,
        conversionRate: p.leadsSent > 0 ? p.converted / p.leadsSent : 0,
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }, [searchedPartners]);

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const partnerId = await add({
        name: newPartner.name || "Unknown",
        college: newPartner.college || "Unknown",
        phone: newPartner.phone || "",
        leadsSent: 0,
        converted: 0,
        commissionDue: 0,
        trustScore: 50,
        status: "Active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastLeadAt: Date.now(),
        inactiveDays: 0,
      });
      toast.success("Partner added");
      activityEvents.partnerInvited(partnerId, newPartner.name || "Unknown");

      setIsAddOpen(false);
      setNewPartner({ leadsSent: 0, converted: 0, commissionDue: 0, trustScore: 50, status: "Active" });
    } catch {
      toast.error("Failed to add partner");
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this partner?")) return;
    try {
      await remove(id);
      await deleteActivityLogs(id);
      toast.success("Partner deleted successfully");
    } catch {

      toast.error("Failed to delete partner");
    }
  };


  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-3.5 h-3.5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-3.5 h-3.5 text-slate-400" />;
    if (rank === 3) return <Trophy className="w-3.5 h-3.5 text-amber-700" />;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Partners</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage referral partners and commissions.</p>
        </div>

        <div className="flex gap-3 items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, college, phone..."
              className="pl-8 bg-card border-border/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={<Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0" />}>
              <UserPlus className="w-4 h-4" />
              <span>Invite Partner</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
              <DialogHeader>
                <DialogTitle>Add Partner</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddPartner} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Input placeholder="Full Name" value={newPartner.name || ""} onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })} required className="bg-background/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Input placeholder="College / University" value={newPartner.college || ""} onChange={(e) => setNewPartner({ ...newPartner, college: e.target.value })} required className="bg-background/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Input placeholder="Phone / WhatsApp" value={newPartner.phone || ""} onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })} className="bg-background/50 border-border/50" />
                </div>
                <Button type="submit" className="w-full mt-4">Save Partner</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border border-border/50 rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="font-medium w-10">#</TableHead>
              <TableHead className="font-medium">Name</TableHead>
              <TableHead className="font-medium">College</TableHead>
              <TableHead className="font-medium">Leads</TableHead>
              <TableHead className="font-medium">Converted</TableHead>
              <TableHead className="font-medium">Commission Due</TableHead>
              <TableHead className="font-medium">Trust Score</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="text-right font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rankedPartners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No partners found.
                </TableCell>
              </TableRow>
            ) : (
              rankedPartners.map((partner) => (
                <TableRow key={partner.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                      {getRankIcon(partner.rank)}
                      {!getRankIcon(partner.rank) && `#${partner.rank}`}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                        {partner.name.charAt(0)}
                      </div>
                      <div>
                        <div>{partner.name}</div>
                        {partner.inactiveDays !== undefined && partner.inactiveDays > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {partner.inactiveDays}d inactive
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{partner.college}</TableCell>
                  <TableCell className="font-medium">{partner.leadsSent}</TableCell>
                  <TableCell className="font-medium text-status-success">{partner.converted}</TableCell>
                  <TableCell className="font-medium text-foreground">₹{partner.commissionDue}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${partner.trustScore >= 90 ? "bg-primary" : "bg-status-success"}`}
                          style={{ width: `${partner.trustScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{partner.trustScore}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        partner.status === "Inactive"
                          ? "bg-status-urgent/10 text-status-urgent border-status-urgent/30"
                          : "bg-status-success/10 text-status-success border-status-success/30"
                      }`}
                    >
                      {partner.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => partner.phone && window.open(`https://wa.me/${partner.phone.replace(/[^0-9]/g, "")}`, "_blank")}
                      >
                        <Mail className="w-3.5 h-3.5 mr-1.5" /> Contact
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs border-border/50 hover:bg-muted">
                        <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Pay
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-status-urgent hover:bg-status-urgent/10"
                        onClick={() => handleDeletePartner(partner.id!)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
