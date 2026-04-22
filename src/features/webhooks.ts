import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export const triggerWebhook = async (webhookUrl: string, payload: any) => {
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      mode: "no-cors", // n8n webhooks usually don't need CORS for simple POST
    });
    console.log("Webhook triggered successfully:", webhookUrl);
  } catch (error) {
    console.error("Failed to trigger webhook:", error);
  }
};

export const getSettings = async () => {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", "global"));
    if (settingsDoc.exists()) {
      return settingsDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return null;
  }
};

export const triggerNewLeadWebhook = async (leadData: any) => {
  const settings = await getSettings();
  if (settings?.N8N_NEW_LEAD_WEBHOOK) {
    await triggerWebhook(settings.N8N_NEW_LEAD_WEBHOOK, { event: "new_lead", data: leadData });
  }
};

export const triggerOrderBookedWebhook = async (orderData: any) => {
  const settings = await getSettings();
  if (settings?.N8N_SYNOPSIS_WEBHOOK) {
    await triggerWebhook(settings.N8N_SYNOPSIS_WEBHOOK, { event: "order_booked", data: orderData });
  }
};

export const triggerPaymentWebhook = async (paymentData: any) => {
  const settings = await getSettings();
  if (settings?.N8N_PAYMENT_WEBHOOK) {
    await triggerWebhook(settings.N8N_PAYMENT_WEBHOOK, { event: "payment_added", data: paymentData });
  }
};
