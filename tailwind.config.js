/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/**/*.{js,ts,jsx,tsx}', // Inclui todos os arquivos em src/
    ],
    theme: {
      extend: {},
    },
    plugins: [require('tailwindcss-animate')], // Adiciona o plugin correto
  };