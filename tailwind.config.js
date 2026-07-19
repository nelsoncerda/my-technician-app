/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    ink: '#172B4D',
                    charcoal: '#182230',
                    muted: '#667085',
                    sand: '#F7F8F5',
                    cream: '#FFFFFF',
                    border: '#DCE2E8',
                    control: '#7C8799',
                    // Tool orange: technician, booking, and worksite accents.
                    clay: {
                        50: '#FFF3EC',
                        100: '#FFE2D3',
                        500: '#E86F2D',
                        600: '#B9470F',
                        700: '#96390C',
                    },
                    // Service blue: primary actions, links, focus, and selection.
                    ocean: {
                        50: '#EEF4FF',
                        100: '#DCE8FF',
                        500: '#2F6FED',
                        600: '#255FCF',
                        700: '#1D4EA9',
                        800: '#173C83',
                    },
                    // Verified, available, and successful states.
                    teal: {
                        50: '#E9F7F3',
                        100: '#D2EEE7',
                        600: '#168A72',
                        700: '#106B59',
                        800: '#0B5749',
                    },
                    // Errors, suspensions, destructive actions, and urgent reports.
                    danger: {
                        50: '#FEF1F1',
                        100: '#FCE0E0',
                        200: '#F7BFC0',
                        600: '#C43D3D',
                        700: '#9F2F2F',
                        800: '#812828',
                    },
                    amber: '#C98513',
                },
            },
            boxShadow: {
                soft: '0 18px 45px -24px rgba(23, 43, 77, 0.28)',
            },
        },
    },
    plugins: [],
}
