/**
 * config.js
 * Configuración central y credenciales por defecto de OrganizaAI.
 */

let localConfig = {};
try {
  // Intentar cargar credenciales privadas si existen (config.local.js ignorado en Git)
  const localModule = await import('./config.local.js');
  localConfig = localModule.LOCAL_CONFIG || {};
} catch {
  // Sin config.local.js
}

export const APP_CONFIG = {
  // Supabase (Proyecto en la nube activo)
  SUPABASE_URL: localConfig.SUPABASE_URL || 'https://vhxprfbexizxpllaqeqk.supabase.co',
  SUPABASE_ANON_KEY: localConfig.SUPABASE_ANON_KEY || 'sb_publishable_F2dl38sLX9IfudFb6xK-jA_FpzBTWsQ',

  // OpenRouter (Credencial por defecto: desde config.local.js o servidor)
  DEFAULT_OPENROUTER_KEY: localConfig.OPENROUTER_API_KEY || '',
  DEFAULT_OPENROUTER_MODEL: localConfig.OPENROUTER_MODEL || 'openrouter/free',

  // Modelos verificados
  FALLBACK_MODELS: [
    'openrouter/free',
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-4-31b-it:free'
  ]
};
