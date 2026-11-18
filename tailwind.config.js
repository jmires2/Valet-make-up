/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        crema: '#FBF6F1',
        rosa: '#E8C4C4',
        'rosa-claro': '#F4E3E1',
        bordo: '#7A1F3D',
        tinta: '#2E2428',
        gris: '#6E6266',
        linea: '#E6D9D2',
        alerta: '#9A3412',
        ok: '#3F5E3A',
      },
      fontFamily: {
        titulo: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        texto: ['Karla', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
