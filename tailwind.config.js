/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Kantumruy Pro"', 'Khmer OS Battambang', 'system-ui', 'sans-serif'] },
      colors: { brand: { 50: '#eef4fb', 100: '#d9e6f5', 600: '#1d5fa8', 700: '#174c87', 900: '#0b2744' } },
    },
  },
  plugins: [],
};
