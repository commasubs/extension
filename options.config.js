/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./content/options.{html,js}"],
  theme: {
    extend: {
      colors: {
        'comma': {
          '50': '#f5f8f8',
          '100': '#dcebe9',
          '200': '#b9d6d1',
          '300': '#8fb9b4',
          '400': '#679a95',
          '500': '#4d7f7b',
          '600': '#3e6866',
          '700': '#335251',
          '800': '#2c4343',
          '900': '#283939',
          '950': '#131f20',
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
