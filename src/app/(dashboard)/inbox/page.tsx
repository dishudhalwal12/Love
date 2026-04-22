"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Inbox as InboxIcon, Search, Mail, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useFirestore } from "@/features/hooks";
import { Lead } from "@/features/types";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function InboxPage() {
  const { data: leads, loading } = useFirestore<Lead>("leads");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const selectedLead = useMemo(() => 
    leads.find(l => l.id === selectedLeadId), 
  [leads, selectedLeadId]);

  const mockMessages = [
    { id: 1, text: "Hey! I'm interested in the project service. Can you share details?", sender: "client", time: Date.now() - 3600000 },
    { id: 2, text: "Sure! We have three tiers of support. Which one are you looking at?", sender: "me", time: Date.now() - 3000000 },
    { id: 3, text: "The premium one seems best. What's the timeline?", sender: "client", time: Date.now() - 2000000 },
  ];

  const handleSend = () => {
    if (!replyText.trim()) return;
    toast.success("Message sent successfully!");
    setReplyText("");
  };

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto h-[calc(100vh-140px)] flex flex-col overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Inbox</h2>
          <p className="text-sm text-muted-foreground mt-1">Unified messaging from all channels.</p>
        </div>
      </div>

      <div className="flex-1 border border-white/[0.05] rounded-xl bg-card/30 backdrop-blur-sm overflow-hidden flex min-h-0">
        {/* Sidebar */}
        <div className="w-80 border-r border-white/[0.05] flex flex-col bg-card/50">
          <div className="p-4 border-b border-white/[0.05]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search messages..." className="pl-8 bg-background/50 border-white/5" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Loading leads...</div>
            ) : leads.map((lead) => (
              <div 
                key={lead.id} 
                onClick={() => setSelectedLeadId(lead.id!)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${selectedLeadId === lead.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/[0.03] border border-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm truncate pr-2">{lead.name}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDistanceToNow(lead.createdAt, { addSuffix: false })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground line-clamp-1 flex-1">New inquiry regarding {lead.source}...</p>
                  {lead.status === "New" && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Chat Area */}
        {selectedLead ? (
          <div className="flex-1 flex flex-col bg-background/10">
            {/* Header */}
            <div className="p-4 border-b border-white/[0.05] flex items-center justify-between bg-card/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-sm font-bold text-black">
                  {selectedLead.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-medium text-sm">{selectedLead.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{selectedLead.status}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span className="text-[10px] text-muted-foreground">{selectedLead.phone || "No phone"}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground">
                  View Lead
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">
                  Open WhatsApp
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {mockMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                    msg.sender === 'me' 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-white/5 border border-white/5 rounded-tl-none'
                  }`}>
                    <p>{msg.text}</p>
                    <p className={`text-[9px] mt-1 opacity-50 ${msg.sender === 'me' ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Area */}
            <div className="p-4 bg-card/40 border-t border-white/[0.05]">
              <div className="flex items-center gap-3">
                <Input 
                  placeholder={`Reply to ${selectedLead.name.split(' ')[0]}...`} 
                  className="bg-background/50 border-white/5 focus-visible:ring-primary/20 h-10"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <Button className="h-10 px-4 gap-2" onClick={handleSend}>
                  <Mail className="w-4 h-4" />
                  <span>Send</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background/5 opacity-50">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground">Select a conversation</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Choose a lead from the sidebar to view communication history and respond directly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
