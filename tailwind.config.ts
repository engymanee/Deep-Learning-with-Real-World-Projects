import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: 'var(--color-navy)',
        paper: 'var(--color-paper)',
        parchment: 'var(--color-parchment)',
        ink: 'var(--color-ink)',
        'navy-muted': 'var(--color-navy-muted)',
        'navy-tint': 'var(--color-navy-tint)',
        crimson: 'var(--color-crimson)',
        'crimson-soft': 'var(--color-crimson-soft)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
      },
      fontFamily: {
        cardo: ['var(--font-cardo)', 'Charter', 'serif'],
        vollkorn: ['var(--font-vollkorn)', 'Georgia', 'serif'],
        alegreya: ['var(--font-alegreya)', 'Crimson Text', 'serif'],
        inter: ['var(--font-inter)', 'Helvetica Neue', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '7': 'var(--space-7)',
        '8': 'var(--space-8)',
      },
      maxWidth: {
        prose: '680px',
      },
      borderColor: {
        subtle: 'var(--border-subtle)',
        default: 'var(--border-default)',
        strong: 'var(--border-strong)',
      },
    },
  },
  plugins: [],
}

export default config
