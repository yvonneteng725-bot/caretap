import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter Tight'", "'Noto Sans TC'", 'sans-serif'],
      },
      colors: {
        bg: '#E2DDD6',
        surface: '#FAFAF7',
        'text-primary': '#2A2218',
        'text-secondary': '#8A7E72',
        'text-muted': '#9A8C7E',
        divider: 'rgba(200, 184, 154, 0.4)',
        medications: { accent: '#7B9E87', dark: '#3D6B58' },
        'blood-pressure': { accent: '#B07B7B', dark: '#7A4545' },
        'body-temperature': { accent: '#C4956A', dark: '#8A5830' },
        'blood-sugar': { accent: '#6B9B9E', dark: '#2E6E72' },
        'wound-care': { accent: '#9B8BB4', dark: '#5E4880' },
        'meal-log': { accent: '#B8A030', dark: '#7A6A10' },
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 8px 32px rgba(50,35,15,0.16), 0 2px 6px rgba(50,35,15,0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config
