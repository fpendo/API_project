/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Same deep-space base as the portal, with Designo's rose/amber accent
        background: {
          DEFAULT: '#0a0a0f',
          surface: '#12121a',
          elevated: '#1a1a24',
          glass: 'rgba(18, 18, 26, 0.8)',
        },
        accent: {
          primary: '#f43f5e',
          'primary-hover': '#e11d48',
          secondary: '#fb923c',
          glow: '#fb7185',
        },
        text: {
          primary: '#f8fafc',
          secondary: '#cbd5e1',
          muted: '#64748b',
        },
        border: {
          DEFAULT: '#2d2d3a',
          focus: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 30px rgba(244, 63, 94, 0.35)',
        'glow-lg': '0 0 60px rgba(244, 63, 94, 0.45)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'gradient': 'gradient 8s ease infinite',
        'grain': 'grain 0.8s steps(4) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        grain: {
          '0%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(-2%, 1%)' },
          '50%': { transform: 'translate(1%, -2%)' },
          '75%': { transform: 'translate(-1%, 2%)' },
          '100%': { transform: 'translate(2%, -1%)' },
        },
      },
    },
  },
  plugins: [],
}
