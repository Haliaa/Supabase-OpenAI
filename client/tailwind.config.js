/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      boxShadow: {
        "3xl": "0 35px 60px -15px rgba(0, 0, 0, 0.2)",
      },
    },
  },
  plugins: [],
};
