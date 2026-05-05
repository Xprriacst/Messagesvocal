import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6ff",
          500: "#3b6cff",
          600: "#2a55e6",
          700: "#1f43b8"
        }
      }
    }
  },
  plugins: []
} satisfies Config;
