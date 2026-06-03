/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CSS variable-driven colors — switch automatically with .dark class
        primary: {
          DEFAULT: 'rgb(var(--clr-primary) / <alpha-value>)',
          50:  'rgb(var(--clr-primary-50) / <alpha-value>)',
          100: 'rgb(var(--clr-primary-100) / <alpha-value>)',
          200: 'rgb(var(--clr-primary-200) / <alpha-value>)',
          600: 'rgb(var(--clr-primary-600) / <alpha-value>)',
          700: 'rgb(var(--clr-primary-700) / <alpha-value>)',
          800: 'rgb(var(--clr-primary-800) / <alpha-value>)',
          900: 'rgb(var(--clr-primary-900) / <alpha-value>)',
        },
        // Semantic surface tokens
        surface: {
          DEFAULT: 'rgb(var(--clr-surface) / <alpha-value>)',
          raised: 'rgb(var(--clr-surface-raised) / <alpha-value>)',
          overlay: 'rgb(var(--clr-surface-overlay) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--clr-border) / <alpha-value>)',
          strong: 'rgb(var(--clr-border-strong) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--clr-ink) / <alpha-value>)',
          secondary: 'rgb(var(--clr-ink-secondary) / <alpha-value>)',
          muted: 'rgb(var(--clr-ink-muted) / <alpha-value>)',
          ghost: 'rgb(var(--clr-ink-ghost) / <alpha-value>)',
        },
        success: {
          DEFAULT: '#22C55E',
          light: 'rgb(var(--clr-success-light) / <alpha-value>)',
          dark: '#15803D',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: 'rgb(var(--clr-warning-light) / <alpha-value>)',
          dark: '#B45309',
        },
        danger: {
          DEFAULT: '#EF4444',
          light: 'rgb(var(--clr-danger-light) / <alpha-value>)',
          dark: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card':    '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.03)',
        'card-md': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'card-lg': '0 10px 24px -4px rgb(0 0 0 / 0.1), 0 4px 8px -4px rgb(0 0 0 / 0.06)',
        'glow':    '0 0 0 3px rgb(var(--clr-primary) / 0.15)',
      },
      animation: {
        'slide-in':   'slideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in':    'fadeIn 0.18s ease-out',
        'slide-up':   'slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-dot':  'pulseDot 2s ease-in-out infinite',
      },
      keyframes: {
        slideIn:  { '0%': { transform: 'translateX(100%)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        fadeIn:   { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:  { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        pulseDot: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.35' } },
        skeletonShimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
      },
    },
  },
  plugins: [],
}
