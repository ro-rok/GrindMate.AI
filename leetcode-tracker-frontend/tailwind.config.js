/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
      './index.html',
      './src/**/*.{js,jsx}',
    ],
    theme: {
      extend: {
        // Surface hierarchy
        colors: {
          'bg-base': 'var(--bg-base)',
          'bg-surface': 'var(--bg-surface)',
          'bg-surface-2': 'var(--bg-surface-2)',
          'bg-elevated': 'var(--bg-elevated)',
          // Legacy aliases
          'black-base': 'var(--bg-base)',
          'black-elevated': 'var(--bg-surface)',
          'black-elevated-hover': 'var(--bg-surface-2)',
          // Text colors
          'text-primary': 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-tertiary': 'var(--text-tertiary)',
          'text-muted': 'var(--text-muted)',
          'text-disabled': 'var(--text-disabled)',
          // Accents
          'accent-primary': 'var(--accent-primary)',
          'accent-primary-hover': 'var(--accent-primary-hover)',
          'accent-primary-light': 'var(--accent-primary-light)',
          'accent-primary-dark': 'var(--accent-primary-dark)',
          'accent-secondary': 'var(--accent-secondary)',
          'accent-secondary-hover': 'var(--accent-secondary-hover)',
          'accent-success': 'var(--accent-success)',
          'accent-success-hover': 'var(--accent-success-hover)',
          'accent-success-light': 'var(--accent-success-light)',
          'accent-warning': 'var(--accent-warning)',
          'accent-warning-hover': 'var(--accent-warning-hover)',
          'accent-warning-light': 'var(--accent-warning-light)',
          'accent-danger': 'var(--accent-danger)',
          'accent-danger-hover': 'var(--accent-danger-hover)',
          'accent-danger-light': 'var(--accent-danger-light)',
          // Borders
          'border-subtle': 'var(--border-subtle)',
          'border-default': 'var(--border-default)',
          'border-emphasis': 'var(--border-emphasis)',
          'border-brand': 'var(--border-brand)',
          'border-success': 'var(--border-success)',
          'border-warning': 'var(--border-warning)',
          'border-danger': 'var(--border-danger)',
          // Legacy border aliases
          'border-soft': 'var(--border-subtle)',
          'border-soft-hover': 'var(--border-default)',
        },
        // Spacing (8pt grid)
        spacing: {
          '0': 'var(--space-0)',
          '0.5': 'var(--space-0_5)',
          '1': 'var(--space-1)',
          '1.5': 'var(--space-1_5)',
          '2': 'var(--space-2)',
          '2.5': 'var(--space-2_5)',
          '3': 'var(--space-3)',
          '3.5': 'var(--space-3_5)',
          '4': 'var(--space-4)',
          '5': 'var(--space-5)',
          '6': 'var(--space-6)',
          '8': 'var(--space-8)',
          '10': 'var(--space-10)',
          '12': 'var(--space-12)',
          '16': 'var(--space-16)',
          '20': 'var(--space-20)',
          '24': 'var(--space-24)',
        },
        // Border radius
        borderRadius: {
          'sm': 'var(--radius-sm)',
          'md': 'var(--radius-md)',
          'lg': 'var(--radius-lg)',
          'xl': 'var(--radius-xl)',
          'full': 'var(--radius-full)',
        },
        // Typography
        fontFamily: {
          'sans': 'var(--font-sans)',
          'mono': 'var(--font-mono)',
        },
        fontSize: {
          'xs': 'var(--text-xs)',
          'sm': 'var(--text-sm)',
          'base': 'var(--text-base)',
          'lg': 'var(--text-lg)',
          'xl': 'var(--text-xl)',
          '2xl': 'var(--text-2xl)',
          '3xl': 'var(--text-3xl)',
          '4xl': 'var(--text-4xl)',
        },
        fontWeight: {
          'normal': 'var(--font-normal)',
          'medium': 'var(--font-medium)',
          'semibold': 'var(--font-semibold)',
          'bold': 'var(--font-bold)',
        },
        lineHeight: {
          'tight': 'var(--leading-tight)',
          'snug': 'var(--leading-snug)',
          'normal': 'var(--leading-normal)',
          'relaxed': 'var(--leading-relaxed)',
        },
        // Shadows & glows
        boxShadow: {
          'sm': 'var(--shadow-sm)',
          'md': 'var(--shadow-md)',
          'lg': 'var(--shadow-lg)',
          'xl': 'var(--shadow-xl)',
          '2xl': 'var(--shadow-2xl)',
          'elevation-1': 'var(--elevation-1)',
          'elevation-2': 'var(--elevation-2)',
          'elevation-3': 'var(--elevation-3)',
          'elevation-4': 'var(--elevation-4)',
          'glow-brand': 'var(--glow-brand)',
          'glow-brand-strong': 'var(--glow-brand-strong)',
          'glow-success': 'var(--glow-success)',
          'glow-warning': 'var(--glow-warning)',
          'glow-danger': 'var(--glow-danger)',
          'focus-ring': 'var(--focus-ring)',
          // Legacy aliases
          'premium': 'var(--elevation-1)',
          'premium-lg': 'var(--elevation-2)',
          'glow': 'var(--glow-brand-strong)',
        },
        // Motion
        transitionDuration: {
          'instant': 'var(--duration-instant)',
          'fast': 'var(--duration-fast)',
          'normal': 'var(--duration-normal)',
          'slow': 'var(--duration-slow)',
          'slower': 'var(--duration-slower)',
        },
        transitionTimingFunction: {
          'ease-in': 'var(--ease-in)',
          'ease-out': 'var(--ease-out)',
          'ease-in-out': 'var(--ease-in-out)',
          'ease-bounce': 'var(--ease-bounce)',
          'ease-elastic': 'var(--ease-elastic)',
        },
        // Container
        maxWidth: {
          'container': 'var(--container-max-width)',
        },
      }
    },
    plugins: [],
  }
  