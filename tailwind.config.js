/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    ink: '#17233C',
                    charcoal: '#1F2937',
                    muted: '#667085',
                    sand: '#F6EFE5',
                    cream: '#FFFDF8',
                    border: '#E3D7C7',
                    clay: {
                        50: '#FDF1ED',
                        100: '#F8DDD5',
                        500: '#C55A43',
                        600: '#B94A35',
                        700: '#963A29',
                    },
                    ocean: {
                        50: '#EAF3F7',
                        100: '#D8E8F0',
                        500: '#2A6F97',
                        600: '#235E80',
                        700: '#1D4D69',
                    },
                    teal: {
                        50: '#E7F4F1',
                        100: '#D1EAE5',
                        600: '#2A7F74',
                        700: '#21665D',
                    },
                    amber: '#C98513',
                },
            },
            boxShadow: {
                soft: '0 18px 45px -24px rgba(23, 35, 60, 0.35)',
            },
        },
    },
    plugins: [],
}
