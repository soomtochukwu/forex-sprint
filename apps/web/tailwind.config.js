/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        mono: ['var(--font-roboto-mono)'],
      },
      colors: {
        border: "#333333",
        input: "#1A1A1A",
        ring: "#00FF00",
        background: "#0A0A0A",
        foreground: "#E5E5E5",
        primary: {
          DEFAULT: "#00FF00", // Terminal Green
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#1A1A1A",
          foreground: "#E5E5E5",
        },
        destructive: {
          DEFAULT: "#FF0000",
          foreground: "#000000",
        },
        muted: {
          DEFAULT: "#1A1A1A",
          foreground: "#888888",
        },
        accent: {
          DEFAULT: "#8B5CF6", // Electric Purple
          foreground: "#FFFFFF",
        },
        popover: {
          DEFAULT: "#0A0A0A",
          foreground: "#E5E5E5",
        },
        card: {
          DEFAULT: "#111111",
          foreground: "#E5E5E5",
        },
      },
      borderRadius: {
        lg: "0px", // 1px solid borders, no rounding for terminal aesthetic
        md: "0px",
        sm: "0px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

module.exports = config;
