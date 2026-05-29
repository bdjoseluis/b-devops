/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crimson: {
          DEFAULT: '#e63946',
          dark: '#c1121f',
          light: '#ff6b6b',
        },
        dark: {
          DEFAULT: '#030008',
          100: '#07001a',
          200: '#0d0120',
          300: '#110228',
          400: '#160333',
          500: '#1a0540',
        },
        surface: {
          DEFAULT: '#140228',
          light: '#1e0535',
          border: '#2a0a4a',
        },
        // Galaxy palette
        nebula: {
          purple: '#7c3aed',
          blue:   '#2563eb',
          pink:   '#db2777',
          cyan:   '#06b6d4',
          violet: '#8b5cf6',
          rose:   '#f43f5e',
          indigo: '#4f46e5',
          teal:   '#14b8a6',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'galaxy': 'radial-gradient(ellipse at 20% 50%, #1a0a3a 0%, #030008 40%, #000510 100%)',
        'nebula-purple': 'radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, transparent 70%)',
        'nebula-blue': 'radial-gradient(ellipse at center, rgba(37,99,235,0.12) 0%, transparent 70%)',
        'nebula-pink': 'radial-gradient(ellipse at center, rgba(219,39,119,0.12) 0%, transparent 70%)',
      },
      animation: {
        'pulse-crimson': 'pulse-crimson 2s infinite',
        'scan-line': 'scan-line 2s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
        'twinkle': 'twinkle 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'nebula-drift': 'nebulaDrift 20s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        'orbit': 'orbit 10s linear infinite',
      },
      keyframes: {
        'pulse-crimson': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(230, 57, 70, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(230, 57, 70, 0)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slideUp': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'twinkle': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.3', transform: 'scale(0.8)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'glowPulse': {
          '0%, 100%': { filter: 'brightness(1) drop-shadow(0 0 6px currentColor)' },
          '50%': { filter: 'brightness(1.3) drop-shadow(0 0 16px currentColor)' },
        },
        'nebulaDrift': {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -20px) scale(1.05)' },
          '66%': { transform: 'translate(-20px, 15px) scale(0.97)' },
          '100%': { transform: 'translate(10px, -10px) scale(1.02)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'orbit': {
          '0%': { transform: 'rotate(0deg) translateX(40px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(40px) rotate(-360deg)' },
        },
      },
    },
  },
  plugins: [],
}
