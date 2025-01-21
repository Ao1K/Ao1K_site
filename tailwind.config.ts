import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-Rubik)',],
        modern: ['var(--font-Glory)',],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        primary: {
          100: '#ECE6EF',
          200: '#DACEDE',
          300: '#BFA9C6',
          400: '#A385AD',
          500: '#7B5A87',
          600: '#5A4162',
          700: '#433149',
          800: '#221825',
          900: '#161018'
        },
        dark: '#161018',
        light_accent: '#1D2F66',
        dark_accent: '#ACC8D7',

        paren: '#2979A4',
        rep: '#6229A4',
      }
    },
  },
  plugins: [],
};
export default config;
