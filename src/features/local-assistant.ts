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
    const fillers = /\b(there|is|a|got|record|save|add|create|new|lead|enquiry|contact|interested|of|for|person|guy|girl|student|client|someone|called|named|with|the|just|please|can|you|info|data|details|about|ambassador|associate|partner|promoter|collaborator)\b/gi;
    const cleanInput = input.replace(fillers, "").trim();
    
    // Multi-strategy splitting
    let splitStrategyFound = false;

    // Strategy A: "from" or "at" or "in" or "belongs to"
    const splitters = /\s+(from|at|in|of|belongs to|studying at|location is|college is|lives in)\s+/i;
    const parts = cleanInput.split(splitters);
    if (parts.length >= 3) {
      name = parts[0].trim();
      college = parts[2].split(/\b(by|at|source|via|deadline|on|with|phone|mobile)\b/i)[0].trim();
      splitStrategyFound = true;
    }

    // Strategy B: "is from" or "is at"
    if (!splitStrategyFound) {
      const isMatch = cleanInput.match(/(.+?)\s+is\s+(?:from|at|in)\s+(.+)/i);
      if (isMatch) {
        name = isMatch[1].trim();
        college = isMatch[2].trim();
        splitStrategyFound = true;
      }
    }

    // Strategy C: If no clear splitter, assume "Name [Location]" if name is multiple words
    if (!splitStrategyFound) {
      const words = cleanInput.split(" ");
      if (words.length >= 3) {
        // Assume first two are name, rest is college
        name = words[0] + " " + words[1];
        college = words.slice(2).join(" ");
      } else if (words.length === 2) {
        name = words[0];
        college = words[1];
      }
    }

    const capitalize = (s: string) => s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    
    if (name && name.length > 1) {
      return {
        type: input.includes("partner") ? "partner" : "lead",
        name: capitalize(name),
        college: college ? capitalize(college) : "Unknown",
        phone,
        source: capitalize(source),
        deadline: deadline ? capitalize(deadline) : undefined,
        summary: `Add ${input.includes("partner") ? "partner" : "lead"}: ${capitalize(name)} from ${college ? capitalize(college) : "Unknown"}`
      };
    }
  }

  // 3. PARTNER DETECTION
  if (/\b(partner|ambassador|associate|promoter|collaborator)\b/i.test(input)) {
    const nameMatch = input.match(/(?:partner|ambassador|associate|promoter|collaborator|name)\s+(?:is\s+)?(.+?)(?:\s+|$)/i);
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
