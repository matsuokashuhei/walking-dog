# Design System Strategy: The Editorial Archive

### 1. Overview & Creative North Star
This design system is built on the Creative North Star of **"The Editorial Archive."** We are moving away from the "friendly pet app" trope and toward a high-end, data-centric productivity tool. Our goal is to treat dog walking data—trajectories, health metrics, and scheduling—with the same aesthetic rigor as a financial terminal or a premium architectural journal.

By leveraging a monochrome palette and an uncompromising grid, we create a sense of authority and calm. We break the "template" look through intentional asymmetry: heavy-weighted headers paired with wide-open whitespace and a "nested" layout architecture that favors tonal depth over structural clutter.

---

### 2. Colors & Surface Architecture
The palette is strictly grayscale, relying on the interplay between light and shadow (achieved through surface shifts) rather than hue.

*   **Primary (`#000000`) & Background (`#fcf9f8`):** These define our highest contrast points. Use Background for the primary canvas and Primary for high-impact text and functional CTA foundations.
*   **The "No-Line" Rule:** To achieve a premium feel, avoid using 1px lines to section off large areas of the screen. Instead, define sections through background color shifts. A `surface-container-low` section sitting against a `surface` background creates a sophisticated boundary that feels "built-in" rather than "drawn-on."
*   **Surface Hierarchy & Nesting:** Treat the UI as layers of fine paper.
    *   **Level 0 (Base):** `surface` or `surface-bright` for the main page background.
    *   **Level 1 (Sections):** `surface-container-low` for large content blocks or sidebars.
    *   **Level 2 (Cards):** `surface-container-lowest` (pure white) for interactive elements to make them "pop" against the off-white background.
*   **Signature Textures:** For primary action buttons or significant hero sections, use a subtle gradient transition from `primary` (#000000) to `primary-container` (#3c3b3b). This prevents the black from feeling "dead" on OLED screens and adds a tactile, ink-like depth.

---

### 3. Typography: The Editorial Voice
We use **Inter** as our system font, but we style it to feel like a custom typeface through extreme scale and weight contrast.

*   **Display & Headlines:** Use `display-md` or `headline-lg` for daily summaries (e.g., "12.4km Walked Today"). Keep letter-spacing at -0.02em for headers to give them a "compacted" editorial feel.
*   **Titles & Body:** Use `title-sm` for card headings and `body-md` for general information. Typography is our primary tool for hierarchy; a `label-sm` in all-caps with increased letter-spacing (+0.05em) should be used for metadata (e.g., "TIMESTAMP," "HEART RATE").
*   **Hierarchy via Tone:** Secondary information should never just be smaller; it should be shifted to `on-surface-variant` (#474747). This creates a visual "recession" in the layout, allowing the primary data to lead the eye.

---

### 4. Elevation & Depth: Tonal Layering
In this design system, we do not use traditional drop shadows. We convey importance and "lift" through Tonal Layering and the "Ghost Border."

*   **The Layering Principle:** Depth is achieved by stacking. A `surface-container-highest` modal should sit atop a `surface-dim` backdrop blur. This mimics the way light hits physical objects without the "fuzziness" of a shadow.
*   **The "Ghost Border":** While the user requested 1px borders for elevation, we must apply them with surgical precision. Use the `outline-variant` (#c6c6c6) but reduce its opacity to 20-40% in your design tool. It should be a suggestion of a boundary, not a hard cage. 
*   **Glassmorphism & Depth:** For floating navigation or mobile headers, use a `surface` color at 80% opacity with a high `backdrop-blur` (20px+). This allows the content (like map paths or walk logs) to bleed through, making the interface feel integrated and airy.

---

### 5. Components
Each component must feel like a tool, not a toy. 

*   **Buttons**: 
    *   **Primary**: Solid `primary` (black) with `on-primary` (white) text. 12px radius. No shadow.
    *   **Secondary**: Outlined using `outline` token at 100% opacity. This is the only place where a high-contrast border is encouraged.
*   **Cards & Lists**: Strictly forbid the use of divider lines between list items. Instead, use 16px to 24px of vertical whitespace (Gap) to separate dog walking logs. If separation is visually required, use a subtle background shift to `surface-container-low` on hover.
*   **Checkboxes & Radio Buttons**: Use sharp, high-contrast states. An unchecked state is a 1px `outline` box; a checked state is a solid `primary` fill with a white "check" or "dot."
*   **Input Fields**: Use `surface-container-lowest` as the fill color with a 12px radius. The label should be `label-md` placed 8px above the input, never inside it, to maintain a clean editorial verticality.
*   **The "Walk Tracker" Map Container**: In the context of a dog walking app, the map is your most complex asset. Frame it in a 16px radius container with a 1px `outline-variant` border. Use monochrome map tiles (Stamen Toner or Mapbox Dark/Light) to match the system.

---

### 6. Do's and Don'ts

**Do:**
*   **Do** use asymmetrical margins. For example, give a header a 40px left margin and an 80px right margin to create "breathing room" that feels intentional.
*   **Do** use "ink-traps" and tight leading in headers.
*   **Do** rely on the Spacing Scale (8px, 16px, 24px, 32px, 48px, 64px) to define relationships between elements.

**Don't:**
*   **Don't** use icons that are "cutesy" or rounded. Use thin-stroke (1px or 1.5px) functional icons with sharp or slightly blunted corners.
*   **Don't** use any color accents for "Success" states. Use a solid black checkmark or a bold weight shift instead. (Error states may use `error` #ba1a1a sparingly).
*   **Don't** use standard 100% opaque gray borders for every container. It creates "grid-lock" and makes the app look like a spreadsheet rather than a premium experience.