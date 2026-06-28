/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Hiragino Kaku Gothic ProN"',
          '"Hiragino Sans"',
          "Meiryo",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          DEFAULT: "#2563eb",
          light: "#eff6ff",
        },
      },
    },
  },
  plugins: [],
};
