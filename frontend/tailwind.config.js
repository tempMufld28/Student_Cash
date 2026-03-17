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
                    bg: '#F5F1E9',
                    card: '#FFFFFF',
                    primary: '#A68A64',
                    danger: '#ef4444',
                    success: '#22c55e',
                    info: '#3b82f6',
                    text: '#3C2F2F',
                    input: '#FDFBF7',
                    inputBorder: '#DDB892',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
