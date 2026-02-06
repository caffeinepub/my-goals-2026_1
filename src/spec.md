# Specification

## Summary
**Goal:** Make the “Back to dashboard” button in the Yearly Summary header clearly visible and high-contrast so it doesn’t blend into the page background.

**Planned changes:**
- Update the “Back to dashboard” button styling in `frontend/src/components/YearlySummaryTable.tsx` to use a solid, high-contrast button treatment (background + contrasting text) using existing components and Tailwind classes.
- Ensure the button remains distinct and readable in both light and dark mode without changing its label or behavior.

**User-visible outcome:** In the Yearly Summary view, the “Back to dashboard” button is immediately noticeable and readable in light/dark mode, and still navigates back to the dashboard when clicked.
