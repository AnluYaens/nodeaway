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
        dev: {
          DEFAULT: "#7F77DD",
          50: "#F5F4FD",
          100: "#ECEAFC",
          200: "#D5D2F7",
          300: "#B5B0EE",
          400: "#9F98E5",
          500: "#7F77DD",
          600: "#6159C7",
          700: "#4B43A6",
          800: "#3A3480",
          900: "#2B275E",
          950: "#1A183A"
        },
        life: {
          DEFAULT: "#1D9E75",
          50: "#EEFBF5",
          100: "#D5F5E8",
          200: "#ADE9D2",
          300: "#78D7B5",
          400: "#41BF94",
          500: "#1D9E75",
          600: "#137E5D",
          700: "#10654B",
          800: "#0D503D",
          900: "#0A3E30",
          950: "#05241C"
        },
        biz: {
          DEFAULT: "#D85A30",
          50: "#FEF4F0",
          100: "#FDE6DD",
          200: "#FABFAB",
          300: "#F29577",
          400: "#E57550",
          500: "#D85A30",
          600: "#B84824",
          700: "#96391D",
          800: "#742E18",
          900: "#582314",
          950: "#35130A"
        },
        ink: "#161616",
        paper: "#F7F3EC",
        night: "#0D1117"
      },
      fontFamily: {
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"]
      },
      boxShadow: {
        panel: "0 18px 48px rgba(15, 23, 42, 0.08)",
        "panel-lg": "0 24px 64px rgba(15, 23, 42, 0.12)"
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-14px) scale(1.03)" }
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.08)" }
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" }
        },
        "hero-orb": {
          "0%, 100%": { transform: "translate(0,0) scale(1)", opacity: "0.5" },
          "33%": { transform: "translate(30px,-20px) scale(1.15)", opacity: "0.7" },
          "66%": { transform: "translate(-20px,15px) scale(0.92)", opacity: "0.55" }
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        shimmer: "shimmer 1.8s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 9s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "gradient-shift": "gradient-shift 6s ease infinite",
        "hero-orb": "hero-orb 8s ease-in-out infinite",
        "hero-orb-slow": "hero-orb 12s ease-in-out infinite",
        "count-up": "count-up 0.5s ease-out forwards"
      }
    }
  },
  plugins: []
};
