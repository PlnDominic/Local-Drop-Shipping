/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./views/**/*.{js,ts,jsx,tsx}",
    "./store/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#006B3F', // Dark Green
          dark: '#004d2e',
          light: '#e6f3ec',
        },
        accent: {
          DEFAULT: '#FCD116', // Gold
          dark: '#d6b00c',
          light: '#fffde6',
        },
        success: {
          DEFAULT: '#10B981', // Emerald
          dark: '#059669',
          light: '#ecfdf5',
        },
        neutral: {
          dark: '#111827',
          gray: '#6B7280',
          light: '#F9FAFB',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 10px 30px -10px rgba(0, 107, 63, 0.08)',
        'premium-hover': '0 20px 40px -15px rgba(0, 107, 63, 0.15)',
        'accent-glow': '0 0 15px rgba(252, 209, 22, 0.4)',
      }
    },
  },
  plugins: [],
}
