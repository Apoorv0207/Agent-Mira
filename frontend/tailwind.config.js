/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html','./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mira: {
          50:  '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7dc8fb',
          400: '#38aaf5',
          500: '#0e8fe0',
          600: '#0271be',
          700: '#035a9a',
          800: '#074d7f',
          900: '#0b3f6a',
          950: '#072848',
        },
        estate: {
          gold:   '#c9a84c',
          warm:   '#f7f3ee',
          stone:  '#8c7b6b',
          dark:   '#1a1410',
        },
      },
      fontFamily: {
        sans:    ['Inter','ui-sans-serif','system-ui','sans-serif'],
        display: ['Playfair Display','Georgia','serif'],
      },
      animation: {
        'fade-up':   'fadeUp 0.3s ease-out',
        'fade-in':   'fadeIn 0.2s ease-out',
        'dot-pulse': 'dotPulse 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:   { '0%':{ opacity:'0', transform:'translateY(8px)' }, '100%':{ opacity:'1', transform:'translateY(0)' } },
        fadeIn:   { '0%':{ opacity:'0' }, '100%':{ opacity:'1' } },
        dotPulse: { '0%,80%,100%':{ transform:'scale(0)', opacity:'0.4' }, '40%':{ transform:'scale(1)', opacity:'1' } },
      },
    },
  },
  plugins: [],
}
