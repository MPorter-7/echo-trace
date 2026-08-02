/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bone: "#FFFAF5",
        ink: "#1A1A1A",
        gold: "#C8B897",
        silver: "#B0B0B0",
        charcoal: "#2D2D2D",
        mist: "#F0EDE8",
        warm: "#FFFDF9",
        "faded-gold": "#D4C9A8",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ['"Instrument Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'display-xxl': ['96px', { lineHeight: '0.92', letterSpacing: '-0.03em', fontWeight: '600' }],
        'display-xl': ['64px', { lineHeight: '0.95', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-l': ['48px', { lineHeight: '1.05', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-m': ['32px', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '500' }],
        'body-l': ['20px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-m': ['16px', { lineHeight: '1.65', fontWeight: '400' }],
        'body-s': ['14px', { lineHeight: '1.55', fontWeight: '400' }],
        'label': ['12px', { lineHeight: '1.4', letterSpacing: '0.08em', fontWeight: '500' }],
        'micro': ['11px', { lineHeight: '1.3', letterSpacing: '0.1em', fontWeight: '500' }],
      },
      maxWidth: {
        'content': '1400px',
      },
      borderRadius: {
        'pill': '24px',
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      zIndex: {
        'nav': '100',
        'hero-overlay': '10',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
