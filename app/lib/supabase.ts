// app/lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Auditoria defensiva de injeção em runtime
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    `[ORION ERRO CRÍTICO] Chaves de injeção pública do Supabase não foram detectadas no navegador! ` +
    `Certifique-se de que o arquivo .env.local esteja preenchido corretamente.`
  );
}

// -- O createBrowserClient assegura que os tokens de autenticação trafeguem via Cookies,
// -- permitindo sincronismo imediato com o arquivo de middleware.ts no lado do servidor.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);