/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Same palette as the coach dashboard repo's tailwind.config.js —
      // keep these two in sync if the design system changes.
      colors: {
        background: '#0A0A0A',
        surface: '#171717',
        border: '#262626',
        primary: '#3B82F6',
        'primary-hover': '#2563EB',
      },
    },
  },
  plugins: [],
};
