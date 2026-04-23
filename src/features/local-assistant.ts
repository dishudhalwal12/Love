/**
 * Local Intent Parser for LOVE. Assistant
 * This replaces the need for Gemini by using rule-based extraction
 * optimized for the specific workflows of the dashboard.
 */

export interface ParsedIntent {
  type: "lead" | "payment" | "unknown" | "error";
  name?: string;
  college?: string;
  amount?: number;
  orderId?: string;
  summary: string;
}

export function parseLocalIntent(text: string): ParsedIntent {
  const input = text.toLowerCase().trim();
  
  // 1. Payment Detection
  // Example: "Payment of 500 for order 2901"
  if (input.includes("payment") || input.includes("paid") || input.includes("received")) {
    const amountMatch = input.match(/(?:payment of|amount|paid|received|₹)\s*(\d+)/i);
    const orderMatch = input.match(/(?:order|id|number|#)\s*([a-z0-9]+)/i);
    
    if (amountMatch && orderMatch) {
      const amount = parseInt(amountMatch[1]);
      const orderId = orderMatch[1].toUpperCase();
      return {
        type: "payment",
        amount,
        orderId,
        summary: `Record a payment of ₹${amount} for order #${orderId}`
      };
    }
  }

  // 2. Lead Detection
  // Example: "New lead Divyanshu Saini from JIMS Vasanth Kunj"
  if (input.includes("lead") || input.includes("contact") || input.includes("enquiry")) {
    // Try to extract name and college
    // Pattern: [New lead] {Name} from {College}
    const fromIndex = input.indexOf("from");
    let name = "";
    let college = "";
    
    if (fromIndex !== -1) {
      // Extract name before "from" and after "lead"
      const leadMatch = input.match(/(?:new lead|lead|name is)\s+(.+?)\s+from/i);
      name = leadMatch ? leadMatch[1] : input.substring(0, fromIndex).replace(/new lead|lead/gi, "").trim();
      college = input.substring(fromIndex + 4).trim();
    } else {
      // Just name
      name = input.replace(/new lead|lead/gi, "").trim();
    }

    // Capitalize words
    const capitalize = (s: string) => s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    
    if (name) {
      return {
        type: "lead",
        name: capitalize(name),
        college: college ? capitalize(college) : "Unknown",
        summary: `Add a new lead: ${capitalize(name)}${college ? ` from ${capitalize(college)}` : ""}`
      };
    }
  }

  return {
    type: "unknown",
    summary: `I heard: "${text}". Please try again with "New lead [name] from [college]" or "Payment [amount] for order [ID]".`
  };
}
