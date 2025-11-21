/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        'docsy-blue': '#3A86FF',
        'slate-ink': '#2D2D2D',
        
        // Secondary Colors
        'soft-green': '#6EEB83',
        'sun-yellow': '#FFBE0B',
        'coral-red': '#FF595E',
        'cool-grey': '#ADB5BD',
        
        // Neutral Palette
        'light-bg': '#F7F9FC',
        'input-field': '#F1F3F5',
        'border-grey': '#D6D6D6',
        'muted-text': '#6C757D',
      },
    },
  },
  plugins: [],
}
