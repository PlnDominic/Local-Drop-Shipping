/** @type {import('tailwindcss').Config} */
module.exports = {
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
          DEFAULT: '#151515',
          dark: '#000000',
          light: '#f5f5f5',
        },
        accent: {
          DEFAULT: '#f04438',
          dark: '#c0392b',
          light: '#fef2f2',
        },
        success: {
          DEFAULT: '#f04438',
          dark: '#c0392b',
          light: '#fef2f2',
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
        'premium': '0 10px 30px -10px rgba(0,0,0,0.08)',
        'premium-hover': '0 20px 40px -15px rgba(0,0,0,0.15)',
        'accent-glow': '0 0 15px rgba(240, 68, 56, 0.4)',
      }
    },
  },
  plugins: [],
}
