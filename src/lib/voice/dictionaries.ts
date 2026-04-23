import namesData from './names.json';
import collegesData from './colleges.json';

export const NAMES = namesData;
export const COLLEGES = collegesData;

export function findBestMatch(word: string, dictionary: string[]): string | null {
  const normalized = word.toLowerCase();
  return dictionary.find(item => item.toLowerCase() === normalized) || null;
}

export function checkSynonyms(word: string): string | null {
  const normalized = word.toLowerCase();
  return (COLLEGES.synonyms as Record<string, string>)[normalized] || null;
}

export function isCommonName(word: string): boolean {
  const normalized = word.toLowerCase();
  return NAMES.firstNames.some(n => n.toLowerCase() === normalized) || 
         NAMES.lastNames.some(n => n.toLowerCase() === normalized);
}
