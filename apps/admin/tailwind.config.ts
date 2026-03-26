import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Noto Serif JP'", "serif"]
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "65ch",
            "blockquote": {
              borderLeftColor: "rgb(161 161 170)"
            }
          }
        }
      }
    }
  },
  plugins: [typography]
};

export default config;
