/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0F1419",       // page background
        panel: "#1A212B",      // cards, sidebar, chat panel
        line: "#2D3748",       // hairline borders
        ink: "#E8EDF2",        // primary text
        smoke: "#8A97A8",      // muted/secondary text
        blood: "#3B82F6",      // single accent (kept name "blood" so existing classes still work)
        "blood-dim": "#2563EB",
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
