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
        // Darker than the original palette on purpose: the primary users are
        // elderly, so secondary/muted text needs real contrast on the cream
        // surfaces while keeping the warm tone.
        'text-primary': '#231C12',
        'text-secondary': '#665A4C',
        'text-muted': '#7E7060',
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
