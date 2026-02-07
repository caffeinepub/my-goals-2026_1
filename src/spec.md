# Specification

## Summary
**Goal:** Close the Congrats (MonthlyCompletionCelebrationModal) modal immediately when saving to Memories, and show a confirmation pop-up for 3 seconds.

**Planned changes:**
- Update the "Save to Memories" button flow to close/hide the Congrats modal immediately on click.
- Trigger a global (non-modal) pop-up notification after the click that auto-dismisses after ~3000ms.
- Keep the existing save-to-memories behavior and monthly memories UI refresh unchanged.

**User-visible outcome:** When the user clicks "Save to Memories" in the Congrats modal, the modal closes right away and a confirmation pop-up appears for about 3 seconds while the save and UI refresh still work as they do today.
