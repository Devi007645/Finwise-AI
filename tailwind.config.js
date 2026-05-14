/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./finwise_app.tsx",
    "./main.tsx"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'monospace'],
      },
      colors: {
        vercel: {
          black: '#171717',
          white: '#ffffff',
          blue: 'hsla(212, 100%, 48%, 1)',
          red: '#ff5b4f',
          pink: '#de1d8d',
          develop: '#0a72ef',
          text: '#666666',
          border: 'rgba(0,0,0,0.08)'
        }
      },
      boxShadow: {
        'v-border': '0 0 0 1px rgba(0,0,0,0.08)',
        'v-card': 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px, #fafafa 0px 0px 0px 1px',
        'v-focus': '0 0 0 1px rgba(0,0,0,0.08), 0 0 0 3px hsla(212, 100%, 48%, 0.3)'
      }
    },
  },
  plugins: [],
}
