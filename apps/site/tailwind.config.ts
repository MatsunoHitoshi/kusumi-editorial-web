import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

/** 游ゴシック優先（Windows / Office 環境）。未インストール時はメイリオ・ヒラギノへフォールバック */
const yuGothic = [
  '"Yu Gothic"',
  "YuGothic",
  '"Yu Gothic Medium"',
  '"游ゴシック"',
  '"游ゴシック体"',
  '"Yu Gothic UI"',
  "Meiryo",
  '"Hiragino Sans"',
  '"Hiragino Kaku Gothic ProN"',
  "sans-serif"
];

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: yuGothic,
        serif: yuGothic
      }
    }
  },
  plugins: [typography]
};

export default config;
