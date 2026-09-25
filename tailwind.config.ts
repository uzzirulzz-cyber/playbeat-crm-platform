import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: "class",
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
        extend: {
                colors: {
                    // PlayBeat Enterprise Design Tokens
                    navy: {
                        DEFAULT: '#0B1220',
                        50: '#1a2332',
                        100: '#15202e',
                        200: '#101a26',
                        300: '#0d1520',
                        400: '#0b1220',
                        500: '#080f1a',
                        600: '#060c14',
                        700: '#040910',
                        800: '#02060a',
                        900: '#010305',
                    },
                    slate: {
                        DEFAULT: '#111827',
                        50: '#f8fafc',
                        100: '#f1f5f9',
                        200: '#e2e8f0',
                        300: '#cbd5e1',
                        400: '#94a3b8',
                        500: '#64748b',
                        600: '#475569',
                        700: '#334155',
                        800: '#1e293b',
                        900: '#111827',
                    },
                    gold: {
                        DEFAULT: '#F4C542',
                        light: '#FFD968',
                        dark: '#D4A532',
                        muted: '#92761F',
                    },
                    silver: {
                        DEFAULT: '#CBD5E1',
                        light: '#E2E8F0',
                        dark: '#94A3B8',
                    },
                    cloud: {
                        DEFAULT: '#F8FAFC',
                        dark: '#F1F5F9',
                    },
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
                        }
                },
                fontFamily: {
                    sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
                    display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)'
                },
                boxShadow: {
                    'card': '0 1px 3px rgba(11, 18, 32, 0.08), 0 1px 2px rgba(11, 18, 32, 0.04)',
                    'card-hover': '0 8px 24px rgba(11, 18, 32, 0.12), 0 2px 8px rgba(11, 18, 32, 0.06)',
                    'nav': '0 1px 0 rgba(11, 18, 32, 0.06)',
                    'gold': '0 4px 14px rgba(244, 197, 66, 0.3)',
                }
        }
  },
  plugins: [tailwindcssAnimate],
};
export default config;
