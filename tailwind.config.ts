import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Hivolta brand kleuren (officiële styleguide)
        hv: {
          dark: '#2D3D3C',     // Outer Space Green - primair
          darker: '#1f2c2b',
          green: '#32985A',    // Sea Green - accent positief
          'green-dk': '#247a44',
          yellow: '#DDDC34',   // Pear Green - savings & cashback
          blue: '#13263B',     // Yankees Blue - deep contrast / table headers
          'blue-dk': '#0d1f31',
          cream: '#F7F6F1',    // warmere off-white achtergrond
          line: '#E6E4DA',
          'line-strong': '#CFCDC0',
          mute: '#5b6877',
          warn: '#B23A48',
          slate: '#818a91',
        },
        brand: {
          50:  '#f5fbf7',
          100: '#dff5e7',
          500: '#32985A',
          600: '#2d8a52',
          700: '#247a44',
          900: '#2D3D3C',
        },
      },
      fontFamily: {
        sans: ['Karla', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Jost', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
