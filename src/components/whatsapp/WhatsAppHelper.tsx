"use client";

import { useSettings } from "@/context/SettingsContext";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface WhatsAppHelperProps {
  clientPhone?: string;
  clientName: string;
  orderId?: string;
}

export function WhatsAppHelper({ clientPhone = "", clientName, orderId }: WhatsAppHelperProps) {
  const { settings } = useSettings();

  const handleSend = (templateText: string) => {
    let text = templateText
      .replace("{{name}}", clientName)
      .replace("{{orderId}}", orderId || "");
      
    const url = `https://wa.me/${clientPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleCreateGroup = () => {
    // WhatsApp web doesn't support creating groups via wa.me link directly with members.
    // We just guide the user to WA web.
    window.open("https://web.whatsapp.com/", "_blank");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCreateGroup}
          className="bg-status-success/10 text-status-success border-status-success/30 hover:bg-status-success/20"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Create WA Group
        </Button>
        
        {settings?.whatsappTemplates?.map(t => (
          <Button 
            key={t.id} 
            variant="secondary" 
            size="sm" 
            onClick={() => handleSend(t.text)}
          >
            {t.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
