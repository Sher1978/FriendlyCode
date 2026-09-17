/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand': '#38a3f1', // Friendly Blue from Flutter
                'brand-dark': '#1e88e5',
                'surface': '#f3f4f6', // Grey-100
                'brand-orange': '#E68A00',
                'brand-orange-light': '#FFB74D',
                'brand-green': '#81C784',
                'brand-brown': '#4E342E',
                'background-cream': '#FFF8E1',
                'surface-cream': '#FFFFFF',
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
        },
    },
    plugins: [],
}
