# Specification

## Summary
**Goal:** In “Time-Bound targets - 2026” (Yearly Summary Table), update the 100% completion celebration modal so its UI, copy, emoji usage, and default media match the provided reference screenshots.

**Planned changes:**
- Adjust the celebration modal’s headline and body copy to match the reference screenshots exactly (including punctuation/ellipsis and emojis), while keeping the close (X) in the top-right.
- Update the modal media area to show a built-in default celebration image when no selfie has been selected yet, and switch to the user-selected selfie once provided.
- Ensure closing and reopening the modal resets the media back to the default image until a new selfie is selected.
- Add the default celebration image as a static asset under `frontend/public/assets/generated/` and reference it directly from the modal (client-only).

**User-visible outcome:** When a month reaches 100% completion, users see a celebration modal that matches the reference design and message, includes a default celebration image until they choose a selfie, and can be dismissed via the X or “Maybe Later” without disrupting the summary table.
