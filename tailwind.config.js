/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'plumber-primary': '#0369a1',
        'plumber-secondary': '#0284c7',
        'plumber-accent': '#fbbf24',
      },
    },
  },
  plugins: [],
}