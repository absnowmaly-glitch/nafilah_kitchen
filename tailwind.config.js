/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        primary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde7a0',
          300: '#fbd669',
          400: '#f7c33e',
          500: '#f0a92a',
          600: '#d68d14',
          700: '#ad6d0f',
          800: '#7d4f0c',
          900: '#573708',
        },
        ember: {
          50: '#fef2ee',
          100: '#fde1d5',
          400: '#f0784a',
          500: '#e85d2f',
          600: '#c24a22',
          700: '#993a1b',
        },
      },
      boxShadow: {
        ticket: '0 8px 24px -8px rgba(45, 30, 5, 0.25)',
      },
    },
  },
  plugins: [],
};
