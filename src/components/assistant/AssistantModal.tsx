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
import { parseLocalIntent } from "@/features/local-assistant";
import { transcribeAudio } from "@/features/transcriber";
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

  // Local Whisper ML
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [engineReady, setEngineReady] = useState(false);

  // Initialize Web Speech for live preview ONLY
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-IN";
        rec.onresult = (event: any) => {
          let current = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            current += event.results[i][0].transcript;
          }
          setTranscript(current);
        };
        setRecognition(rec);
      }
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        setStep("confirming");
        setIsProcessing(true);
        try {
          const text = await transcribeAudio(audioBlob);
          setTranscript(text);
          handleProcessIntent(text);
        } catch (error) {
          console.error("Transcription error:", error);
          toast.error("Local transcription failed. Using preview text.");
          handleProcessIntent(transcript);
        } finally {
          setIsProcessing(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      recognition?.start();
      setTranscript("");
      setStep("listening");
      setIsListening(true);
    } catch (err) {
      toast.error("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      recognition?.stop();
      setIsListening(false);
    }
  };

  const handleProcessIntent = async (text: string) => {
    setIsProcessing(true);
    // Use the local rule-based parser instead of Gemini
    // This is instant and doesn't require an API key
    const result = parseLocalIntent(text);
    setIsProcessing(false);
    
    if (result && result.type !== "unknown") {
      setParsedData(result);
      setStep("confirming");
    } else {
      setParsedData(result); // Show the "unknown" state with transcript
      setStep("confirming");
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
          source: parsedData.source || "Direct",
          deadline: parsedData.deadline || "",
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
      } else if (parsedData.type === "partner") {
        // Assume we have a partners collection
        toast.success(`Partner ${parsedData.name} added (Simulation)`);
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
                  <Button onClick={startRecording} size="lg" className="rounded-full px-8 gap-2">
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
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-24 h-24 rounded-full bg-primary/10 mx-auto flex items-center justify-center cursor-pointer"
                    onClick={stopRecording}
                  >
                    <div className="relative">
                      <Mic className="w-12 h-12 text-primary" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-status-urgent rounded-full animate-pulse" />
                    </div>
                  </motion.div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-primary font-bold text-lg">Listening...</p>
                      <p className="text-muted-foreground italic text-sm px-4">"{transcript || "Say something..."}"</p>
                    </div>
                    <Button variant="outline" onClick={stopRecording} className="rounded-full px-6">
                      Stop & Process
                    </Button>
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

                    <div className="pb-3 border-b border-white/5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">What I heard</p>
                      <p className="text-sm font-medium italic text-white/80">"{transcript}"</p>
                    </div>
                    
                    {parsedData?.type === "lead" && (
                      <div className="space-y-4">
                        <p className="text-sm font-bold text-primary leading-relaxed">
                          {parsedData.summary || `Adding lead: ${parsedData.name}`}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">College</p>
                            <p className="text-xs truncate">{parsedData.college || "—"}</p>
                          </div>
                          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Budget</p>
                            <p className="text-xs">₹{parsedData.budget || 0}</p>
                          </div>
                          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Source</p>
                            <p className="text-xs truncate">{parsedData.source || "Direct"}</p>
                          </div>
                          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Phone</p>
                            <p className="text-xs truncate">{parsedData.phone || "—"}</p>
                          </div>
                        </div>
                        {parsedData.deadline && (
                          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Deadline</p>
                            <p className="text-xs">{parsedData.deadline}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {parsedData?.type === "payment" && (
                      <div className="space-y-4">
                        <p className="text-sm font-bold text-status-success leading-relaxed">
                          {parsedData.summary || `Recording payment of ₹${parsedData.amount}`}
                        </p>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-status-success/10 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-status-success" />
                            </div>
                            <span className="text-xs font-bold text-white">Record Payment</span>
                          </div>
                          <span className="text-sm font-bold text-status-success">₹{parsedData.amount}</span>
                        </div>
                      </div>
                    )}

                    {(!parsedData || (parsedData.type !== "lead" && parsedData.type !== "payment")) && (
                      <div className="space-y-2">
                        <p className="text-xs text-status-urgent font-medium">
                          {parsedData?.summary || "I couldn't identify a specific action. Would you like to try again?"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep("idle")} className="flex-1 rounded-2xl h-12">Cancel</Button>
                    <Button onClick={confirmAction} disabled={isProcessing} className="flex-1 rounded-2xl h-12">
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      {isProcessing ? "Analyzing..." : "Confirm & Add"}
                    </Button>
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
      </DialogContent>
    </Dialog>
  );
}
