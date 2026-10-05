import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { GYM_ID } from "@/constants/plans"
import { GRUPOS_MUSCULARES_DE_SIEMPRE, type GrupoMuscular } from "@/types/exercise"

/**
 * Los grupos musculares activos del gimnasio, en su orden (tabla `muscle_groups`,
 * migración 045).
 *
 * Con el cliente de servicio y en caché (etiqueta "muscle-groups") como
 * `getGymSettings`: es el mismo catálogo para todos y cambia solo cuando el admin
 * agrega uno. Si la tabla todavía no existe (antes de aplicar la 045) o no
 * responde, devuelve los 11 de siempre: el formulario nunca se queda sin opciones.
 */
export function getMuscleGroups(): Promise<GrupoMuscular[]> {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from("muscle_groups")
        .select("key, label")
        .eq("gym_id", GYM_ID)
        .eq("is_active", true)
        .order("position")
        .order("label")
      if (error || !data || data.length === 0) return GRUPOS_MUSCULARES_DE_SIEMPRE
      return data as GrupoMuscular[]
    },
    ["muscle-groups"],
    { revalidate: 3600, tags: ["muscle-groups"] }
  )()
}
