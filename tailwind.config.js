/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          50: "#faf6ee",
          100: "#f3e8d3",
          200: "#e6d3ac",
          300: "#d6b87d",
          400: "#c39a52",
          500: "#a97c2f",
          600: "#8c6428",
          700: "#6f4e1f",
          800: "#523a17",
          900: "#38280f",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
