/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0F766E", // Teal-700
        secondary: "#0D9488", // Teal-600
        accent: "#F59E0B", // Amber-500
        background: "#F3F4F6", // Gray-100
        surface: "#FFFFFF",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
