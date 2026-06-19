import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#08090a",
        foreground: "#fffffa",
        panel: "#0f1011",
        surface: "#191a1b",
        "surface-2": "#28282c",

        "fg-primary": "#fffffa",
        "fg-secondary": "#d0d6e0",
        "fg-tertiary": "#8a8f98",
        "fg-quaternary": "#62666d",

        primary: { DEFAULT: "#005581", foreground: "#fffffa", hover: "#006b9e" },
        accent: { DEFAULT: "#72cdf4", foreground: "#08090a", hover: "#8ed8f7" },

        success: "#27a644",
        warning: "#ffd200",
        danger: "#dc2626",

        border: "rgba(255,255,255,0.08)",
        "border-subtle": "rgba(255,255,255,0.05)",
        "border-solid": "#23252a",

        muted: { DEFAULT: "#1a1b1e", foreground: "#8a8f98" },
        card: { DEFAULT: "#0f1011", foreground: "#fffffa" },
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
        "elev-raised": "rgba(0,0,0,0.4) 0px 2px 4px, 0 0 0 1px rgba(255,255,255,0.05)",
        "elev-dialog":
          "rgba(0,0,0,0) 0px 8px 2px, rgba(0,0,0,0.01) 0px 5px 2px, rgba(0,0,0,0.04) 0px 3px 2px, rgba(0,0,0,0.07) 0px 1px 1px, rgba(0,0,0,0.08) 0px 0px 1px",
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
