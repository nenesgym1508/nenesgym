"use server"

import { updateTag } from "next/cache"
import { requireAdmin } from "@/lib/auth/require-admin"
import { GYM_ID } from "@/constants/plans"
import { getMuscleGroups } from "@/services/muscle-groups.service"
import { claveDeGrupo, type GrupoMuscular } from "@/types/exercise"

/** El catálogo, para los componentes de cliente (formularios, filtros, rutinas). */
export async function getMuscleGroupsAction(): Promise<GrupoMuscular[]> {
  return getMuscleGroups()
}

/**
 * Agrega un grupo muscular al catálogo del gimnasio. Solo el admin.
 *
 * Si ya existe uno con ese nombre (sin mirar tildes ni mayúsculas) se devuelve
 * ese en vez de dar error: quien escribe «gluteo» quiere Glúteo, no un aviso.
 */
export async function createMuscleGroupAction(
  nombre: string
): Promise<{ error: string } | { grupo: GrupoMuscular }> {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error ?? "Sin permisos" }

  const label = nombre.trim().replace(/\s+/g, " ").slice(0, 40)
  const key = claveDeGrupo(label)
  if (!label || !key) return { error: "Escribe el nombre del grupo, por ejemplo «Antebrazo»." }

  const actuales = await getMuscleGroups()
  const yaEsta = actuales.find((g) => g.key === key || claveDeGrupo(g.label) === key)
  if (yaEsta) return { grupo: yaEsta }

  // Con letra inicial mayúscula, como los de siempre: «antebrazo» → «Antebrazo».
  const etiqueta = label.charAt(0).toUpperCase() + label.slice(1)
  const { error } = await guard.supabase
    .from("muscle_groups")
    .insert({ gym_id: GYM_ID, key, label: etiqueta, position: 100 })

  if (error) {
    // 42P01: la tabla no existe todavía (falta aplicar la migración 045).
    if (error.code === "42P01") return { error: "Todavía no se pueden agregar grupos: falta activar esta función." }
    // 23505: lo creó alguien más hace un instante. Vale el que ya está.
    if (error.code !== "23505") return { error: "No se pudo agregar el grupo. Intenta otra vez." }
  }
  updateTag("muscle-groups")
  return { grupo: { key, label: etiqueta } }
}
