const fs = require('fs');
const path = require('path');

const keysFile = path.join(__dirname, '..', 'clavesQueUsaras.txt');
const targetLocalConfig = path.join(__dirname, '..', 'js', 'config.local.js');
const targetPublicLocalConfig = path.join(__dirname, '..', 'public', 'js', 'config.local.js');

if (!fs.existsSync(keysFile)) {
  console.log('No se encontró clavesQueUsaras.txt');
  process.exit(0);
}

const content = fs.readFileSync(keysFile, 'utf8').trim();
if (!content) {
  console.log('clavesQueUsaras.txt está vacío por el momento.');
  process.exit(0);
}

const config = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  OPENROUTER_API_KEY: '',
  OPENROUTER_MODEL: 'openrouter/free'
};

// Si viene en formato JSON
if (content.startsWith('{')) {
  try {
    const parsed = JSON.parse(content);
    config.SUPABASE_URL = parsed.supabase_url || parsed.SUPABASE_URL || '';
    config.SUPABASE_ANON_KEY = parsed.supabase_anon_key || parsed.SUPABASE_ANON_KEY || '';
    config.OPENROUTER_API_KEY = parsed.openrouter_api_key || parsed.OPENROUTER_API_KEY || '';
    config.OPENROUTER_MODEL = parsed.openrouter_model || parsed.OPENROUTER_MODEL || 'openrouter/free';
  } catch (e) {
    console.error('Error parseando JSON en clavesQueUsaras.txt:', e.message);
  }
} else {
  // Formato clave=valor o líneas
  const lines = content.split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    if (trimmed.includes('=')) {
      const [k, ...vParts] = trimmed.split('=');
      const key = k.trim().toUpperCase();
      const val = vParts.join('=').trim().replace(/^['"]|['"]$/g, '');

      if (key.includes('SUPABASE_URL') || key === 'URL') config.SUPABASE_URL = val;
      if (key.includes('SUPABASE_ANON') || key.includes('ANON_KEY') || key === 'KEY') config.SUPABASE_ANON_KEY = val;
      if (key.includes('OPENROUTER_API_KEY') || key.includes('OPENROUTER_KEY') || key === 'API_KEY') config.OPENROUTER_API_KEY = val;
      if (key.includes('MODEL')) config.OPENROUTER_MODEL = val;
    } else {
      // Detección heurística de claves sueltas
      if (trimmed.startsWith('https://') && trimmed.includes('supabase.co')) {
        config.SUPABASE_URL = trimmed;
      } else if (trimmed.startsWith('eyJ') && trimmed.length > 50) {
        config.SUPABASE_ANON_KEY = trimmed;
      } else if (trimmed.startsWith('sk-or-v1-')) {
        config.OPENROUTER_API_KEY = trimmed;
      }
    }
  });
}

const fileContent = `/**
 * config.local.js (GENERADO AUTOMÁTICAMENTE - IGNORADO POR GIT)
 * Contiene las credenciales privadas locales.
 */
export const LOCAL_CONFIG = ${JSON.stringify(config, null, 2)};
`;

fs.writeFileSync(targetLocalConfig, fileContent, 'utf8');
fs.writeFileSync(targetPublicLocalConfig, fileContent, 'utf8');
console.log('✅ Credenciales sincronizadas con éxito en config.local.js');
