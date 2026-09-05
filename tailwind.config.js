/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: 'hsla(var(--brand-50), <alpha-value>)',
          100: 'hsla(var(--brand-100), <alpha-value>)',
          200: 'hsla(var(--brand-200), <alpha-value>)',
          300: 'hsla(var(--brand-300), <alpha-value>)',
          400: 'hsla(var(--brand-400), <alpha-value>)',
          500: 'hsla(var(--brand-500), <alpha-value>)',
          600: 'hsla(var(--brand-600), <alpha-value>)',
          700: 'hsla(var(--brand-700), <alpha-value>)',
          800: 'hsla(var(--brand-800), <alpha-value>)',
          900: 'hsla(var(--brand-900), <alpha-value>)',
          950: 'hsla(var(--brand-950), <alpha-value>)',
        },
        ink: {
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
      },
      boxShadow: {
        glass: '0 8px 32px 0 hsla(var(--brand-800), 0.12)',
        'glass-lg': '0 20px 60px -10px hsla(var(--brand-800), 0.25)',
        glow: '0 0 40px hsla(var(--brand-500), 0.35)',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(to right, hsla(var(--brand-500), 0.07) 1px, transparent 1px), linear-gradient(to bottom, hsla(var(--brand-500), 0.07) 1px, transparent 1px)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.8s ease-out both',
        float: 'float 6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 3s linear infinite',
      },
    },
  },
  plugins: [],
};
