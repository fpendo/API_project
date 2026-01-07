/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep space theme with electric accents
        background: {
          DEFAULT: '#0a0a0f',
          surface: '#12121a',
          elevated: '#1a1a24',
          glass: 'rgba(18, 18, 26, 0.8)',
        },
        accent: {
          primary: '#6366f1',      // Indigo
          'primary-hover': '#4f46e5',
          secondary: '#22d3ee',    // Cyan
          glow: '#818cf8',
        },
        text: {
          primary: '#f8fafc',
          secondary: '#cbd5e1',
          muted: '#64748b',
        },
        border: {
          DEFAULT: '#2d2d3a',
          focus: '#6366f1',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Clash Display', 'Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 30px rgba(99, 102, 241, 0.4)',
        'glow-lg': '0 0 60px rgba(99, 102, 241, 0.5)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'gradient': 'gradient 8s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)' },
          '50%': { boxShadow: '0 0 50px rgba(99, 102, 241, 0.6)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}

