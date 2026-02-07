/**
 * localStorage utility for persisting YearlySummaryTable checkbox state.
 * Stores checkbox state keyed by checkboxId (format: `${cardId}-${goalId}-${month}`).
 */

const STORAGE_KEY = 'yearlySummaryCheckboxState-2026';

export interface CheckboxState {
  [checkboxId: string]: boolean;
}

/**
 * Load checkbox state from localStorage.
 * Returns an empty object if storage is missing or corrupted.
 */
export function loadCheckboxState(): CheckboxState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }
    
    const parsed = JSON.parse(stored);
    
    // Validate that parsed data is an object with boolean values
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.warn('Invalid checkbox state format in localStorage, resetting to empty');
      return {};
    }
    
    // Validate all values are booleans
    const isValid = Object.values(parsed).every(val => typeof val === 'boolean');
    if (!isValid) {
      console.warn('Invalid checkbox state values in localStorage, resetting to empty');
      return {};
    }
    
    return parsed as CheckboxState;
  } catch (error) {
    console.error('Failed to load checkbox state from localStorage:', error);
    return {};
  }
}

/**
 * Save checkbox state to localStorage.
 * Safely handles serialization errors.
 */
export function saveCheckboxState(state: CheckboxState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save checkbox state to localStorage:', error);
  }
}

/**
 * Clear all checkbox state from localStorage.
 */
export function clearCheckboxState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear checkbox state from localStorage:', error);
  }
}
