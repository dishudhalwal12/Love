"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Mic, MicOff, X, Loader2, CheckCircle2, AlertCircle,
  Send, User, Bot, Volume2, VolumeX, Sparkles, History,
  Search, CreditCard, ClipboardList, PlusCircle, ArrowRight,
  RotateCcw, Phone, Calendar, Share2, Users
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useFirestore } from "@/features/hooks";
import { Lead, Payment, Order, ActivityLog, Task } from "@/features/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceTranscriber } from "@/lib/voice/transcribe";
import { parseCommand } from "@/lib/voice/parseCommand";
import { ParsedCommand } from "@/lib/voice/intents";

interface AssistantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssistantModal({ open, onOpenChange }: AssistantModalProps) {
  const [step, setStep] = useState<"idle" | "listening" | "confirming" | "success">("idle");
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCommand | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);

  const { add: addLead } = useFirestore<Lead>("leads");
  const { add: addPayment } = useFirestore<Payment>("payments");
  const { add: addLog } = useFirestore<ActivityLog>("activity_logs");
  const { add: addTask } = useFirestore<Task>("tasks");
  const { data: orders, update: updateOrder } = useFirestore<Order>("orders");

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("assistant_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (text: string) => {
    const newHistory = [text, ...history.filter(t => t !== text)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem("assistant_history", JSON.stringify(newHistory));
  };

  // Initialize Transcriber
  const transcriber = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new VoiceTranscriber({
      onResult: (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          // Auto-stop after a short delay or manual trigger is usually better
          // but we can just update the transcript live
        }
      },
      onEnd: () => {
        // Handle end if needed
      },
      onError: (err) => {
        if (err !== 'no-speech') toast.error(`Voice Error: ${err}`);
      }
    });
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep("idle");
      setTranscript("");
      setParsedData(null);
      setFoundOrder(null);
      setIsProcessing(false);
    } else {
      transcriber?.stop();
    }
  }, [open, transcriber]);

  const startRecording = () => {
    setTranscript("");
    setStep("listening");
    transcriber?.start();
  };

  const stopAndProcess = () => {
    transcriber?.stop();
    if (!transcript.trim()) {
      setStep("idle");
      return;
    }
    handleProcessIntent(transcript);
  };

  const handleProcessIntent = (text: string) => {
    setIsProcessing(true);
    saveToHistory(text);

    const result = parseCommand(text);
    setParsedData(result);

    // If searching for order, try to find it immediately
    if (result.intent === 'SEARCH_ORDER' && result.entities.orderId) {
      const order = orders.find(o => o.orderId.toUpperCase() === result.entities.orderId?.toUpperCase());
      setFoundOrder(order || null);
    }

    setIsProcessing(false);
    setStep("confirming");
  };

  const confirmAction = async () => {
    if (!parsedData) return;

    try {
      const { intent, entities } = parsedData;

      if (intent === "ADD_LEAD") {
        await addLead({
          name: entities.name || "Unknown",
          college: entities.college || "Unknown",
          phone: entities.phone || "",
          budget: entities.budget || 0,
          source: entities.source || "Direct",
          partnerSource: entities.partnerName || "",
          deadline: entities.deadline || "",
          status: "New",
          score: 50,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as Lead);

        await addLog({
          message: `Voice Added Lead: ${entities.name}`,
          type: "lead",
          status: "new",
          timestamp: Date.now(),
          meta: { college: entities.college, source: entities.source, partner: entities.partnerName }
        } as ActivityLog);

        toast.success(`Lead ${entities.name} added!`);
      }
      else if (intent === "ADD_PAYMENT") {
        const order = orders.find(o => o.orderId === entities.orderId);
        if (order && entities.amount) {
          await addPayment({
            orderId: entities.orderId!,
            amount: entities.amount,
            method: "UPI",
            clientName: order.clientName,
            status: "Paid",
            paidAt: Date.now(),
            updatedAt: Date.now(),
            remainingBalance: (order.amount || 0) - (order.amountPaid || 0) - entities.amount
          } as Payment);

          await updateOrder(order.id!, {
            amountPaid: (order.amountPaid || 0) + entities.amount
          });

          await addLog({
            message: `Voice Payment Received: ₹${entities.amount}`,
            type: "payment",
            status: "success",
            timestamp: Date.now(),
            meta: { orderId: entities.orderId, client: order.clientName }
          } as ActivityLog);

          toast.success(`Payment of ₹${entities.amount} recorded for ${order.orderId}`);
        } else {
          toast.error("Order not found or invalid amount.");
          return;
        }
      }
      else if (intent === "CREATE_TASK") {
        await addTask({
          id: Math.random().toString(36).substr(2, 9),
          title: entities.taskText || "New Voice Task",
          tags: ["voice"],
          columnId: "today",
          createdAt: Date.now(),
          order: 0,
          isAutoGenerated: true,
          dueAt: entities.dueDate ? Date.now() + 86400000 : undefined // Simple mock for tomorrow
        } as Task);

        toast.success("Task created in Tasks page!");
      }

      setStep("success");
      setTimeout(() => onOpenChange(false), 1500);
    } catch (error) {
      toast.error("Failed to perform action.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-3xl border-white/[0.05] p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">LOVE Assistant</DialogTitle>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Local-First Command Tool</p>
              </div>
            </div>
          </div>

          <div className="min-h-[250px] flex flex-col items-center justify-center space-y-8 py-4">
            <AnimatePresence mode="wait">
              {step === "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center space-y-8 w-full"
                >
                  <div className="space-y-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center mx-auto border border-primary/10 relative">
                      <Bot className="w-12 h-12 text-primary" />
                      <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping [animation-duration:3s]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-foreground font-bold text-lg">Ready to help</p>
                      <p className="text-muted-foreground text-xs px-8">"Add lead Aman from VIPS" or "Search order 2012"</p>
                    </div>
                  </div>

                  <Button onClick={startRecording} size="lg" className="rounded-full h-16 w-16 p-0 bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                    <Mic className="w-7 h-7" />
                  </Button>

                  {history.length > 0 && (
                    <div className="w-full space-y-3 pt-4 text-left px-2">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold px-2">
                        <History className="w-3 h-3" /> Recent Commands
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {history.map((text, i) => (
                          <button
                            key={i}
                            onClick={() => handleProcessIntent(text)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-muted-foreground hover:bg-white/10 transition-colors"
                          >
                            {text.length > 30 ? text.substring(0, 30) + "..." : text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {step === "listening" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center space-y-8 w-full"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.15, 1],
                      boxShadow: ["0 0 0px 0px rgba(var(--primary), 0)", "0 0 40px 10px rgba(var(--primary), 0.1)", "0 0 0px 0px rgba(var(--primary), 0)"]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-28 h-28 rounded-full bg-primary/10 mx-auto flex items-center justify-center cursor-pointer border border-primary/30"
                    onClick={stopAndProcess}
                  >
                    <div className="relative">
                      <Mic className="w-14 h-14 text-primary" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-status-urgent rounded-full animate-pulse border-4 border-card" />
                    </div>
                  </motion.div>
                  <div className="space-y-6 px-4">
                    <div className="space-y-2">
                      <p className="text-primary font-bold text-xl tracking-tight">Listening...</p>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 min-h-[80px] flex items-center justify-center">
                        <p className="text-foreground/80 italic text-sm text-center">
                          {transcript ? `"${transcript}"` : "Speak clearly..."}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={stopAndProcess} className="rounded-full px-8 h-12 border-primary/20 text-primary hover:bg-primary/5">
                      Done Speaking
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === "confirming" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full space-y-6"
                >
                  <div className="bg-white/5 rounded-[2rem] p-6 border border-white/10 space-y-6 relative overflow-hidden">
                    {/* Confidence Indicator */}
                    <div className="absolute top-0 right-0 p-4">
                      <Badge variant="outline" className={`
                        text-[9px] uppercase tracking-tighter
                        ${parsedData?.confidence! > 80 ? 'border-status-success text-status-success bg-status-success/5' :
                          parsedData?.confidence! > 50 ? 'border-status-pending text-status-pending bg-status-pending/5' :
                            'border-status-urgent text-status-urgent bg-status-urgent/5'}
                      `}>
                        {parsedData?.confidence}% Accurate
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
                      <CheckCircle2 className="w-4 h-4" /> Review Action
                    </div>

                    <div className="pb-4 border-b border-white/10">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Original Input</p>
                      <p className="text-sm font-medium italic text-white/90">"{parsedData?.raw}"</p>
                    </div>

                    {parsedData?.intent === "ADD_LEAD" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Lead Identity</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              value={parsedData.entities.name || ""}
                              onChange={(e) => setParsedData({ ...parsedData, entities: { ...parsedData.entities, name: e.target.value } })}
                              className="bg-white/5 border-white/10 h-12 pl-10 rounded-2xl focus:ring-primary text-base font-medium"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">College</label>
                            <Input
                              value={parsedData.entities.college || ""}
                              onChange={(e) => setParsedData({ ...parsedData, entities: { ...parsedData.entities, college: e.target.value } })}
                              className={`bg-white/5 border-white/10 h-10 rounded-xl text-xs ${parsedData.suggestedCorrection ? 'border-status-pending ring-1 ring-status-pending/20' : ''}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Budget</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">₹</span>
                              <Input
                                type="number"
                                value={parsedData.entities.budget || 0}
                                onChange={(e) => setParsedData({ ...parsedData, entities: { ...parsedData.entities, budget: parseInt(e.target.value) || 0 } })}
                                className="bg-white/5 border-white/10 h-10 pl-6 rounded-xl text-xs font-bold text-status-success"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Phone</label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                              <Input
                                value={parsedData.entities.phone || ""}
                                onChange={(e) => setParsedData({ ...parsedData, entities: { ...parsedData.entities, phone: e.target.value } })}
                                className="bg-white/5 border-white/10 h-10 pl-8 rounded-xl text-xs"
                                placeholder="Phone number"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Deadline</label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                              <Input
                                value={parsedData.entities.deadline || ""}
                                onChange={(e) => setParsedData({ ...parsedData, entities: { ...parsedData.entities, deadline: e.target.value } })}
                                className="bg-white/5 border-white/10 h-10 pl-8 rounded-xl text-xs"
                                placeholder="Deadline"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Source</label>
                            <div className="relative">
                              <Share2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                              <Input
                                value={parsedData.entities.source || "Direct"}
                                onChange={(e) => setParsedData({ ...parsedData, entities: { ...parsedData.entities, source: e.target.value } })}
                                className="bg-white/5 border-white/10 h-10 pl-8 rounded-xl text-xs"
                                placeholder="Source"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Partner</label>
                            <div className="relative">
                              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                              <Input
                                value={parsedData.entities.partnerName || ""}
                                onChange={(e) => setParsedData({ ...parsedData, entities: { ...parsedData.entities, partnerName: e.target.value } })}
                                className="bg-white/5 border-white/10 h-10 pl-8 rounded-xl text-xs"
                                placeholder="Partner name"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {parsedData?.intent === "ADD_PAYMENT" && (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Order Identifier</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              value={parsedData.entities.orderId || ""}
                              onChange={(e) => setParsedData({ ...parsedData, entities: { ...parsedData.entities, orderId: e.target.value.toUpperCase() } })}
                              className="bg-white/5 border-white/10 h-12 pl-10 rounded-2xl focus:ring-status-success text-base font-black tracking-widest"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Amount Received</label>
                          <div className="relative">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-status-success" />
                            <Input
                              type="number"
                              value={parsedData.entities.amount || 0}
                              onChange={(e) => setParsedData({ ...parsedData, entities: { ...parsedData.entities, amount: parseInt(e.target.value) || 0 } })}
                              className="bg-white/5 border-white/10 h-16 pl-12 rounded-2xl text-2xl font-black text-status-success"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {parsedData?.intent === "CREATE_TASK" && (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Task Description</label>
                          <div className="relative">
                            <ClipboardList className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <textarea
                              value={parsedData.entities.taskText || ""}
                              onChange={(e) => setParsedData({ ...parsedData, entities: { ...parsedData.entities, taskText: e.target.value } })}
                              className="w-full bg-white/5 border border-white/10 min-h-[100px] pl-10 pt-2.5 rounded-2xl focus:ring-primary text-base font-medium resize-none focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Due Date</label>
                          <Input
                            value={parsedData.entities.dueDate || "Today"}
                            onChange={(e) => setParsedData({ ...parsedData, entities: { ...parsedData.entities, dueDate: e.target.value } })}
                            className="bg-white/5 border-white/10 h-11 rounded-xl text-sm font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {parsedData?.intent === "SEARCH_ORDER" && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Searching Order</label>
                          <Input
                            value={parsedData.entities.orderId || ""}
                            className="bg-white/5 border-white/10 h-12 rounded-2xl text-lg font-bold text-primary"
                            readOnly
                          />
                        </div>

                        {foundOrder ? (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-4"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-bold text-white">{foundOrder.clientName}</h4>
                                <p className="text-[10px] text-muted-foreground">{foundOrder.topic}</p>
                              </div>
                              <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/20">{foundOrder.status}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[9px] text-muted-foreground uppercase font-bold">Paid %</p>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-status-success"
                                    style={{ width: `${(foundOrder.amountPaid / foundOrder.amount) * 100}%` }}
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] text-muted-foreground uppercase font-bold">Deadline</p>
                                <p className="text-[10px] font-bold text-status-urgent">{foundOrder.deadline}</p>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="p-4 bg-status-urgent/5 border border-status-urgent/20 rounded-2xl text-center">
                            <p className="text-xs text-status-urgent font-medium">Order not found in records.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {parsedData?.intent === "UNKNOWN" && (
                      <div className="text-center py-6 space-y-4">
                        <div className="w-12 h-12 rounded-full bg-status-urgent/10 flex items-center justify-center mx-auto border border-status-urgent/20">
                          <AlertCircle className="w-6 h-6 text-status-urgent" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold">Command Not Recognized</p>
                          <p className="text-[11px] text-muted-foreground px-4">Try saying things like "Add lead Aman" or "Payment 500 for order 241"</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep("idle")} className="flex-1 rounded-[1.5rem] h-14 border-white/10 hover:bg-white/5 gap-2">
                      <RotateCcw className="w-4 h-4" /> Retry
                    </Button>
                    {parsedData?.intent !== "UNKNOWN" && (
                      <Button onClick={confirmAction} disabled={isProcessing} className="flex-1 rounded-[1.5rem] h-14 bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-transform gap-2">
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5" />}
                        {parsedData?.intent === 'SEARCH_ORDER' ? 'Done' : 'Confirm Save'}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6"
                >
                  <div className="w-24 h-24 rounded-full bg-status-success/10 flex items-center justify-center mx-auto border border-status-success/30 relative">
                    <CheckCircle2 className="w-12 h-12 text-status-success" />
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-status-success/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black tracking-tight">Confirmed!</p>
                    <p className="text-muted-foreground text-sm font-medium">Operation completed successfully.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-white/5 p-4 rounded-3xl flex items-center gap-4 border border-white/5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
              Privacy Mode Active: All voice processing is handled locally. No data leaves your device.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
