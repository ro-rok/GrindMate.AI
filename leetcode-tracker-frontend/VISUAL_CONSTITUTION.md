# Visual Constitution - GrindMate.AI

**Version 1.0** | Last Updated: January 2025

This document defines the design system principles, tokens, and rules that govern every visual decision in GrindMate.AI. It serves as the single source of truth for design consistency.

---

## Type System

### Font Family
- **Primary**: `Inter` (with system font stack fallback)
- **Monospace**: `Courier New`, `monospace` (for code)
- **Fallback**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### Font Sizes (Fluid Scale)
- **xs**: `clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)` - 12-14px
- **sm**: `clamp(0.875rem, 0.8rem + 0.375vw, 1rem)` - 14-16px
- **base**: `clamp(1rem, 0.9rem + 0.5vw, 1.125rem)` - 16-18px
- **lg**: `clamp(1.125rem, 1rem + 0.625vw, 1.25rem)` - 18-20px
- **xl**: `clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)` - 20-24px
- **2xl**: `clamp(1.5rem, 1.3rem + 1vw, 2rem)` - 24-32px
- **3xl**: `clamp(1.875rem, 1.6rem + 1.375vw, 2.5rem)` - 30-40px
- **4xl**: `clamp(2.25rem, 1.9rem + 1.75vw, 3rem)` - 36-48px

### Font Weights
- **normal**: `400` - Body text, descriptions
- **medium**: `500` - Labels, metadata
- **semibold**: `600` - Headings, emphasis
- **bold**: `700` - Primary headings, CTAs

### Line Heights
- **tight**: `1.25` - Headings, single-line text
- **snug**: `1.375` - Compact paragraphs
- **normal**: `1.5` - Body text (default)
- **relaxed**: `1.625` - Long-form content

---

## Spacing & Grid

### 8pt Grid System
All spacing must align to multiples of 8px (0.5rem base unit).

### Spacing Scale
- **0**: `0px` - No spacing
- **0.5**: `2px` - Minimal gap
- **1**: `4px` - Tight spacing
- **1.5**: `6px` - Compact spacing
- **2**: `8px` - Base unit
- **2.5**: `10px` - Slight offset
- **3**: `12px` - Small gap
- **3.5**: `14px` - Medium-small gap
- **4**: `16px` - Standard gap
- **5**: `20px` - Medium gap
- **6**: `24px` - Large gap
- **8**: `32px` - Extra large gap
- **10**: `40px` - Section spacing
- **12**: `48px` - Major section spacing
- **16**: `64px` - Page-level spacing
- **20**: `80px` - Hero spacing
- **24**: `96px` - Maximum spacing

### Max Widths (Container)
- **Page**: `1280px` (7xl)
- **Content**: `1024px` (xl)
- **Narrow**: `768px` (md)
- **Form**: `640px` (sm)

---

## Surface Hierarchy

### Background Layers (Graphite Base)
- **base**: `#0f0f0f` - Root background (not pure black)
- **surface**: `#141414` - Primary surface (cards, panels)
- **surface-2**: `#1a1a1a` - Elevated surface (hover states, nested cards)
- **elevated**: `#1f1f1f` - Highest surface (modals, dropdowns)

### Usage Rules
- **base**: Only for body/html background
- **surface**: Default card/panel background
- **surface-2**: Hover states, nested containers
- **elevated**: Floating elements (modals, tooltips, dropdowns)

---

## Brand & Accents

### Primary Accent (Sky Blue)
- **Color**: `#0ea5e9` (sky-500)
- **Hover**: `#0284c7` (sky-600)
- **Light**: `rgba(14, 165, 233, 0.1)` - Background tints
- **Dark**: `#0369a1` (sky-700) - Pressed states

**Usage**: Primary CTAs, links, focus states, active indicators

### Secondary Accent (Purple)
- **Color**: `#8b5cf6` (violet-500)
- **Hover**: `#7c3aed` (violet-600)

**Usage**: Sparingly - special features, highlights, gradients

### Semantic Colors
- **Success**: `#10b981` (green-500) - Completed, solved, positive actions
- **Warning**: `#f59e0b` (amber-500) - Caution, in-progress
- **Danger**: `#ef4444` (red-500) - Errors, destructive actions
- **Info**: Same as primary accent

---

## Borders

### Border Hierarchy (Opacity-Based)
- **subtle**: `rgba(255, 255, 255, 0.05)` - Default borders, dividers
- **default**: `rgba(255, 255, 255, 0.08)` - Card borders, inputs
- **emphasis**: `rgba(255, 255, 255, 0.12)` - Hover states, active borders
- **brand**: `rgba(14, 165, 233, 0.3)` - Focus rings, active states
- **success**: `rgba(16, 185, 129, 0.3)` - Success states
- **warning**: `rgba(245, 158, 11, 0.3)` - Warning states
- **danger**: `rgba(239, 68, 68, 0.3)` - Error states

### Border Widths
- **Default**: `1px`
- **Thick**: `2px` (focus rings only)

### Border Radius
- **sm**: `8px` - Small elements (badges, pills)
- **md**: `12px` - Default (cards, inputs, buttons)
- **lg**: `16px` - Large cards, modals
- **xl**: `20px` - Hero sections, major containers
- **full**: `9999px` - Pills, avatars

---

## Shadows & Glows

### Elevation Scale (Ambient Shadows)
- **elevation-1**: `0 1px 3px 0 rgba(0, 0, 0, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.1)` - Cards
- **elevation-2**: `0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -1px rgba(0, 0, 0, 0.1)` - Hover cards
- **elevation-3**: `0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)` - Modals
- **elevation-4**: `0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)` - Dropdowns

### Glow Tokens (Use with Restraint)
- **glow-brand**: `0 0 20px rgba(14, 165, 233, 0.2)` - Focus rings, active states
- **glow-brand-strong**: `0 0 20px rgba(14, 165, 233, 0.3)` - Special emphasis (rare)
- **glow-success**: `0 0 12px rgba(16, 185, 129, 0.15)` - Success feedback
- **glow-warning**: `0 0 12px rgba(245, 158, 11, 0.15)` - Warning feedback
- **glow-danger**: `0 0 12px rgba(239, 68, 68, 0.15)` - Error feedback

### Focus Ring
- **Standard**: `0 0 0 2px var(--accent-primary), 0 0 0 4px rgba(14, 165, 233, 0.2)`
- Always visible on keyboard focus
- Never remove or reduce for accessibility

---

## Glass Morphism

### Glass Surfaces
- **Background**: `rgba(20, 20, 20, 0.6)` - Translucent surface
- **Hover**: `rgba(26, 26, 26, 0.7)` - Slightly more opaque
- **Border**: `rgba(255, 255, 255, 0.08)` - Subtle border
- **Border Hover**: `rgba(255, 255, 255, 0.12)` - More visible on hover
- **Blur**: `blur(12px)` - Backdrop filter

**Usage**: Navigation bars, floating panels, overlays

---

## Gradients

### Brand Gradients
- **Primary**: `linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)` - CTAs, highlights
- **Subtle**: `linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(2, 132, 199, 0.05) 100%)` - Backgrounds

### Mesh Gradient (Background)
- **Radial overlays**: Multiple radial gradients creating depth
- **Opacity**: 0.04-0.08 (very subtle)
- **Colors**: Primary blue, secondary purple, success green

### Surface Gradients
- **Default**: `linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%)`
- **Hover**: `linear-gradient(180deg, var(--bg-surface-2) 0%, var(--bg-surface) 100%)`

---

## Motion

### Durations
- **instant**: `100ms` - Immediate feedback (hover states)
- **fast**: `200ms` - Quick transitions (color changes)
- **normal**: `300ms` - Standard transitions (opacity, transform)
- **slow**: `400ms` - Deliberate animations (page transitions)
- **slower**: `600ms` - Complex animations (shared element transitions)

### Easing Curves
- **ease-in**: `cubic-bezier(0.4, 0, 1, 1)` - Decelerating
- **ease-out**: `cubic-bezier(0, 0, 0.2, 1)` - Accelerating (default)
- **ease-in-out**: `cubic-bezier(0.4, 0, 0.2, 1)` - Smooth transitions
- **bounce**: `cubic-bezier(0.68, -0.55, 0.265, 1.55)` - Playful (rare)
- **elastic**: `cubic-bezier(0.68, -0.6, 0.32, 1.6)` - Spring-like (rare)

### What Animates
- ✅ Hover states (scale, translateY, opacity)
- ✅ Focus states (ring glow, border)
- ✅ Page transitions (fade, scale)
- ✅ Shared element transitions (layoutId)
- ✅ Loading states (skeleton, spinner)
- ✅ Modal/drawer entrances
- ✅ List item appearances (stagger)

### What Never Animates
- ❌ Text content changes
- ❌ Critical error states
- ❌ Form validation errors (instant)
- ❌ Navigation route changes (unless shared element)
- ❌ System notifications (toasts)

### Reduced Motion
- **Always respect** `prefers-reduced-motion: reduce`
- **Fallback**: Instant transitions (0.01ms) or no animation
- **Test**: Enable in system settings and verify

---

## Noise & Texture

### Noise Texture
- **Opacity**: `0.015` (very subtle)
- **Size**: `200px` repeating pattern
- **Purpose**: Add depth without distraction

### Vignette
- **Opacity**: `0.3` (subtle darkening at edges)
- **Size**: `80%` (center remains bright)
- **Purpose**: Focus attention to center

### Radial Glow
- **Color**: Primary accent (sky blue)
- **Opacity**: `0.15` (subtle)
- **Size**: `60%` (centered)
- **Purpose**: Subtle brand presence

---

## Component-Specific Rules

### Cards
- Default: `surface` background, `subtle` border, `elevation-1` shadow
- Hover: `surface-2` background, `default` border, `elevation-2` shadow, `-2px` translateY
- Glass variant: Use glass morphism tokens

### Buttons
- Primary: Brand gradient or solid primary color
- Secondary: Surface background with border
- Ghost: Transparent, border on hover
- Focus: Always show focus ring glow
- Loading: Spinner with `aria-busy`

### Inputs
- Default: Surface background, default border
- Focus: Primary border, glow ring
- Error: Danger border, danger glow
- Clear button: Visible when value exists

### Badges/Pills
- Use semantic colors for difficulty/status
- Tier badges: Gradient backgrounds (S: yellow, A: blue, Q: purple, IN: green)
- Size: `sm` for inline, `md` for standalone

---

## Accessibility

### Color Contrast
- **Text Primary**: WCAG AA minimum (4.5:1)
- **Text Secondary**: WCAG AA minimum
- **Interactive Elements**: WCAG AA minimum

### Focus States
- **Always visible** on keyboard navigation
- **Never remove** focus indicators
- **Use glow ring** for primary focus

### Keyboard Navigation
- **Tab order**: Logical, sequential
- **Skip links**: For main content
- **Shortcuts**: Documented, non-conflicting

### Screen Readers
- **ARIA labels**: Where needed
- **Semantic HTML**: Use proper elements
- **Live regions**: For dynamic content

---

## Implementation Notes

1. **All values** must use CSS variables from `tokens.css`
2. **No magic numbers** - use spacing/radius tokens
3. **Consistent motion** - use duration/easing tokens
4. **Test reduced motion** - verify fallbacks work
5. **Performance** - avoid expensive animations (box-shadow changes, etc.)

---

## Version History

- **v1.0** (January 2025): Initial Visual Constitution
