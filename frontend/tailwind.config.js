/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                finance: {
                    bg: '#f0f2f5',
                    card: '#ffffff',
                    primary: '#0a0a0b',
                    danger: '#ef4444',
                    success: '#22c55e',
                    info: '#3b82f6',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
