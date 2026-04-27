/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['"Share Tech Mono"', 'monospace'],
        'display': ['"Orbitron"', 'sans-serif'],
        'body': ['"Exo 2"', 'sans-serif'],
      },
      colors: {
        cyber: {
          cyan: '#00f5ff',
          magenta: '#ff00ff',
          green: '#00ff41',
          yellow: '#ffff00',
          orange: '#ff6b00',
          dark: '#050a0e',
          darker: '#020508',
          card: '#0a1628',
          border: '#1a2f4a',
        }
      },
      animation: {
        'pulse-cyan': 'pulse-cyan 2s ease-in-out infinite',
        'flicker': 'flicker 3s linear infinite',
        'scanline': 'scanline 8s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-cyan': {
          '0%, 100%': { boxShadow: '0 0 5px #00f5ff, 0 0 10px #00f5ff' },
          '50%': { boxShadow: '0 0 20px #00f5ff, 0 0 40px #00f5ff, 0 0 80px #00f5ff' },
        },
        'flicker': {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': { opacity: 1 },
          '20%, 24%, 55%': { opacity: 0.8 },
        },
        'glow': {
          'from': { textShadow: '0 0 10px #00f5ff, 0 0 20px #00f5ff' },
          'to': { textShadow: '0 0 20px #00f5ff, 0 0 40px #00f5ff, 0 0 80px #00f5ff' },
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 5px #00f5ff, 0 0 20px #00f5ff, 0 0 40px rgba(0, 245, 255, 0.3)',
        'neon-magenta': '0 0 5px #ff00ff, 0 0 20px #ff00ff, 0 0 40px rgba(255, 0, 255, 0.3)',
        'neon-green': '0 0 5px #00ff41, 0 0 20px #00ff41, 0 0 40px rgba(0, 255, 65, 0.3)',
        'inner-dark': 'inset 0 2px 10px rgba(0,0,0,0.8)',
      }
    },
  },
  plugins: [],
}
