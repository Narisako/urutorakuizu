/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'flash-red': 'flashRed 0.3s ease-in-out infinite',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        flashRed: {
          '0%, 100%': { backgroundColor: '#dc2626' },
          '50%': { backgroundColor: '#fef2f2' },
        },
      },
    },
  },
  plugins: [],
};
