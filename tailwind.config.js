/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Midnight & Steel - Command Center Palette
        midnight: {
          50: '#f0f4ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#0B1120',  // Card background
          900: '#070D1A',  // Elevated surfaces
          950: '#020617',  // Primary background
        },
        // Steel gray palette for UI elements
        steel: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Primary accent - Indigo/Violet for actions
        accent: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',  // Primary action color
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // Industrial status colors
        status: {
          success: '#10b981',      // Emerald-500
          'success-dim': '#064e3b',
          warning: '#f59e0b',      // Amber-500
          'warning-dim': '#78350f',
          risk: '#f43f5e',         // Rose-500
          'risk-dim': '#881337',
          info: '#06b6d4',         // Cyan-500
          'info-dim': '#164e63',
          neutral: '#64748b',      // Slate-500
        },
        // Framework-specific colors (industrial)
        framework: {
          soc2: '#8b5cf6',         // Violet
          iso: '#10b981',          // Emerald
          hipaa: '#ec4899',        // Pink
          nist: '#f59e0b',         // Amber
        },
        // Compliance states
        compliance: {
          met: '#10b981',
          partial: '#f59e0b',
          gap: '#f43f5e',
          pending: '#64748b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em' }],
      },
      boxShadow: {
        // Command center shadows
        'glow-sm': '0 0 10px rgba(99, 102, 241, 0.15)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.2)',
        'glow-lg': '0 0 40px rgba(99, 102, 241, 0.25)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-warning': '0 0 20px rgba(245, 158, 11, 0.3)',
        'glow-risk': '0 0 20px rgba(244, 63, 94, 0.3)',
        // Card shadows
        'card': '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
        'elevated': '0 10px 40px rgba(0, 0, 0, 0.5)',
        // Inner shadows
        'inner-dark': 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      backdropBlur: {
        'xs': '2px',
        'command': '12px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
