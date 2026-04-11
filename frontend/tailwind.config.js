/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'sans-serif']
      },
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b'
        },
        accent: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669'
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626'
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706'
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#0f172a'
        }
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #1e0a3c 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)',
        'gradient-success': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-danger':  'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'mesh-light': 'radial-gradient(at 40% 20%, hsla(240,100%,74%,0.3) 0px, transparent 50%), radial-gradient(at 80% 80%, hsla(270,100%,70%,0.2) 0px, transparent 50%), radial-gradient(at 20% 80%, hsla(200,100%,70%,0.2) 0px, transparent 50%)',
        'mesh-dark': 'radial-gradient(at 40% 20%, hsla(240,80%,30%,0.4) 0px, transparent 50%), radial-gradient(at 80% 80%, hsla(270,80%,20%,0.3) 0px, transparent 50%), radial-gradient(at 20% 80%, hsla(200,80%,20%,0.3) 0px, transparent 50%)'
      },
      boxShadow: {
        'glow': '0 0 20px rgba(99,102,241,0.4)',
        'glow-sm': '0 0 10px rgba(99,102,241,0.3)',
        'glow-green': '0 0 20px rgba(16,185,129,0.4)',
        'card': '0 4px 24px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.16)',
        'glass': '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)'
      },
      backdropBlur: {
        xs: '2px'
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite'
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' }
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' }
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' }
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' }
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(99,102,241,0.3)' },
          '50%':       { boxShadow: '0 0 25px rgba(99,102,241,0.6)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-12px)' }
        },
        shimmer: {
          '0%':   { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' }
        }
      }
    }
  },
  plugins: []
};
