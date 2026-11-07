/**
 * config.js
 * Configuración central y credenciales de OrganizaAI.
 * 
 * Si existe config.local.js (ignorado por Git por seguridad), se cargan sus valores.
 * Si no, usa los valores por defecto.
 */

let localConfig = {};
try {
  // Intentar cargar credenciales locales privadas si existen
  const localModule = await import('./config.local.js');
  localConfig = localModule.LOCAL_CONFIG || {};
} catch {
  // No hay config.local.js, se usan los valores base
}

export const APP_CONFIG = {
  // Supabase (Sincronización en la nube en tiempo real)
  SUPABASE_URL: localConfig.SUPABASE_URL || 'https://xyzcompany.supabase.co',
  SUPABASE_ANON_KEY: localConfig.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',

  // OpenRouter (IA por defecto)
  DEFAULT_OPENROUTER_KEY: localConfig.OPENROUTER_API_KEY || '',
  DEFAULT_OPENROUTER_MODEL: localConfig.OPENROUTER_MODEL || 'openrouter/free',

  // Modelos gratuitos de respaldo
  FALLBACK_MODELS: [
    'openrouter/free',
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-4-31b-it:free'
  ]
};
