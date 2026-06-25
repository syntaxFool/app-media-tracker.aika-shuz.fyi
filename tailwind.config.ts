import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Base
        background: "#ffffff",
        foreground: "#0a1628",
        panel: "#ffffff",
        surface: "#f5f7fa",
        "surface-2": "#e8ecf2",

        // Text
        "fg-primary": "#0a1628",
        "fg-secondary": "#3a4a5c",
        "fg-tertiary": "#6b7d8e",
        "fg-quaternary": "#95a5b5",

        // Brand — poseidon blue + gold
        primary: { DEFAULT: "#006994", foreground: "#ffffff", hover: "#0082b3" },
        accent: { DEFAULT: "#ffd200", foreground: "#0a1628", hover: "#ffe552" },

        success: "#27a644",
        warning: "#ffd200",
        danger: "#dc2626",

        // Borders
        border: "rgba(0,0,0,0.07)",
        "border-subtle": "rgba(0,0,0,0.04)",
        "border-solid": "#dde3ea",

        // Misc
        muted: { DEFAULT: "#f0f4f8", foreground: "#6b7d8e" },
        card: { DEFAULT: "#ffffff", foreground: "#0a1628" },
        brand: { DEFAULT: "#ffd200", foreground: "#0a1628", hover: "#ffe552" },
        ocean: { DEFAULT: "#72cdf4", foreground: "#0a1628", hover: "#8ed8f7" },
        navy: { DEFAULT: "#006994", foreground: "#ffffff", hover: "#0082b3" },
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "22px",
        pill: "9999px",
      },
      fontFamily: {
        sans: [
          '"Inter Variable"', '"Inter"', '"SF Pro Display"',
          "-apple-system", "system-ui", '"Segoe UI"', "Roboto",
          "sans-serif",
        ],
        mono: [
          '"Berkeley Mono"', "ui-monospace", '"SF Mono"',
          "Menlo", "Monaco", "Consolas", "monospace",
        ],
      },
      fontSize: {
        "heading-1": ["32px", { lineHeight: "1.13", letterSpacing: "-0.022em", fontWeight: "400" }],
        "heading-2": ["24px", { lineHeight: "1.33", letterSpacing: "-0.018em", fontWeight: "400" }],
        "heading-3": ["20px", { lineHeight: "1.33", letterSpacing: "-0.015em", fontWeight: "590" }],
        "body-lg": ["18px", { lineHeight: "1.60", letterSpacing: "-0.010em", fontWeight: "400" }],
        body: ["16px", { lineHeight: "1.50", letterSpacing: "0", fontWeight: "400" }],
        small: ["15px", { lineHeight: "1.60", letterSpacing: "-0.010em", fontWeight: "400" }],
        caption: ["13px", { lineHeight: "1.50", letterSpacing: "-0.010em", fontWeight: "400" }],
        label: ["12px", { lineHeight: "1.40", letterSpacing: "0", fontWeight: "510" }],
        micro: ["11px", { lineHeight: "1.40", letterSpacing: "0", fontWeight: "510" }],
        tiny: ["10px", { lineHeight: "1.50", letterSpacing: "-0.015em", fontWeight: "400" }],
      },
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "12": "48px",
      },
      boxShadow: {
        "elev-raised": "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
        "elev-dialog":
          "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms cubic-bezier(0.2,0,0,1)",
        "slide-in": "slide-in 200ms cubic-bezier(0.2,0,0,1)",
        "scale-in": "scale-in 150ms cubic-bezier(0.2,0,0,1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
