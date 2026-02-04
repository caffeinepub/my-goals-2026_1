# Specification

## Summary
**Goal:** Build a “My Goals : 2026” dashboard that matches the provided reference image, showing 7 color-coded goal cards in one horizontal row with interactive checkboxes.

**Planned changes:**
- Create a dashboard page titled **"My Goals : 2026"** with exactly **7 vertical cards** in a single left-to-right row, in this order and color families: Career-Professional (yellow), Personal Development (orange), Laboral-Job (red/salmon), Family and Sentimental (pink), Financial (purple), Health (blue), Academic-University (light green).
- Load and apply **Lora (italic)** font for all card titles and all goal item text.
- Inside each card, render a vertical list of goals with **dashed separators between each goal item**.
- Add checkbox-style controls per goal item to toggle **complete/incomplete** state with immediate UI updates and clear visual distinction.
- Enforce **no wrapping** for the card row; disable horizontal scrolling when there are **7 or fewer** cards, and enable horizontal scrolling only when there are **more than 7** cards.
- Add a button at the end of the row labeled **"See goals per month"**.

**User-visible outcome:** Users see a one-row, 7-card “My Goals : 2026” dashboard styled like the reference, can check/uncheck goals interactively, and can access a “See goals per month” button at the end of the row.
