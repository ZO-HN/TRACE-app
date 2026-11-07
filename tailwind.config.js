/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Same palette as the coach dashboard repo's tailwind.config.js —
      // keep these two in sync if the design system changes.
      colors: {
        background: '#121417',
        surface: '#1E2026',
        border: '#2D3139',
        primary: '#4F46E5',
        'primary-hover': '#4338CA',
      },
    },
  },
  plugins: [],
};
