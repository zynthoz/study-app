---
name: StudyForge
description: Sleek, deep tech dark mode study space with Outfit/Inter typography and soft glassmorphic panels.
colors:
  primary: "#8b5cf6"
  primary-light: "#c084fc"
  neutral-bg: "#080c14"
  neutral-surface: "rgba(17, 24, 39, 0.45)"
  neutral-ink: "#f3f4f6"
  neutral-muted: "#9ca3af"
typography:
  display:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "#7c3aed"
---

# Design System: StudyForge

## 1. Overview

**Creative North Star: "The Intellectual Nebula"**

StudyForge is designed as a focused, premium, and distraction-free dark study environment. Visually, it evokes the depth of a starry night sky using a dark background (#080c14) accented by glowing violet nebula clouds (brand purple colors) and glassmorphic card overlays that structure information without creating rigid walls. 

The interface explicitly rejects cluttered grids, flat white-label tables, and overly rounded cards (exceeding 12px) to prevent it from feeling like a basic SaaS template. Micro-animations and soft gradients should feel intentional and quiet, facilitating academic focus.

**Key Characteristics:**
- Dark Mode Void: Main background is deep void black (#080c14).
- Glassmorphism: Cards use blurred backgrounds (rgba(17, 24, 39, 0.45) with 20px blur) to float content elegantly.
- Clean Hierarchy: High weight contrast between Outfit display headers and Inter body text.

## 2. Colors

A deep void palette with a single vivid violet anchor that acts as the focal guide.

### Primary
- **Nebula Violet** (#8b5cf6): Used for primary action buttons, focused inputs, and highlighted active states.

### Secondary
- **Nebula Spark** (#c084fc): Used for active tags, tags, and inline text links.

### Neutral
- **Deep Void** (#080c14): The main application background.
- **Nebula Glass** (rgba(17, 24, 39, 0.45)): The default surface for cards and dashboard panels.
- **Star Ink** (#f3f4f6): The main body text color, providing high contrast and readability.
- **Cosmic Dust** (#9ca3af): Used for secondary labels, placeholders, and helper text.

**The Contrast Rule.** Text colors must maintain at least a 4.5:1 contrast ratio against the background. Text styling should not use low-contrast gray colors on card surfaces.

## 3. Typography

**Display Font:** Outfit (with sans-serif fallback)
**Body Font:** Inter (with sans-serif fallback)

**Character:** Modern display titles paired with a clean, highly legible body face that ensures comfortable reading during long study sessions.

### Hierarchy
- **Display** (bold, clamp(2rem, 5vw, 3.5rem), 1.2): Used for primary hero headers on dashboard and lobbies.
- **Headline** (bold, 1.75rem, 1.3): Used for main page section titles and modal headers.
- **Title** (semibold, 1.25rem, 1.4): Used for card titles and section headers.
- **Body** (normal, 1rem, 1.7): Used for all descriptive text, study notes, and exam questions. Body lines are capped at 75ch for optimal legibility.
- **Label** (medium, 0.875rem, normal): Used for tags, badges, input labels, and table headers.

**The Reading Length Rule.** Long-form generated study notes must be bounded to a max-width of 75ch to prevent scanning fatigue.

## 4. Elevation

The system is flat at rest, utilizing semi-transparent layered surfaces (`glass-card`) rather than heavy drop shadows to structure panels. Depth is created through border colors and background blur.

### Shadow Vocabulary
- **Ambient Low** (box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5)): Used on glass cards to lift them from the background void.

**The State Elevation Rule.** Shadows are response-only. Cards and buttons lift slightly (Y-translation -2px) and receive increased shadow blur only on hover.

## 5. Components

### Buttons
- **Shape:** Rounded corners (8px)
- **Primary:** Background (#8b5cf6), Text (#f3f4f6), Padding (10px 20px)
- **Hover / Focus:** Transition to background (#7c3aed) with transition-duration 200ms.

### Cards / Containers
- **Corner Style:** Rounded corners (12px)
- **Background:** Semi-transparent dark gray (rgba(17, 24, 39, 0.45))
- **Shadow Strategy:** Ambient Low shadow.
- **Border:** 1px solid border (rgba(255, 255, 255, 0.08))
- **Internal Padding:** 24px padding (`p-6`)

### Inputs / Fields
- **Style:** Semi-transparent dark gray (rgba(17, 24, 39, 0.5)), 1px solid border (rgba(255, 255, 255, 0.1)), rounded (12px)
- **Focus:** Border transitions to brand violet (rgba(167, 139, 250, 0.5)) with shadow ring (rgba(167, 139, 250, 0.2))

### Navigation
- **Style:** Sticky top nav with blur (16px), background (rgba(8, 12, 20, 0.65)), and border bottom 1px solid (rgba(255, 255, 255, 0.06)). Active routes are highlighted in brand violet.

## 6. Do's and Don'ts

### Do:
- **Do** wrap note text at 75ch to make reading easier.
- **Do** use native dialogs or absolute-positioned dropdowns outside overflow-hidden wrappers.
- **Do** preserve the deep void background (#080c14) for all main screens.

### Don't:
- **Don't** use overly rounded corners (exceeding 12px) on cards or panels.
- **Don't** use side-stripe borders as colored accents on cards.
- **Don't** use gradient text effects.
- **Don't** use saturated warm cream or sand backgrounds.
