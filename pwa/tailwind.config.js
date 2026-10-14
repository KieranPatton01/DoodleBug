/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        butter: '#FFFDF5',
        canvas: '#FAF9F6',
        pastel: {
          pink: '#FFD6E8',
          lavender: '#E8E5FF',
          peach: '#FFE7DE',
          mint: '#E2F7ED',
          yellow: '#FFF7D6',
        }
      },
      fontFamily: {
        hand: ['Caveat', 'cursive'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        retro: '3px 3px 0px 0px rgba(0, 0, 0, 0.8)',
        'retro-sm': '2px 2px 0px 0px rgba(0, 0, 0, 0.8)',
      }
    },
  },
  plugins: [],
}
