/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Compliance-specific colors
        drift: {
          critical: '#DC2626',
          high: '#EA580C',
          medium: '#D97706',
          low: '#2563EB',
        },
        compliance: {
          met: '#16A34A',
          partial: '#D97706',
          gap: '#DC2626',
          pending: '#6B7280',
        },
      },
    },
  },
  plugins: [],
}
