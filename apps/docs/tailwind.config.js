/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  presets: [require('../../packages/config/tailwind.preset')],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/doc-components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/auth/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#F5630F',
          dark: '#1A1A1A',
          light: '#FFFAF7',
          white: '#FFFFFF',
          foreground: '#2d2d2d',
          'text-light': '#666666',
          'text-muted': '#999999',
          border: '#e8e8e8',
          hover: '#f8f8f8',
        },
      },
      fontFamily: {
        sans: ['Host Grotesk', 'system-ui', 'sans-serif'],
        primary: ['Host Grotesk', 'system-ui', 'sans-serif'],
        heading: ['Host Grotesk', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0, 0, 0, 0.04)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-strong': '0 16px 48px rgba(0, 0, 0, 0.15)',
        neon: '0 0 20px rgba(245, 99, 15, 0.35)',
      },
      backdropBlur: {
        glass: '16px',
        'glass-strong': '24px',
      },
      animation: {
        'slide-up': 'slideUpFade 0.4s ease forwards',
        'scale-in': 'scaleIn 0.3s ease forwards',
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(245,99,15,0.3)' },
          '50%': { boxShadow: '0 0 28px rgba(245,99,15,0.6)' },
        },
      },
    },
  },
  plugins: [],
}
