/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAF8F5',
        surface: '#F4F1EC',
        'text-primary': '#1C1917',
        'text-muted': '#78716C',
        border: '#E2DDD8',
        accent: '#C2692A',
        'risk-red': '#DC2626',
        'safe-green': '#16A34A',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '16px' }],
        xs:   ['12px', { lineHeight: '17px' }],
        sm:   ['13px', { lineHeight: '19px' }],
        base: ['15px', { lineHeight: '22px' }],
        lg:   ['17px', { lineHeight: '25px' }],
        xl:   ['20px', { lineHeight: '28px' }],
        '2xl':['24px', { lineHeight: '32px' }],
        '3xl':['30px', { lineHeight: '38px' }],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '4px',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
