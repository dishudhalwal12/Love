import { ParsedCommand } from './intents';

export function calculateConfidence(command: ParsedCommand): number {
  let score = 0;
  const { intent, entities } = command;

  if (intent === 'UNKNOWN') return 0;

  // Base score for intent detection
  score += 40;

  // Entity specific scoring
  switch (intent) {
    case 'ADD_LEAD':
      if (entities.name) score += 30;
      if (entities.college) score += 20;
      if (entities.phone) score += 10;
      break;
    case 'SEARCH_ORDER':
      if (entities.orderId) score += 60;
      break;
    case 'ADD_PAYMENT':
      if (entities.amount) score += 30;
      if (entities.orderId) score += 30;
      break;
    case 'CREATE_TASK':
      if (entities.taskText) score += 50;
      if (entities.dueDate) score += 10;
      break;
  }

  return Math.min(score, 100);
}
