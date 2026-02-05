import { type Month, MONTHS } from './months';

const STORAGE_KEY_PREFIX = 'monthly-memory-';

/**
 * Get the localStorage key for a specific month
 */
function getStorageKey(month: Month): string {
  return `${STORAGE_KEY_PREFIX}${month.toLowerCase()}`;
}

/**
 * Save a selfie for a specific month
 * @param month - The month to save the selfie for
 * @param imageDataUrl - The image as a data URL (base64) - should be the already-composited image
 */
export function saveMonthlyMemory(month: Month, imageDataUrl: string): void {
  try {
    localStorage.setItem(getStorageKey(month), imageDataUrl);
  } catch (error) {
    console.error(`Failed to save monthly memory for ${month}:`, error);
  }
}

/**
 * Get the saved selfie for a specific month
 * @param month - The month to retrieve the selfie for
 * @returns The image data URL or null if not found
 */
export function getMonthlyMemory(month: Month): string | null {
  try {
    return localStorage.getItem(getStorageKey(month));
  } catch (error) {
    console.error(`Failed to get monthly memory for ${month}:`, error);
    return null;
  }
}

/**
 * Clear the saved selfie for a specific month
 * @param month - The month to clear the selfie for
 */
export function clearMonthlyMemory(month: Month): void {
  try {
    localStorage.removeItem(getStorageKey(month));
  } catch (error) {
    console.error(`Failed to clear monthly memory for ${month}:`, error);
  }
}

/**
 * Get all saved monthly memories
 * @returns A map of month to image data URL
 */
export function getAllMonthlyMemories(): Map<Month, string> {
  const memories = new Map<Month, string>();
  
  MONTHS.forEach((month) => {
    const memory = getMonthlyMemory(month);
    if (memory) {
      memories.set(month, memory);
    }
  });
  
  return memories;
}
