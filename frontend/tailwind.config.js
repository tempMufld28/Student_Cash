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
                finance: {
                    bg:          'var(--finance-bg)',
                    card:        'var(--finance-card)',
                    primary:     'var(--finance-primary)',
                    danger:      '#ef4444',
                    success:     '#22c55e',
                    info:        '#3b82f6',
                    text:        'var(--finance-text)',
                    input:       'var(--finance-input)',
                    inputBorder: 'var(--finance-inputBorder)',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
