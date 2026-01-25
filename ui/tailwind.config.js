/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark slate theme with violet accents as specified
        slate: {
          950: '#0B1120',
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
          500: '#64748B',
          400: '#94A3B8',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
          50: '#F8FAFC',
        },
        // Violet accent colors for AI actions
        violet: {
          600: '#7C3AED',
          500: '#8B5CF6',
          400: '#A78BFA',
          300: '#C4B5FD',
        },
        // Semantic colors for feedback
        green: {
          400: '#4ADE80',
        },
        yellow: {
          400: '#FACC15',
        },
        red: {
          400: '#F87171',
        },
      },
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'jetbrains': ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        'xl': '24px',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}