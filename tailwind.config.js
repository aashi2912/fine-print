/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: { 50: "#faf8f5", 100: "#f5f1eb", 200: "#ebe5db", 300: "#d6cdc0", 400: "#b8ad9e" },
        ink: { DEFAULT: "#1a1a1a", light: "#4a4a4a", muted: "#8a8580" },
        safe: "#16a34a",
        caution: "#ca8a04",
        danger: "#dc2626",
        accent: "#2563eb",
      },
      fontFamily: {
        display: ['"Source Serif 4"', "Georgia", "serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
