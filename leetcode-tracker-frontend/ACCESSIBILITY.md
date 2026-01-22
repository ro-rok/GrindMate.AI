# Accessibility Implementation Guide

## Overview

GrindMate.AI follows WCAG 2.1 Level AA accessibility standards to ensure the application is usable by everyone, including users with disabilities.

## Implemented Accessibility Features

### 1. Keyboard Navigation

All interactive elements are keyboard accessible:

- **Tab Navigation**: All buttons, links, and form inputs can be accessed via Tab key
- **Enter/Space Activation**: Interactive cards and custom buttons respond to Enter and Space keys
- **Focus Indicators**: Visible focus rings on all interactive elements using `focus:ring-2` classes
- **Focus Trap**: Modals trap focus within the dialog and return focus on close
- **Skip Links**: Users can navigate efficiently through the interface

#### Keyboard Shortcuts

- `Tab`: Move to next focusable element
- `Shift + Tab`: Move to previous focusable element
- `Enter` or `Space`: Activate buttons and interactive cards
- `Escape`: Close modals and dialogs

### 2. ARIA Labels and Roles

Proper ARIA attributes are used throughout the application:

#### Buttons
```jsx
<Button aria-label="View questions for Company Name">
  View Questions
</Button>
```

#### Form Inputs
```jsx
<input
  id="email"
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby="email-error"
/>
```

#### Live Regions
```jsx
<div role="alert" aria-live="assertive">
  Error message
</div>

<div role="status" aria-live="polite">
  Loading...
</div>
```

#### Navigation
```jsx
<nav aria-label="Quick actions">
  <Button>Random Question</Button>
  <Button>Browse Companies</Button>
</nav>
```

#### Lists
```jsx
<div role="list" aria-label="Companies list">
  <div role="listitem">...</div>
</div>
```

#### Tabs
```jsx
<div role="tablist" aria-label="Authentication mode">
  <button role="tab" aria-selected={isActive} aria-controls="panel-id">
    Login
  </button>
</div>
```

#### Progress Bars
```jsx
<div
  role="progressbar"
  aria-valuenow={75}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Pattern progress"
>
  <div style={{ width: '75%' }} />
</div>
```

### 3. Semantic HTML

The application uses proper semantic HTML elements:

- `<header>` for page headers
- `<nav>` for navigation sections
- `<main>` for main content
- `<article>` for self-contained content
- `<section>` for thematic groupings
- `<button>` for interactive actions (not divs with onClick)
- `<a>` for navigation links
- Proper heading hierarchy (h1 → h2 → h3)

### 4. Form Accessibility

All forms follow accessibility best practices:

```jsx
<form>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? "email-error" : undefined}
    autoComplete="email"
  />
  {hasError && (
    <p id="email-error" role="alert">
      Please enter a valid email
    </p>
  )}
</form>
```

Features:
- Labels properly associated with inputs via `htmlFor` and `id`
- Error messages linked via `aria-describedby`
- Required fields marked with `aria-required`
- Invalid states indicated with `aria-invalid`
- Autocomplete attributes for better UX
- Error messages use `role="alert"` for screen reader announcements

### 5. Color Contrast

All text meets WCAG AA contrast requirements:

- **Primary text on dark background**: White (#ffffff) on Black (#0a0a0a) - 21:1 ratio
- **Secondary text**: Gray (#9ca3af) on Black - 7.5:1 ratio
- **Accent colors**: Blue (#0ea5e9) with sufficient contrast
- **Error states**: Red (#ef4444) with high contrast
- **Success states**: Green (#10b981) with high contrast

### 6. Reduced Motion Support

The application respects `prefers-reduced-motion` preference:

```jsx
const prefersReducedMotion = useReducedMotion();

// Disable animations for users who prefer reduced motion
const MotionDiv = prefersReducedMotion ? 'div' : motion.div;

// Disable Lenis smooth scrolling inertia
<LenisProvider options={{ 
  lerp: prefersReducedMotion ? 1 : 0.1 
}} />
```

When reduced motion is enabled:
- Animations are disabled or significantly reduced
- Smooth scrolling inertia is disabled
- Transitions are instant or very brief
- Motion effects are replaced with simple fades

### 7. Screen Reader Support

All decorative elements are hidden from screen readers:

```jsx
<svg aria-hidden="true">...</svg>
<div className="decorative-gradient" aria-hidden="true" />
```

Important content has descriptive labels:

```jsx
<div aria-label="7 questions for Google">
  <h3>Google</h3>
  <p>7 questions</p>
</div>
```

### 8. Focus Management

#### Modal Focus Trap

Modals implement proper focus management:

```jsx
useEffect(() => {
  if (!isOpen) return;

  const modalElement = document.querySelector('[role="dialog"]');
  const focusableElements = modalElement.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  // Focus first element
  firstElement?.focus();

  // Trap focus within modal
  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  document.addEventListener('keydown', handleTabKey);
  return () => document.removeEventListener('keydown', handleTabKey);
}, [isOpen]);
```

#### Body Scroll Lock

When modals are open, body scrolling is prevented:

```jsx
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'unset';
  }

  return () => {
    document.body.style.overflow = 'unset';
  };
}, [isOpen]);
```

### 9. Loading States

Loading states are properly announced:

```jsx
<Button loading={isLoading} aria-busy={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>
```

Skeleton loaders prevent layout shift and provide visual feedback.

### 10. Error Handling

Errors are announced to screen readers:

```jsx
{error && (
  <div role="alert" aria-live="assertive">
    {error}
  </div>
)}
```

## Testing Accessibility

### Manual Testing

1. **Keyboard Navigation**
   - Navigate through the entire app using only Tab, Shift+Tab, Enter, and Space
   - Ensure all interactive elements are reachable and activatable
   - Verify focus indicators are visible

2. **Screen Reader Testing**
   - Test with NVDA (Windows), JAWS (Windows), or VoiceOver (macOS)
   - Verify all content is announced correctly
   - Check that decorative elements are hidden
   - Ensure form errors are announced

3. **Reduced Motion**
   - Enable "Reduce motion" in OS settings
   - Verify animations are disabled or reduced
   - Check that functionality still works

4. **Color Contrast**
   - Use browser DevTools to check contrast ratios
   - Verify all text meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)

### Automated Testing

Use tools like:
- **axe DevTools**: Browser extension for accessibility testing
- **Lighthouse**: Built into Chrome DevTools
- **WAVE**: Web accessibility evaluation tool
- **Pa11y**: Command-line accessibility testing

## Common Patterns

### Interactive Card

```jsx
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  aria-label="View questions for Company Name"
  className="focus:outline-none focus:ring-2 focus:ring-accent-primary"
>
  <h3>Company Name</h3>
  <p>10 questions</p>
</div>
```

### Form Field with Error

```jsx
<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? "email-error" : undefined}
  />
  {hasError && (
    <p id="email-error" role="alert">
      Please enter a valid email
    </p>
  )}
</div>
```

### Loading Button

```jsx
<button
  disabled={isLoading}
  aria-busy={isLoading}
  aria-label={isLoading ? "Loading..." : "Submit form"}
>
  {isLoading ? (
    <>
      <span className="animate-spin" aria-hidden="true">⏳</span>
      Loading...
    </>
  ) : (
    'Submit'
  )}
</button>
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

## Requirements Validation

This implementation satisfies:

- **Requirement 7.6**: Keyboard navigation for all interactive elements ✅
- **Requirement 7.7**: Semantic HTML and ARIA labels ✅

All pages and components now support:
- Full keyboard navigation
- Screen reader compatibility
- Proper ARIA labels and roles
- Semantic HTML structure
- Focus management
- Reduced motion support
