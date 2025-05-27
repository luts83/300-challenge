/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#1a1a1a',
          text: '#ffffff',
          'bg-secondary': '#2d2d2d',
          'text-secondary': '#e5e5e5',
        },
      },
    },
  },
  plugins: [],
};
