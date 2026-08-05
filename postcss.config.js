import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import postcssImport from 'postcss-import';

const config = {
  plugins: [
    postcssImport,
    tailwindcss,
    autoprefixer,
  ],
};

export default config;