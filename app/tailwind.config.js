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
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:   ['11px', { lineHeight: '16px' }],
        sm:   ['12px', { lineHeight: '18px' }],
        base: ['13px', { lineHeight: '20px' }],
        lg:   ['15px', { lineHeight: '22px' }],
        xl:   ['18px', { lineHeight: '26px' }],
        '2xl':['22px', { lineHeight: '30px' }],
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
