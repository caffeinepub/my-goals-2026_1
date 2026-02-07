# Specification

## Summary
**Goal:** Prevent the MonthlyCompletionCelebrationModal (congrats modal) from re-opening when returning to the Yearly Summary after navigating back to the dashboard.

**Planned changes:**
- Update the completion-transition detection logic in `frontend/src/components/YearlySummaryTable.tsx` so the congrats modal only triggers on a true in-session transition from not-complete to 100% complete (e.g., checking the final remaining checkbox for a month).
- Ensure opening (or re-opening) the Yearly Summary view does not treat already-complete saved months as newly completed, while preserving existing monthly memory thumbnail/placeholder behavior.

**User-visible outcome:** When a user goes from Yearly Summary to Dashboard (“Back to dashboard”) and then reopens Yearly Summary (“View yearly summary”), the congrats modal will not auto-open; it will still appear only when the user completes a month by checking its final checkbox during the current session.
