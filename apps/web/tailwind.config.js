/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#3b82f6',
          indigo: '#6366f1',
          purple: '#8b5cf6',
          pink: '#ec4899',
          yellow: '#f59e0b',
          amber: '#fbbf24',
          cyan: '#06b6d4',
          green: '#10b981',
          darkBg: '#1e1b4b',
        },
      },
      backgroundImage: {
        'gradient-main': 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 50%, #06b6d4 100%)',
        'gradient-card': 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
        'gradient-button-yellow': 'linear-gradient(180deg, #facc15 0%, #eab308 100%)',
        'gradient-button-cyan': 'linear-gradient(180deg, #22d3ee 0%, #06b6d4 100%)',
        'gradient-button-purple': 'linear-gradient(180deg, #c084fc 0%, #9333ea 100%)',
        'gradient-button-green': 'linear-gradient(180deg, #34d399 0%, #059669 100%)',
      },
      boxShadow: {
        'glow-yellow': '0 0 25px rgba(250, 204, 21, 0.5)',
        'glow-cyan': '0 0 25px rgba(34, 211, 238, 0.5)',
        'glow-purple': '0 0 25px rgba(192, 132, 252, 0.5)',
        'glow-pink': '0 0 25px rgba(236, 72, 153, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 2s infinite',
        'float': 'float 4s ease-in-out infinite',
        'shake': 'shake 250ms ease-in-out',
      },
      keyframes: {
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(3deg)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
      },
    },
  },
  plugins: [],
};
