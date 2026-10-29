#!/usr/bin/env node
// Windows-compatible native esbuild build with Tailwind/PostCSS processing.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

const projectRoot = __dirname;
const esbuildBinary = path.join(
  projectRoot,
  'node_modules',
  '@esbuild',
  'win32-x64',
  'esbuild.exe'
);
const srcDir = path.join(projectRoot, 'src');
const distDir = path.join(projectRoot, 'dist');

async function build() {
  if (!fs.existsSync(esbuildBinary)) {
    throw new Error(`esbuild binary not found: ${esbuildBinary}`);
  }

  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  const publicDir = path.join(projectRoot, 'public');
  if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, distDir, { recursive: true });
  }

  const buildCmd =
    `"${esbuildBinary}" "${path.join(srcDir, 'main.tsx')}" ` +
    `--bundle --outdir="${path.join(distDir, 'assets')}" ` +
    `--platform=browser --format=esm --target=es2020 ` +
    `--loader:.tsx=tsx --loader:.ts=ts ` +
    `--loader:.jsx=jsx --loader:.js=js ` +
    `--sourcemap --entry-names=[name]-[hash] ` +
    `--chunk-names=[name]-[hash] --asset-names=[name]-[hash]`;

  execSync(buildCmd, { cwd: projectRoot, stdio: 'inherit' });

  const assetsDir = path.join(distDir, 'assets');
  const cssFile = fs.readdirSync(assetsDir)
    .find(file => file.endsWith('.css') && !file.endsWith('.map'));
  const jsFile = fs.readdirSync(assetsDir)
    .find(file => file.endsWith('.js') && !file.endsWith('.map'));

  if (!jsFile) throw new Error('No JavaScript bundle was generated.');
  if (!cssFile) throw new Error('No CSS bundle was generated.');

  // Process the generated CSS through the project's existing Tailwind config.
  const cssPath = path.join(assetsDir, cssFile);
  const css = fs.readFileSync(cssPath, 'utf8');
  const result = await postcss([
    tailwindcss(path.join(projectRoot, 'tailwind.config.js')),
    autoprefixer()
  ]).process(css, {
    from: cssPath,
    to: cssPath,
    map: false
  });

  fs.writeFileSync(cssPath, result.css);

  if (/@tailwind\b|@apply\b/.test(result.css)) {
    throw new Error('Tailwind directives remain unprocessed in generated CSS.');
  }

  let html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  html = html.replace(/\/src\/main\.tsx/, `/assets/${jsFile}`);

  // Replace an existing stylesheet reference, or add one if absent.
  if (/<link\b[^>]*rel=["']stylesheet["'][^>]*>/i.test(html)) {
    html = html.replace(
      /<link\b[^>]*rel=["']stylesheet["'][^>]*>/i,
      `<link rel="stylesheet" href="/assets/${cssFile}">`
    );
  } else {
    html = html.replace(
      '</head>',
      `  <link rel="stylesheet" href="/assets/${cssFile}">\n</head>`
    );
  }

  fs.writeFileSync(path.join(distDir, 'index.html'), html);

  console.log('Build completed successfully!');
  console.log('Generated files:', { js: jsFile, css: cssFile });
  console.log('Tailwind/PostCSS processing completed.');
}

build().catch(error => {
  console.error('Build failed:', error.message);
  process.exit(1);
});
