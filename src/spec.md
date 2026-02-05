# Specification

## Summary
**Goal:** Update the “Time-Bound targets - 2026” 100% completion congrats modal to use the uploaded selfieGirl image as the default celebration photo when the user has not selected their own photo.

**Planned changes:**
- Add the provided selfie image file to `frontend/public/assets/generated` with the specified filename.
- Update `DEFAULT_CELEBRATION_IMAGE` in `frontend/src/components/MonthlyCompletionCelebrationModal.tsx` to reference the new static asset path.
- Keep existing behavior so a user-captured/uploaded photo continues to replace the default image when present.

**User-visible outcome:** When opening the completion celebration modal without having captured/uploaded a photo, users see the provided selfieGirl image as the default preview under “Want to celebrate with a selfie?”.
