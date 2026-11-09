/**
 * scripts/sync-public.js
 * Sincroniza automáticamente los archivos de la raíz con la carpeta public/
 * para garantizar que ambos entornos de hosting (Express y Vercel/Static)
 * permanezcan 100% consistentes y sin desincronizaciones humanas.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const filesToSync = [
  'index.html',
  'app.js',
  'style.css',
  'sw.js',
  'manifest.json',
  'icon.svg'
];

console.log('🔄 Sincronizando archivos raíz -> public/...');

// 1. Archivos base
filesToSync.forEach(file => {
  const src = path.join(rootDir, file);
  const dest = path.join(publicDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ ${file}`);
  }
});

// 2. Carpeta js/
const jsSrcDir = path.join(rootDir, 'js');
const jsDestDir = path.join(publicDir, 'js');
if (fs.existsSync(jsSrcDir)) {
  if (!fs.existsSync(jsDestDir)) {
    fs.mkdirSync(jsDestDir, { recursive: true });
  }
  const jsFiles = fs.readdirSync(jsSrcDir);
  jsFiles.forEach(jsFile => {
    const src = path.join(jsSrcDir, jsFile);
    const dest = path.join(jsDestDir, jsFile);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
      console.log(`  ✓ js/${jsFile}`);
    }
  });
}

console.log('✅ Sincronización completada exitosamente.');
