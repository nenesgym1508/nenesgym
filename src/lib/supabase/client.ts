'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

/**
 * Cliente de Supabase para el navegador.
 *
 * ⚠️ NO importar `@/lib/env` aquí. Ese módulo valida el entorno con zod, y como
 * este archivo corre en el navegador, importarlo arrastraba **zod entero al
 * bundle del cliente**: ~285 KB de JavaScript descargados por cada usuario en
 * cada visita, para comprobar dos cadenas de texto.
 *
 * No se pierde nada: las dos variables son `NEXT_PUBLIC_`, así que Next las
 * incrusta en tiempo de compilación. Si faltaran, el build ya saldría roto —
 * revalidarlas en el navegador no protegía de nada. `@/lib/env` sigue validando
 * el entorno completo en el servidor, que es donde sí importa.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function createClient() {
  if (!url || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el build.'
    )
  }
  return createBrowserClient<Database>(url, anonKey)
}
