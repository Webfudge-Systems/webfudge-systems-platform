/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('../../packages/config/tailwind.preset')],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './modules/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/layouts/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/book-components/**/*.{ts,tsx}',
    '../../packages/ui/utils/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/feedback/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/themes/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
