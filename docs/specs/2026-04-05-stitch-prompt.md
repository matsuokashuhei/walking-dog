# Google Stitch Prompts — Walking Dog UI Redesign

Reference spec: `docs/specs/2026-04-05-ui-redesign-design-system.md`

---

## Part A: Vibe Design Prompt

> Paste this first in Stitch's **Vibe Design** mode to establish brand direction.

```
Design a dog walking tracker app called "Walking Dog".

Brand direction: Notion-inspired monochrome. The visual identity is built entirely through typography, whitespace, and proportion — not color. No accent colors. Black, white, and grays only.

Mood: Clean, editorial, spacious. This is a refined productivity tool that happens to be about dogs. Avoid anything cute, playful, or colorful. Think Notion or Linear — confident, minimal, elegant.

Design system constraints:
- Color palette: #FFFFFF background, #1A1A1A text, #F7F7F7 surface, #E5E5E5 borders, #6B6B6B secondary text
- Typography: System font (San Francisco on iOS / Roboto on Android). Strong typographic hierarchy.
- Border radius: Subtle — 12px for cards and inputs, 16px for modals
- Spacing: Generous. Breathable layouts. Nothing feels cramped.
- No shadows except very subtle elevation for cards (1px border instead of shadow)
- Interactive elements: Black filled buttons with white text (primary), outlined buttons (secondary)
- List items: Clean rows with thin border separators, no cards
```

---

## Part B: Multi-Screen Prompt

> Use this after Vibe Design is accepted. Generate **4 screens at once**.

```
Generate 4 screens for the Walking Dog app using the monochrome design system established. All screens must be consistent — same typography scale, spacing, and color palette.

Platform: iOS mobile (375pt wide)
Mode: Light mode only

---

SCREEN 1: Home — Walk History

Purpose: Shows a chronological list of completed walks.

Content:
- Navigation title: "Walks" (large, bold, left-aligned)
- List of walk history items, each showing:
  - Date: "Tuesday, Mar 25" (primary text, medium weight)
  - Dog names: "Moka & Kona" (secondary text, caption size)
  - Duration: "42 min" and Distance: "2.8 km" (inline, secondary text)
  - Walker avatar (small circle, 24px) + name "Sarah" for shared walks
- Items separated by thin hairline dividers (no card borders)
- Empty state (when no walks): centered text "No walks yet. Start your first walk."

Use this dummy data:
- Walk 1: Mar 25, Moka & Kona, 42 min, 2.8 km, walker: Sarah
- Walk 2: Mar 23, Moka, 28 min, 1.9 km (no walker shown)
- Walk 3: Mar 20, Kona, 35 min, 2.3 km, walker: James

---

SCREEN 2: Walk Recording (Active Walk)

Purpose: The live recording screen during a walk.

Content:
- Full-width map (top 60% of screen) showing:
  - A route polyline in dark gray
  - Current location indicator
  - Small badge: "● REC" in top-left corner of map (dark background, white text, pill shape)
- Bottom panel (white surface) containing:
  - Two large stats side-by-side: "28:14" (time elapsed) and "1.9 km" (distance)
  - Stats labels below in caption text: "Duration" and "Distance"
  - Selected dogs: "Moka, Kona" in small text above stats
  - Stop button: large circle (72px), black background, white square icon inside, centered below stats
  - "Stop Walk" caption text below the button

---

SCREEN 3: Dog Detail

Purpose: Profile page for a single dog.

Content:
- Back button (top left)
- Large circular dog photo (160px) centered at top, with thin 1px border
- Name: "Moka" (h1 size, centered, bold)
- Breed: "Shiba Inu" (secondary text, centered, caption)
- Stats card (3 columns, separated by thin vertical dividers):
  - "24" Walks
  - "48.2 km" Distance  
  - "18h 30m" Duration
  - Each stat: large bold number (primary color = black), label below in caption
- Section: "Family Members" (uppercase caption label, letter-spaced)
- Member list:
  - Row 1: avatar circle "S", "Sarah Chen", role: "Owner" — no action button
  - Row 2: avatar circle "J", "James Park", role: "Member" — "Remove" text button (secondary text color, right-aligned)
- Bottom actions: "Edit" (outlined button, full-width) and below it "Delete Dog" (text-only button, secondary text, centered)

---

SCREEN 4: Settings

Purpose: Account and app preferences.

Content:
- Navigation title: "Settings" (large, bold)
- Section: "PROFILE" (uppercase, caption, letter-spaced, secondary text)
  - Row: "Display Name" label left, "matsuoka" value right with edit icon
- Section: "DOGS" (same style as above)
  - Dog row: dog emoji or icon, "Moka", "Shiba Inu", chevron right
  - Dog row: dog emoji or icon, "Kona", "Labrador", chevron right
- Section: "APPEARANCE" (same style)
  - Segmented control: "Light | Dark | Auto" — "Light" selected
  - Row: "Language", "English", chevron right
- "Log Out" button — full width, outlined, destructive (use secondary text color, not red — monochrome only)
- App version: "Version 1.0.0" centered at bottom in caption text

All section labels are uppercase, letter-spacing 0.5, secondary text color.
All rows are 52px tall with hairline bottom borders.
```

---

## Part C: Follow-Up Prompts

> Use these in subsequent sessions to complete the remaining screens.

### Remaining Screens (Session 2)

```
Generate 3 more screens for the Walking Dog app. Keep the same monochrome design system: #FFFFFF background, #1A1A1A text, system font, generous whitespace, no accent colors.

SCREEN 1: Dog List (Tab)
- Title: "Dogs"
- FlatList of dog cards (each: circular photo 56px, name bold, breed caption, chevron)
- Floating action button: black circle (56px), white "+" in center, bottom-right corner
- Empty state: "No dogs yet. Add your first dog."

SCREEN 2: Login
- Centered layout with vertical padding
- App name: "Walking Dog" (h1, bold, centered)
- Subtitle: "Track every walk together" (secondary text, centered)
- Email input field (labeled "Email")
- Password input field (labeled "Password")  
- Primary button: "Sign In" (full-width, black)
- Secondary text link below: "Don't have an account? Register"

SCREEN 3: Invite Acceptance
- Centered layout (full screen, vertical center)
- Icon or illustration area (keep it minimal — a simple circle or geometric mark)
- Title: "You're invited!" (h2, centered)
- Description: "Sarah Chen invited you to follow Moka." (body text, centered, secondary)
- Primary button: "Accept Invitation" (full-width, black)
- Secondary text: "Decline" (centered, secondary text, below button)
```

### Dark Mode (Session 3)

```
Regenerate the Home screen and Dog Detail screen in dark mode.

Dark mode colors:
- Background: #111111
- Surface: #1E1E1E
- Border: #2E2E2E
- Primary text: #F0F0F0
- Secondary text: #9A9A9A

Keep all layout, spacing, and typography identical to the light mode versions. Only change colors.
```

---

## Tips for Using Stitch

1. **Start with Part A** (Vibe Design) and confirm the brand direction before generating screens
2. **Part B** generates all 4 screens at once — use Multi-screen mode
3. If Stitch adds accent colors (blue, green, etc.), explicitly say: "Remove all accent colors. Use only black, white, and grays."
4. If the result is too playful, add: "Make it more editorial and typographic. Think Notion, not a consumer app."
5. Save approved designs before starting follow-up sessions
