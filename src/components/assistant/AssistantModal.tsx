"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Mic, MicOff, X, Loader2, CheckCircle2, AlertCircle, 
  Send, User, Bot, Volume2, VolumeX, Sparkles
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { processAssistantIntent } from "@/features/assistant";
import { useFirestore } from "@/features/hooks";
import { Lead, Payment, Order } from "@/features/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface AssistantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssistantModal({ open, onOpenChange }: AssistantModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [step, setStep] = useState<"idle" | "listening" | "confirming" | "success">("idle");
  
  const { add: addLead } = useFirestore<Lead>("leads");
  const { add: addPayment } = useFirestore<Payment>("payments");
  const { data: orders, update: updateOrder } = useFirestore<Order>("orders");

  // Web Speech API
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = "en-IN";

        rec.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcriptText = event.results[current][0].transcript;
          setTranscript(transcriptText);
          if (event.results[current].isFinal) {
            handleProcessIntent(transcriptText);
          }
        };

        rec.onend = () => setIsListening(false);
        setRecognition(rec);
      }
    }
  }, []);

  const startListening = () => {
    if (recognition) {
      setTranscript("");
      setStep("listening");
      setIsListening(true);
      recognition.start();
    } else {
      toast.error("Speech recognition not supported in this browser.");
    }
  };

  const handleProcessIntent = async (text: string) => {
    setIsProcessing(true);
    const result = await processAssistantIntent(text);
    setIsProcessing(false);
    
    if (result && result.type !== "unknown") {
      setParsedData(result);
      setStep("confirming");
    } else {
      toast.error("I couldn't quite understand that. Please try again.");
      setStep("idle");
    }
  };

  const confirmAction = async () => {
    if (!parsedData) return;

    try {
      if (parsedData.type === "lead") {
        await addLead({
          name: parsedData.name,
          college: parsedData.college || "Unknown",
          phone: parsedData.phone || "",
          budget: parsedData.budget || 0,
          status: "New",
          score: 50,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as Lead);
        toast.success(`Lead ${parsedData.name} added!`);
      } else if (parsedData.type === "payment") {
        const order = orders.find(o => o.orderId === parsedData.orderId);
        if (order) {
          await addPayment({
            orderId: parsedData.orderId,
            amount: parsedData.amount,
            method: "UPI",
            clientName: order.clientName,
            status: "Paid",
            paidAt: Date.now(),
            updatedAt: Date.now(),
          } as Payment);
          
          await updateOrder(order.id!, {
            amountPaid: (order.amountPaid || 0) + parsedData.amount
          });
          toast.success(`Payment of ₹${parsedData.amount} recorded for ${order.orderId}`);
        } else {
          toast.error("Order ID not found.");
          return;
        }
      }
      setStep("success");
      setTimeout(() => onOpenChange(false), 2000);
    } catch (error) {
      toast.error("Failed to perform action.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-white/[0.05] p-0 overflow-hidden rounded-3xl">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight">AI Assistant</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="min-h-[200px] flex flex-col items-center justify-center space-y-8 py-4">
            <AnimatePresence mode="wait">
              {step === "idle" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center space-y-4"
                >
                  <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mx-auto border border-primary/10">
                    <Bot className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">How can I help you today?</p>
                  <Button onClick={startListening} size="lg" className="rounded-full px-8 gap-2">
                    <Mic className="w-4 h-4" /> Start Speaking
                  </Button>
                </motion.div>
              )}

              {step === "listening" && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center space-y-6 w-full"
                >
                  <div className="relative">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-24 h-24 rounded-full bg-primary/10 mx-auto flex items-center justify-center"
                    >
                      <Mic className="w-12 h-12 text-primary" />
                    </motion.div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-primary font-bold text-lg">Listening...</p>
                    <p className="text-muted-foreground italic text-sm px-4">"{transcript || "Say something like 'New lead Divyanshu from JIMS'..."}"</p>
                  </div>
                </motion.div>
              )}

              {step === "confirming" && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full space-y-4"
                >
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-4">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase text-[10px] tracking-widest">
                      <CheckCircle2 className="w-3 h-3" /> Please Confirm
                    </div>
                    
                    {parsedData?.type === "lead" && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">New Lead</p>
                          <p className="text-lg font-bold">{parsedData.name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">College</p>
                            <p className="text-sm">{parsedData.college || "Not specified"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Budget</p>
                            <p className="text-sm">₹{parsedData.budget || 0}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {parsedData?.type === "payment" && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Payment for Order</p>
                          <p className="text-lg font-bold">{parsedData.orderId}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Amount</p>
                          <p className="text-2xl font-bold text-status-success">₹{parsedData.amount}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep("idle")} className="flex-1 rounded-2xl h-12">Cancel</Button>
                    <Button onClick={confirmAction} className="flex-1 rounded-2xl h-12">Confirm & Add</Button>
                  </div>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-4"
                >
                  <div className="w-20 h-20 rounded-full bg-status-success/20 flex items-center justify-center mx-auto border border-status-success/30">
                    <CheckCircle2 className="w-10 h-10 text-status-success" />
                  </div>
                  <p className="text-xl font-bold">Success!</p>
                  <p className="text-muted-foreground text-sm">Action has been recorded.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Volume2 className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Assistant is in text-only feedback mode. Review parsed data above before confirming.
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
