import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141414",
        panel: "#ffffff",
        mint: "#1dbf9f",
        coral: "#ef6a5b",
        steel: "#496173"
      }
    }
  },
  plugins: []
} satisfies Config;
