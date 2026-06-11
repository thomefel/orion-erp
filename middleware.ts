// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // TELEMETRIA DEFENSIVA: Captura se o Next.js Edge Runtime perdeu as chaves de ambiente
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(`[ORION ADVERTÊNCIA] Variáveis do Supabase ausentes no Middleware Edge Runtime. URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}`);
    
    // Se estiver na tela de login, deixa passar para não congelar a UI
    if (req.nextUrl.pathname.startsWith('/login')) {
      return res;
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
        },
        // CORREÇÃO VISUAL SÊNIOR: Adicionada a tipagem explícita do array estrutural de cookies
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Redirecionamentos de rota baseados em sessão ativa
    if (!session && !req.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (session && req.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  } catch (error) {
    console.error("[ORION MIDDLEWARE EXCEPTION]", error);
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};