export type IntentType = 'ADD_LEAD' | 'SEARCH_ORDER' | 'ADD_PAYMENT' | 'CREATE_TASK' | 'UNKNOWN';

export interface ParsedCommand {
  intent: IntentType;
  confidence: number;
  entities: {
    name?: string;
    college?: string;
    city?: string;
    phone?: string;
    budget?: number;
    deadline?: string;
    source?: string;
    orderId?: string;
    amount?: number;
    taskText?: string;
    dueDate?: string;
    partnerName?: string;
  };
  raw: string;
  suggestedCorrection?: string;
}

export function detectIntent(text: string): IntentType {
  const input = text.toLowerCase();

  if (/\b(lead|enquiry|client|student|interested)\b/i.test(input)) {
    return 'ADD_LEAD';
  }
  
  if (/\b(order|status|show|find)\b/i.test(input)) {
    return 'SEARCH_ORDER';
  }

  if (/\b(payment|paid|received|amount|money|₹)\b/i.test(input)) {
    return 'ADD_PAYMENT';
  }

  if (/\b(task|reminder|do|prepare|call|send|synopsis)\b/i.test(input)) {
    return 'CREATE_TASK';
  }

  return 'UNKNOWN';
}
