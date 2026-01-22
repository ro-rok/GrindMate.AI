# Design System - GrindMate.AI

## Overview

This design system provides a comprehensive set of design tokens, motion utilities, and animation helpers for building the premium GrindMate.AI experience.

## Design Tokens

All design tokens are defined in `tokens.css` and available as CSS custom properties.

### Usage

```css
.my-component {
  background-color: var(--black-elevated);
  color: var(--text-primary);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  transition: all var(--duration-normal) var(--ease-out);
}
```

### Available Token Categories

- **Colors**: Base blacks, accents, grays, semantic colors
- **Typography**: Font sizes, weights, line heights
- **Spacing**: 8px-based scale from 4px to 96px
- **Border Radius**: sm, md, lg, xl, full
- **Shadows**: sm, md, lg, xl, 2xl, glow
- **Motion**: Durations and easing curves

## Motion Utilities

### useReducedMotion Hook

Detects user's motion preference:

```jsx
import { useReducedMotion } from '../hooks/useReducedMotion';

function MyComponent() {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <div className={prefersReducedMotion ? 'no-animation' : 'with-animation'}>
      Content
    </div>
  );
}
```

### Motion Helpers

```javascript
import { 
  motionVariants, 
  motionTransitions, 
  getTransition,
  staggerChildren 
} from '../utils/motion';

// Use predefined variants
<motion.div variants={motionVariants.fadeInUp} />

// Use predefined transitions
<motion.div transition={motionTransitions.normal} />

// Get transition with reduced motion support
<motion.div transition={getTransition(motionTransitions.slow)} />

// Stagger children
<motion.div animate={{ ... }} transition={staggerChildren(0.05)} />
```

## Framer Motion Integration

### Basic Animation

```jsx
import { motion } from 'framer-motion';
import { motionVariants, getTransition, motionTransitions } from '../utils/motion';

function MyComponent() {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={motionVariants.fadeInUp}
      transition={getTransition(motionTransitions.normal)}
    >
      Content
    </motion.div>
  );
}
```

### Stagger Children

```jsx
<motion.ul
  initial="initial"
  animate="animate"
  variants={{
    animate: { transition: staggerChildren(0.05) }
  }}
>
  {items.map(item => (
    <motion.li key={item.id} variants={motionVariants.fadeInUp}>
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

## GSAP Integration

### Basic Scroll Animation

```javascript
import { fadeInOnScroll, staggerFadeInOnScroll } from '../utils/gsap';

useEffect(() => {
  // Single element
  fadeInOnScroll('.my-element');
  
  // Multiple elements with stagger
  staggerFadeInOnScroll('.my-list-item');
}, []);
```

### Custom Timeline

```javascript
import { createTimeline, gsap } from '../utils/gsap';

useEffect(() => {
  const tl = createTimeline();
  
  tl.from('.hero-title', { opacity: 0, y: 30, duration: 0.6 })
    .from('.hero-subtitle', { opacity: 0, y: 20, duration: 0.6 }, '-=0.3')
    .from('.hero-cta', { opacity: 0, scale: 0.95, duration: 0.4 });
    
  return () => tl.kill();
}, []);
```

## Lenis Smooth Scroll

Lenis is automatically initialized in `main.jsx` via the `LenisProvider`. It respects the user's reduced motion preference.

### Programmatic Scrolling

```javascript
// Access Lenis instance if needed
import Lenis from 'lenis';

// Scroll to element
lenis.scrollTo('#target-element', {
  offset: 0,
  duration: 1.2,
});

// Scroll to top
lenis.scrollTo(0);
```

## Accessibility

### Reduced Motion Support

All animations automatically respect `prefers-reduced-motion`:

- CSS animations are disabled via media query in `tokens.css`
- JavaScript animations use `getTransition()` and `getGSAPConfig()` helpers
- Lenis smooth scroll is disabled
- All motion utilities check the preference

### Focus Indicators

Focus indicators are styled globally in `index.css`:

```css
*:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

## Best Practices

1. **Always use design tokens** instead of hardcoded values
2. **Use motion utilities** to ensure reduced motion support
3. **Prefer transform and opacity** for animations (GPU-accelerated)
4. **Avoid animating layout properties** (width, height, top, left)
5. **Use `will-change` sparingly** and only during active animations
6. **Test with reduced motion enabled** to ensure accessibility
7. **Keep animations subtle** - purpose over decoration

## Performance

- All animations use GPU-accelerated properties (transform, opacity)
- Lenis uses `requestAnimationFrame` for smooth 60fps scrolling
- GSAP is optimized for performance with minimal reflows
- Framer Motion uses hardware acceleration by default
