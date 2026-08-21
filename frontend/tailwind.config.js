/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0B0A0C",      // page background
        panel: "#16141A",     // cards, sidebar, chat panel
        line: "#2A262B",      // hairline borders
        ink: "#F2EFEA",       // primary text
        smoke: "#8B8790",     // muted/secondary text
        blood: "#B3122E",     // single accent
        "blood-dim": "#7A0C20",
      },
      fontFamily: {
        display: ["'Archivo Black'", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scaleY(0.4)", opacity: "0.5" },
          "50%": { transform: "scaleY(1)", opacity: "1" },
        },
        grain: {
          "0%": { transform: "translate(0,0)" },
          "100%": { transform: "translate(-5%,-10%)" },
        },
      },
      animation: {
        breathe: "breathe 1.1s ease-in-out infinite",
        grain: "grain 8s steps(10) infinite",
      },
    },
  },
  plugins: [],
};
