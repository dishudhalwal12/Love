/**
 * Local Intent Parser for LOVE. Assistant
 * This replaces the need for Gemini by using rule-based extraction
 * optimized for the specific workflows of the dashboard.
 */

export interface ParsedIntent {
  type: "lead" | "payment" | "partner" | "order" | "unknown" | "error";
  name?: string;
  college?: string;
  amount?: number;
  orderId?: string;
  phone?: string;
  source?: string;
  deadline?: string;
  summary: string;
}

export function parseLocalIntent(text: string): ParsedIntent {
  const input = text.toLowerCase().trim();
  
  // 1. PAYMENT DETECTION
  // Patterns: "payment of 500", "received 1000", "500 paid for #2901", etc.
  if (/\b(payment|paid|received|money|₹|amount)\b/i.test(input)) {
    const amountMatch = input.match(/(?:payment|amount|paid|received|₹|of)\s*(\d+)/i);
    const orderMatch = input.match(/(?:order|id|#|number|for)\s*([a-z0-9]+)/i);
    
    if (amountMatch && orderMatch) {
      const amount = parseInt(amountMatch[1]);
      const orderId = orderMatch[1].toUpperCase();
      return {
        type: "payment",
        amount,
        orderId,
        summary: `Record payment of ₹${amount} for order #${orderId}`
      };
    }
  }

  // 2. LEAD DETECTION
  // Optimized for phrases like: "There is a new lead Lakshay Maurya from gym Vasant Kunj"
  if (/\b(lead|enquiry|contact|interested|student|person|guy|girl|got|new)\b/i.test(input) || (input.includes("from") && input.split(" ").length > 3)) {
    let name = "";
    let college = "";
    let phone = "";
    let source = "Direct";
    let deadline = "";

    // Extract Phone
    const phoneMatch = input.match(/\b(\d{10})\b/);
    if (phoneMatch) phone = phoneMatch[1];

    // Extract Source
    const sourceMatch = input.match(/(?:from|source|via)\s+(instagram|whatsapp|facebook|partner|referral)/i);
    if (sourceMatch) source = sourceMatch[1];

    // Extract Deadline
    const deadlineMatch = input.match(/(?:deadline|by|before|date)\s+(?:is\s+)?(.+?)(?:\s|$)/i);
    if (deadlineMatch) deadline = deadlineMatch[1];

    // Extract Name and College with extreme flexibility
    const cleanInput = input.replace(/\b(there|is|a|got|record|save|add|create|new|lead|enquiry|contact|interested|of|for)\b/gi, "").trim();
    
    // Pattern: [Name] from [Location]
    if (cleanInput.includes("from")) {
      const parts = cleanInput.split(/\s+from\s+/i);
      if (parts.length >= 2) {
        name = parts[0].trim();
        college = parts[1].split(/\b(by|at|source|via|deadline|on|with|phone|mobile)\b/i)[0].trim();
      }
    } else if (cleanInput.includes("at")) {
      const parts = cleanInput.split(/\s+at\s+/i);
      if (parts.length >= 2) {
        name = parts[0].trim();
        college = parts[1].trim();
      }
    } else {
      // Fallback: take first two words as name if no location found
      const words = cleanInput.split(" ");
      if (words.length >= 2) {
        name = words[0] + " " + words[1];
        college = words.slice(2).join(" ");
      }
    }

    const capitalize = (s: string) => s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    
    if (name && name.length > 2) {
      return {
        type: "lead",
        name: capitalize(name),
        college: college ? capitalize(college) : "Unknown",
        phone,
        source: capitalize(source),
        deadline: deadline ? capitalize(deadline) : undefined,
        summary: `Add lead: ${capitalize(name)} from ${college ? capitalize(college) : "Unknown"}`
      };
    }
  }

  // 3. PARTNER DETECTION
  if (/\b(partner|ambassador|associate|promoter)\b/i.test(input)) {
    const nameMatch = input.match(/(?:partner|ambassador|associate|promoter|name)\s+(?:is\s+)?(.+?)(?:\s+|$)/i);
    if (nameMatch) {
      const name = nameMatch[1];
      return {
        type: "partner",
        name: name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        summary: `Add new partner: ${name}`
      };
    }
  }

  return {
    type: "unknown",
    summary: `I heard: "${text}". Try: "New lead [name] from [college]" or "Payment [amount] for order [ID]"`
  };
}
