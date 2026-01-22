/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
      './index.html',
      './src/**/*.{js,jsx}',
    ],
    theme: {
      extend: {
        colors: {
          'black-base': '#0a0a0a',
          'black-elevated': '#141414',
          'black-elevated-hover': '#1a1a1a',
        },
        boxShadow: {
          'premium': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
          'premium-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
          'glow': '0 0 20px rgba(14, 165, 233, 0.3)',
        }
      }
    },
    plugins: [],
  }
  