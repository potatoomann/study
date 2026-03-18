/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'poppins': ['Poppins', 'sans-serif'],
                'inter': ['Inter', 'sans-serif'],
                // aliases keep existing font-baloo / font-nunito / font-caveat classes working
                'baloo': ['Poppins', 'sans-serif'],
                'nunito': ['Inter', 'sans-serif'],
                'caveat': ['Poppins', 'sans-serif'],
            },
            colors: {
                primary: '#4F46E5',
                'primary-dark': '#3730A3',
                secondary: '#0D9488',
                accent: '#F59E0B',
                coral: '#F43F5E',
                sky: '#0EA5E9',
                mint: '#10B981',
                cream: '#F9FAFB',
                purple: '#7C3AED',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'float-delayed': 'float 8s ease-in-out 2s infinite',
                'bounce-slow': 'bounce 3s infinite',
                'spin-slow': 'spin 3s linear infinite',
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'slide-in-right': 'slideInRight 0.4s ease-out',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
                'wiggle': 'wiggle 1s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                    '33%': { transform: 'translateY(-20px) rotate(5deg)' },
                    '66%': { transform: 'translateY(-10px) rotate(-3deg)' },
                },
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(30px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(100%)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(79,70,229,0.3)' },
                    '50%': { boxShadow: '0 0 40px rgba(79,70,229,0.6)' },
                },
                wiggle: {
                    '0%, 100%': { transform: 'rotate(-3deg)' },
                    '50%': { transform: 'rotate(3deg)' },
                }
            },
            backgroundImage: {
                'cream-gradient': 'linear-gradient(135deg, #F9FAFB 0%, #EEF2FF 50%, #F0FDFA 100%)',
            }
        },
    },
    plugins: [],
}
