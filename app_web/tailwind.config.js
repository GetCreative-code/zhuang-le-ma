/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50:'#fef3f2',100:'#fee4e2',200:'#ffcdc9',300:'#fea8a1',400:'#fb7a6e',500:'#f24e3e',600:'#e03423',700:'#bc2718',800:'#9b2317',900:'#80231a' },
        fun: { pink:'#FF6B8A',orange:'#FF8C42',yellow:'#FFD166',green:'#06D6A0',blue:'#118AB2',purple:'#9B5DE5' }
      },
    },
  },
  plugins: [],
}
