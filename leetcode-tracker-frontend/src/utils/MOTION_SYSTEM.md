# Premium Motion System Documentation

## Overview

GrindMate.AI uses a comprehensive motion system that combines three powerful animation libraries:

1. **Lenis** - Smooth scrolling with inertia
2. **GSAP** - Scroll-triggered animations and complex timelines
3. **Framer Motion** - React component animations and page transitions

All animations respect the user's `prefers-reduced-motion` preference for accessibility.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Motion System                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    Lenis     │  │     GSAP     │  │Framer Motion │ │
│  │              │  │              │  │              │ │
│  │ • Smooth     │  │ • Scroll     │  │ • Component  │ │
│  │   scroll     │  │   triggers   │  │   animations │ │
│  │ • Inertia    │  │ • Timelines  │  │ • Page       │ │
│  │ • Easing     │  │ • Counters   │  │   transitions│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Reduced Motion Support                     │ │
│  │  • Disables Lenis inertia                         │ │
│  │  • Reduces animation durations to ~0              │ │
│  │  • Disables complex animations                    │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. Lenis (Smooth Scrolling)

**Location**: `src/components/LenisProvider.jsx`

**Usage**:
```jsx
// Already initialized in main.jsx
<LenisProvider>
  <App />
</LenisProvider>
```

**Configuration**:
- Duration: 1.2s (0s with reduced motion)
- Easing: Custom exponential easing
- Smooth: Enabled (disabled with reduced motion)
- Touch: Disabled for better mobile performance

### 2. GSAP (Scroll Animations)

**Location**: `src/utils/gsap.js`

**Available Functions**:

#### `fadeInOnScroll(target, options)`
Fades in element as it enters viewport.

```jsx
import { fadeInOnScroll } from '../utils/gsap';

useEffect(() => {
  fadeInOnScroll('.my-element', {
    y: 50,
    duration: 0.8,
  });
}, []);
```

#### `staggerFadeInOnScroll(target, options)`
Fades in multiple elements with stagger effect.

```jsx
staggerFadeInOnScroll('.card', {
  stagger: 0.1,
  y: 30,
});
```

#### `scaleInOnScroll(target, options)`
Scales in element from 95% to 100%.

```jsx
scaleInOnScroll('.hero-card');
```

#### `slideInOnScroll(target, direction, options)`
Slides in element from specified direction.

```jsx
slideInOnScroll('.sidebar', 'left');
slideInOnScroll('.content', 'right');
```

#### `revealOnScroll(target, options)`
Reveals element with clip-path animation.

```jsx
revealOnScroll('.image-container');
```

#### `counterAnimation(target, endValue, options)`
Animates number from 0 to endValue.

```jsx
counterAnimation('.counter', 100);
```

#### `createTimeline(options)`
Creates GSAP timeline for complex sequences.

```jsx
const tl = createTimeline();
tl.from('.element1', { opacity: 0 })
  .from('.element2', { x: -50 })
  .from('.element3', { scale: 0.5 });
```

### 3. Framer Motion (Component Animations)

**Location**: `src/utils/motion.js`

**Motion Variants**:

```jsx
import { motionVariants, motionTransitions } from '../utils/motion';

<motion.div
  initial="initial"
  animate="animate"
  variants={motionVariants.fadeInUp}
  transition={motionTransitions.normal}
>
  Content
</motion.div>
```

**Available Variants**:
- `fadeIn` - Simple fade
- `fadeInUp` - Fade with slide up
- `fadeInDown` - Fade with slide down
- `scaleIn` - Fade with scale
- `slideInRight` - Slide from right
- `slideInLeft` - Slide from left

**Transition Presets**:
- `instant` - 0.1s
- `fast` - 0.2s
- `normal` - 0.3s (recommended)
- `slow` - 0.4s
- `slower` - 0.6s
- `bounce` - Bouncy easing
- `elastic` - Elastic easing

### 4. Page Transitions

**Location**: `src/components/animations/PageTransition.jsx`

**Usage**:
```jsx
import PageTransition from '../components/animations/PageTransition';

<PageTransition mode="fadeScale">
  <YourPageContent />
</PageTransition>
```

**Modes**:
- `fade` - Simple fade (200ms)
- `fadeScale` - Fade with scale (300ms)
- `slideUp` - Slide up transition
- `slideRight` - Slide right transition

### 5. Stagger Lists

**Location**: `src/components/animations/StaggerList.jsx`

**Usage**:
```jsx
import StaggerList from '../components/animations/StaggerList';

<StaggerList staggerDelay={0.05}>
  {items.map(item => (
    <Card key={item.id}>{item.name}</Card>
  ))}
</StaggerList>
```

## Reduced Motion Support

The motion system automatically detects and respects the user's `prefers-reduced-motion` preference.

**Hook**:
```jsx
import { useReducedMotion } from '../hooks/useReducedMotion';

const prefersReducedMotion = useReducedMotion();

if (prefersReducedMotion) {
  // Skip animations or use instant transitions
}
```

**Automatic Handling**:
- Lenis: Disables smooth scrolling and inertia
- GSAP: Reduces durations to 0.01s
- Framer Motion: Returns empty variants

## Best Practices

### 1. Use Appropriate Animation Types

- **Page loads**: Use GSAP `fadeInOnScroll` for hero sections
- **Lists**: Use `StaggerList` or `staggerFadeInOnScroll`
- **Page transitions**: Use `PageTransition` component
- **Interactive elements**: Use Framer Motion `whileHover` and `whileTap`

### 2. Performance

- Keep animations under 0.6s duration
- Use `will-change` CSS property sparingly
- Avoid animating expensive properties (width, height)
- Prefer `transform` and `opacity`

### 3. Accessibility

- Always check `prefersReducedMotion`
- Provide instant alternatives for critical interactions
- Don't rely solely on animation to convey information

### 4. Cleanup

```jsx
useEffect(() => {
  const animation = fadeInOnScroll('.element');
  
  return () => {
    animation.kill(); // Clean up GSAP animations
  };
}, []);
```

## Examples

### Example 1: Animated Page Component

```jsx
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { fadeInOnScroll, staggerFadeInOnScroll } from '../utils/gsap';
import { motionVariants, motionTransitions } from '../utils/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

function MyPage() {
  const heroRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    fadeInOnScroll(heroRef.current, { y: 50, duration: 0.8 });
    staggerFadeInOnScroll('.card', { stagger: 0.1 });
  }, [prefersReducedMotion]);

  return (
    <div>
      <motion.div
        ref={heroRef}
        initial="initial"
        animate="animate"
        variants={motionVariants.fadeInUp}
        transition={motionTransitions.normal}
      >
        <h1>Hero Section</h1>
      </motion.div>

      <div className="grid">
        {items.map(item => (
          <div key={item.id} className="card">
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Example 2: Interactive Card

```jsx
import { motion } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

function InteractiveCard({ children }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -8 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="card"
    >
      {children}
    </motion.div>
  );
}
```

### Example 3: Complex Timeline

```jsx
import { useEffect } from 'react';
import { createTimeline } from '../utils/gsap';
import { useReducedMotion } from '../hooks/useReducedMotion';

function AnimatedSequence() {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const tl = createTimeline();
    
    tl.from('.title', { opacity: 0, y: 30, duration: 0.6 })
      .from('.subtitle', { opacity: 0, y: 20, duration: 0.4 }, '-=0.2')
      .from('.button', { opacity: 0, scale: 0.8, duration: 0.3 }, '-=0.1');

    return () => tl.kill();
  }, [prefersReducedMotion]);

  return (
    <div>
      <h1 className="title">Title</h1>
      <p className="subtitle">Subtitle</p>
      <button className="button">Click Me</button>
    </div>
  );
}
```

## Testing

A comprehensive motion demo page is available at `/motion-demo` (development only).

To test:
1. Navigate to `/motion-demo`
2. Scroll through all sections
3. Toggle reduced motion in browser settings
4. Verify all animations work correctly

## Performance Targets

- **60fps** during scroll and animations
- **Lighthouse Performance Score**: 90+
- **First Contentful Paint**: < 1.5s
- **Cumulative Layout Shift**: < 0.1

## Troubleshooting

### Animations not working

1. Check if `prefersReducedMotion` is enabled
2. Verify GSAP is initialized: `initGSAP()` in main.jsx
3. Check ScrollTrigger is registered
4. Ensure elements exist before animating

### Janky animations

1. Check for expensive CSS properties
2. Use `will-change` sparingly
3. Reduce animation complexity
4. Check for layout thrashing

### Memory leaks

1. Always clean up GSAP animations in useEffect cleanup
2. Kill ScrollTrigger instances on unmount
3. Remove event listeners

## Resources

- [Lenis Documentation](https://github.com/studio-freight/lenis)
- [GSAP Documentation](https://greensock.com/docs/)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Web Animations Performance](https://web.dev/animations/)
