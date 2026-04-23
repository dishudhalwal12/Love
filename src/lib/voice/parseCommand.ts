import { detectIntent, ParsedCommand, IntentType } from './intents';
import { calculateConfidence } from './confidence';
import { NAMES, COLLEGES, checkSynonyms, isCommonName } from './dictionaries';

const FILLER_WORDS = ['um', 'hello', 'okay', 'bro', 'please', 'there is', 'someone named', 'i want to', 'can you'];

export function parseCommand(text: string): ParsedCommand {
  let cleanedText = text.toLowerCase().trim();

  // Remove filler words
  FILLER_WORDS.forEach(word => {
    cleanedText = cleanedText.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
  });
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

  const intent = detectIntent(cleanedText);
  const entities: ParsedCommand['entities'] = {};
  let suggestedCorrection: string | undefined;

  switch (intent) {
    case 'ADD_LEAD':
      parseLeadEntities(cleanedText, entities);
      break;
    case 'SEARCH_ORDER':
      parseOrderEntities(cleanedText, entities);
      break;
    case 'ADD_PAYMENT':
      parsePaymentEntities(cleanedText, entities);
      break;
    case 'CREATE_TASK':
      parseTaskEntities(cleanedText, entities);
      break;
  }

  // Smart Correction for Colleges (e.g., Gyms -> JIMS)
  if (entities.college) {
    const correction = checkSynonyms(entities.college);
    if (correction && correction !== entities.college) {
      suggestedCorrection = `Did you mean ${correction}?`;
      entities.college = correction;
    }
  }

  const command: ParsedCommand = {
    intent,
    confidence: 0,
    entities,
    raw: text,
    suggestedCorrection
  };

  command.confidence = calculateConfidence(command);
  return command;
}

function parseLeadEntities(text: string, entities: any) {
  // Extract Phone
  const phoneMatch = text.match(/\b(\d{10})\b/);
  if (phoneMatch) entities.phone = phoneMatch[1];

  // Extract Budget
  const budgetMatch = text.match(/\b(budget|of)\s*(\d+)\b/i);
  if (budgetMatch) entities.budget = parseInt(budgetMatch[2]);

  // Extract Source
  const sourceMatch = text.match(/(?:from|source|via)\s+(instagram|whatsapp|facebook|partner|referral|ads|website)/i);
  if (sourceMatch) {
    entities.source = capitalizeWords(sourceMatch[1]);
  }

  // Extract Partner
  const partnerMatch = text.match(/(?:partner|by|associate)\s+(\w+)/i);
  if (partnerMatch) {
    entities.partnerName = capitalizeWords(partnerMatch[1]);
    entities.source = 'Partner';
  }

  // Extract Deadline
  const deadlineMatch = text.match(/(?:deadline|by|before|date)\s+(?:is\s+)?(\w+)/i);
  if (deadlineMatch) entities.deadline = deadlineMatch[1];

  // Logic for Name and College using "from" or positioning
  const fromIndex = text.indexOf('from');
  if (fromIndex !== -1) {
    const namePart = text.substring(0, fromIndex).replace(/\b(new lead|add lead|lead)\b/gi, '').trim();
    const collegePart = text.substring(fromIndex + 4).split(/\b(budget|deadline|phone)\b/i)[0].trim();

    entities.name = capitalizeWords(namePart);
    entities.college = capitalizeWords(collegePart);
  } else {
    // Fallback simple parsing
    const words = text.split(' ').filter(w => !FILLER_WORDS.includes(w.toLowerCase()));
    if (words.length >= 2) {
      entities.name = capitalizeWords(words.slice(0, 2).join(' '));
    }
  }
}

function parseOrderEntities(text: string, entities: any) {
  const orderMatch = text.match(/\b(order|id|#)?\s*([a-z0-9]{3,})\b/i);
  if (orderMatch) {
    entities.orderId = orderMatch[2].toUpperCase();
  }
}

function parsePaymentEntities(text: string, entities: any) {
  const amountMatch = text.match(/\b(\d+)\b/);
  if (amountMatch) entities.amount = parseInt(amountMatch[1]);

  const orderMatch = text.match(/\b(order|id|#|for)\s*([a-z0-9]+)\b/i);
  if (orderMatch) entities.orderId = orderMatch[2].toUpperCase();
}

function parseTaskEntities(text: string, entities: any) {
  const taskKeywords = ['task', 'reminder', 'do', 'prepare', 'call', 'send'];
  let taskText = text;
  taskKeywords.forEach(kw => {
    taskText = taskText.replace(new RegExp(`\\b${kw}\\b`, 'gi'), '');
  });

  const dueMatch = text.match(/(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (dueMatch) {
    entities.dueDate = dueMatch[0];
    taskText = taskText.replace(dueMatch[0], '');
  }

  entities.taskText = capitalizeWords(taskText.trim());
}

function capitalizeWords(str: string): string {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
