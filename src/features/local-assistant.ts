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
  // Patterns: "New lead...", "Lead of...", "There is a lead...", "[Name] from [College]", etc.
  if (/\b(lead|enquiry|contact|interested|student)\b/i.test(input) || (input.includes("from") && input.split(" ").length > 3)) {
    let name = "";
    let college = "";
    let phone = "";
    let source = "Direct";
    let deadline = "";

    // Extract Phone
    const phoneMatch = input.match(/\b(\d{10})\b/);
    if (phoneMatch) phone = phoneMatch[1];

    // Extract Source (Instagram, Partner Name, etc.)
    const sourceMatch = input.match(/(?:from|source|via)\s+(instagram|whatsapp|facebook|partner|referral)/i);
    if (sourceMatch) source = sourceMatch[1];

    // Extract Deadline
    const deadlineMatch = input.match(/(?:deadline|by|before|date)\s+(?:is\s+)?(.+?)(?:\s|$)/i);
    if (deadlineMatch) deadline = deadlineMatch[1];

    // Extract Name and College
    // "New lead Divyanshu Saini from JIMS College"
    const leadPatterns = [
      /(?:new lead|lead|contact|student|enquiry|interested|person|guy|girl)\s+(?:of|is)?\s+(.+?)\s+(?:from|at|in|of|belongs to|studying at)\s+(.+?)(?:\s+|$)/i,
      /(.+?)\s+(?:from|at|in)\s+(.+?)\s+(?:is a new lead|interested|wants to join|contacted)/i,
      /(?:add|create|record|save)\s+(?:a)?\s+lead\s+(?:for)?\s+(.+?)\s+(?:from|at|in)\s+(.+?)/i,
      /(?:got a)?\s+new\s+(.+?)\s+(?:from|at|in)\s+(.+?)/i,
      /(.+?)\s+(?:of|from)\s+(.+?)\s+(?:is interested)/i
    ];

    for (const pattern of leadPatterns) {
      const match = input.match(pattern);
      if (match) {
        name = match[1];
        college = match[2];
        break;
      }
    }

    if (!name && input.includes("from")) {
      const parts = input.split("from");
      name = parts[0].replace(/\b(new|lead|there|is|a|of|got|enquiry|contact)\b/gi, "").trim();
      college = parts[1].split(/\b(by|at|source|via|deadline|on|with|phone|mobile)\b/i)[0].trim();
    }

    if (!name) name = input.replace(/\b(new|lead|add|create|a|of|there|is|got|save|record)\b/gi, "").split(" ")[0];

    const capitalize = (s: string) => s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    
    if (name) {
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
