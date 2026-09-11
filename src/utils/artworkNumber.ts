import { MaterialCode } from '../types';

const STORAGE_KEY = 'artist_portfolio_serial_counters';

/**
 * Get stored sequence counters
 */
export const getStoredCounters = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read counters from localStorage', e);
  }
  return {};
};

/**
 * Save sequence counters
 */
export const saveStoredCounters = (counters: Record<string, number>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
  } catch (e) {
    console.error('Failed to save counters to localStorage', e);
  }
};

/**
 * Construct the condition prefix: YY + Canvas Size + Material Code
 * e.g., 2026, "030P", "A" -> "26030PA"
 */
export const getArtworkConditionPrefix = (
  year: number,
  canvasSize: string,
  materialCode: MaterialCode
): string => {
  const yy = (year % 100).toString().padStart(2, '0');
  const cleanCanvasSize = canvasSize.trim().toUpperCase();
  return `${yy}${cleanCanvasSize}${materialCode}`;
};

/**
 * Get the next serial number (without incrementing) for preview
 */
export const peekNextArtworkNumber = (
  year: number,
  canvasSize: string,
  materialCode: MaterialCode
): { prefix: string; sequence: number; fullCode: string } => {
  const prefix = getArtworkConditionPrefix(year, canvasSize, materialCode);
  const counters = getStoredCounters();
  const currentCount = counters[prefix] || 0;
  const nextSeq = currentCount + 1;
  const seqStr = nextSeq.toString().padStart(2, '0');
  return {
    prefix,
    sequence: nextSeq,
    fullCode: `${prefix}-${seqStr}`,
  };
};

/**
 * Commit and generate the next artwork number (increments counter)
 */
export const generateAndCommitArtworkNumber = (
  year: number,
  canvasSize: string,
  materialCode: MaterialCode
): string => {
  const prefix = getArtworkConditionPrefix(year, canvasSize, materialCode);
  const counters = getStoredCounters();
  const currentCount = counters[prefix] || 0;
  const nextSeq = currentCount + 1;
  counters[prefix] = nextSeq;
  saveStoredCounters(counters);

  const seqStr = nextSeq.toString().padStart(2, '0');
  return `${prefix}-${seqStr}`;
};
