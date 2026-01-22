import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nvidia: {
          green: "#76B900",
          "green-hover": "#88CC00",
          dark: "#0A0A0A",
          darker: "#050505",
          gray: "#1A1A1A",
          "gray-light": "#2A2A2A",
          border: "#333333",
        },
      },
    },
  },
  plugins: [],
};
export default config;
