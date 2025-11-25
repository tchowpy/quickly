/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,ts,tsx}',
    './components/**/*.{js,ts,tsx}',
    './screens/**/*.{js,ts,tsx}',
    './hooks/**/*.{js,ts,tsx}',
    './navigation/**/*.{js,ts,tsx}',
    './store/**/*.{js,ts,tsx}',
    './utils/**/*.{js,ts,tsx}',
    './lib/**/*.{js,ts,tsx}',
    './src/**/*.{js,ts,tsx}',
  ],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
