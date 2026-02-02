import type { Config } from 'tailwindcss'

const config: Config = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  			mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
  		},
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
  			'gradient-evelya': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  			'gradient-evelya-subtle': 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			// Evelya color palette
  			slate: {
  				50: '#f8fafc',
  				100: '#f1f5f9',
  				200: '#e2e8f0',
  				300: '#cbd5e1',
  				400: '#94a3b8',
  				500: '#64748b',
  				600: '#475569',
  				700: '#334155',
  				800: '#1e293b',
  				900: '#0f172a',
  			},
  			papaya: {
  				50: '#FFF5E6',
  				100: '#FFE8CC',
  				200: '#FFD199',
  				300: '#FFBA66',
  				400: '#FFA333',
  				500: '#FF8C42', // Primary papaya orange
  				600: '#E67A3B',
  				700: '#CC6833',
  				800: '#B3562C',
  				900: '#994424',
  			},
  			lilac: {
  				50: '#F5F3FF',
  				100: '#EDE9FE',
  				200: '#DDD6FE',
  				300: '#C4B5FD',
  				400: '#A78BFA',
  				500: '#8B5CF6', // Primary lilac purple
  				600: '#7C3AED',
  				700: '#6D28D9',
  				800: '#5B21B6',
  				900: '#4C1D95',
  			},
  			lemon: {
  				50: '#FFFEF0',
  				100: '#FFFCE0',
  				200: '#FFF9C2',
  				300: '#FFF6A3',
  				400: '#FFF385',
  				500: '#FFD93D', // Primary lemon yellow
  				600: '#E6C337',
  				700: '#CCAD31',
  				800: '#B3972B',
  				900: '#998125',
  			},
  			cyan: {
  				50: '#ECFEFF',
  				100: '#CFFAFE',
  				200: '#A5F3FC',
  				300: '#67E8F9',
  				400: '#22D3EE',
  				500: '#06B6D4', // Bright cyan
  				600: '#0891B2',
  				700: '#0E7490',
  				800: '#155E75',
  				900: '#164E63',
  			},
  		},
  		boxShadow: {
  			'evelya-sm': '0 2px 8px rgba(0, 0, 0, 0.08)',
  			'evelya-md': '0 4px 16px rgba(0, 0, 0, 0.12)',
  			'evelya-lg': '0 8px 32px rgba(0, 0, 0, 0.16)',
  			'evelya-xl': '0 16px 48px rgba(0, 0, 0, 0.20)',
  		},
  		animation: {
  			'fade-in': 'fadeIn 0.6s ease-out forwards',
  			'slide-up': 'slideUp 0.6s ease-out forwards',
  			'scale-in': 'scaleIn 0.4s ease-out forwards',
  			'float': 'float 6s ease-in-out infinite',
  		},
  		keyframes: {
  			fadeIn: {
  				'0%': { opacity: '0' },
  				'100%': { opacity: '1' },
  			},
  			slideUp: {
  				'0%': { transform: 'translateY(30px)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' },
  			},
  			scaleIn: {
  				'0%': { transform: 'scale(0.9)', opacity: '0' },
  				'100%': { transform: 'scale(1)', opacity: '1' },
  			},
  			float: {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%': { transform: 'translateY(-20px)' },
  			},
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
