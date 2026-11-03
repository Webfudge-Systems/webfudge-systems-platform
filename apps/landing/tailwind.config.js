/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('../../packages/config/tailwind.preset')],
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './data/**/*.{js,ts}', './lib/**/*.{js,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Host Grotesk"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      colors: {
        ink: '#0F0F0F',
        muted: '#5C5C5C',
        line: '#EDEDEA',
        surface: '#F4F4F2',
        night: '#0B0B0B',
        brand: { DEFAULT: '#F5630F', ink: '#B84A0B', soft: '#FFF1E8', glow: '#FF9A5C' },
        app: { crm: '#F5630F', pm: '#1F4FFF', books: '#0E9F6E', hr: '#7A3FF2' },
      },
      maxWidth: { site: '1280px' },
      letterSpacing: { display: '-0.045em', tightish: '-0.03em' },
    },
  },
  plugins: [],
}
