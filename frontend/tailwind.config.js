/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        dev: "#7F77DD",
        life: "#1D9E75",
        biz: "#D85A30",
        ink: "#161616",
        paper: "#F7F3EC",
        night: "#0D1117"
      },
      fontFamily: {
        body: ["var(--font-body)", "sans-serif"],
        display: ["var(--font-display)", "serif"]
      },
      boxShadow: {
        panel: "0 18px 48px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};
