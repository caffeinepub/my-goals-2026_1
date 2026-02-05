# Specification

## Summary
**Goal:** Update the Congrats modal selfie preview state to offer explicit “Save to Memories” and “Retake” actions, and show a centered success notification when saving.

**Planned changes:**
- In `frontend/src/components/MonthlyCompletionCelebrationModal.tsx`, replace the post-capture selfie preview primary action (“Take Selfie & Share”) with two buttons: “Save to Memories” and “Retake”.
- Adjust the selfie flow so capturing a selfie only produces the static preview; saving to monthly memories (via the existing localStorage save + `onMemorySaved` callback) happens only when “Save to Memories” is clicked.
- Implement “Retake” to clear the current preview and return to live camera mode, reusing the existing camera start + countdown capture flow.
- On “Save to Memories”, display `frontend/src/components/CenteredNotification.tsx` with the exact text “Successfully saved! 📸”, ensure it appears above the modal, and auto-dismiss after 5000ms.

**User-visible outcome:** After taking a selfie and seeing the preview in the Congrats modal, the user can choose to save it to Memories (and get a centered confirmation for 5 seconds) or retake the selfie before saving.
