/**
 * La clave de un grupo muscular («pecho», «antebrazo»…).
 *
 * Era una lista fija de 11; desde la migración 045 el gimnasio agrega los suyos
 * (tabla `muscle_groups`), así que es cualquier texto. Los 11 de siempre siguen en
 * `MUSCLE_GROUP_LABELS` como respaldo, y el nombre que se muestra sale siempre de
 * `etiquetaDeGrupo`, nunca de indexar el mapa directo: un grupo nuevo no está en
 * él, y `MUSCLE_GROUP_LABELS[clave].toLowerCase()` tumbaba la agenda de clases.
 */
export type MuscleGroup = string

export type Equipment =
  | "peso_corporal" | "mancuernas" | "barra" | "maquina"
  | "polea" | "banda" | "caminadora" | "bicicleta" | "otro"

// ⚠️ "crossfit" es una metodología, no una clase de movimiento como las otras
// cinco. Y este campo es de UN SOLO valor, así que marcar un thruster como
// crossfit lo saca del filtro "Fuerza". Se eligió así a propósito (ver
// migración 035); si algún día estorba, la salida es un campo de disciplina
// aparte con varios valores, no quitar este.
export type ExerciseType = "fuerza" | "cardio" | "movilidad" | "estiramiento" | "tecnica" | "crossfit"

// Uso recomendado del ejercicio dentro de una rutina. Un ejercicio puede
// tener más de una etiqueta (ej. bicicleta estática: calentamiento + cardio).
export type UsageTag = "calentamiento" | "trabajo_principal" | "complementario" | "estiramiento"

export interface Exercise {
  id: string
  gym_id: string
  name: string
  muscle_group: MuscleGroup | null
  secondary_muscle_groups: MuscleGroup[] | null
  equipment: Equipment | null
  exercise_type: ExerciseType | null
  usage_tags: UsageTag[]
  instructions: string | null
  /**
   * Portada. Sigue siendo la que leen TODAS las miniaturas del proyecto, así que
   * no se puede quitar: es `media_urls[0]` duplicada a propósito.
   */
  media_url: string | null
  /** Galería, hasta 3. La base garantiza el tope (migración 033). */
  media_urls?: string[] | null
  source: string | null
  external_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  visibility: "gym" | "client"
  owner_client_id: string | null
  created_by_role: "admin" | "client"
}

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  pecho: "Pecho",
  espalda: "Espalda",
  pierna: "Pierna",
  hombro: "Hombro",
  biceps: "Bíceps",
  triceps: "Tríceps",
  abdomen: "Abdomen",
  gluteo: "Glúteo",
  cardio: "Cardio",
  movilidad: "Movilidad",
  full_body: "Full Body",
}

/** Un grupo muscular del catálogo del gimnasio (tabla `muscle_groups`). */
export interface GrupoMuscular {
  key: string
  label: string
}

/** Los 11 de siempre, en su orden: lo que hay antes de la 045 o si la tabla no responde. */
export const GRUPOS_MUSCULARES_DE_SIEMPRE: GrupoMuscular[] = Object.entries(MUSCLE_GROUP_LABELS).map(
  ([key, label]) => ({ key, label })
)

/**
 * El nombre visible de un grupo: el del catálogo si se tiene, el de los 11 de
 * siempre si es uno de ellos, y si no la clave legible («antebrazo» → «Antebrazo»).
 * Nunca vacío ni undefined: una etiqueta que falta no puede tumbar una pantalla.
 */
export function etiquetaDeGrupo(clave: string | null | undefined, grupos?: GrupoMuscular[]): string {
  if (!clave) return ""
  const delCatalogo = grupos?.find((g) => g.key === clave)?.label
  if (delCatalogo) return delCatalogo
  if (MUSCLE_GROUP_LABELS[clave]) return MUSCLE_GROUP_LABELS[clave]
  const legible = clave.replace(/_/g, " ")
  return legible.charAt(0).toUpperCase() + legible.slice(1)
}

/**
 * La clave de un grupo nuevo a partir de su nombre: «Cuádriceps» → «cuadriceps»,
 * «Tren superior» → «tren_superior». Es lo que guardan los ejercicios, y no
 * cambia aunque después se renombre la etiqueta.
 */
export function claveDeGrupo(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  peso_corporal: "Peso corporal",
  mancuernas: "Mancuernas",
  barra: "Barra",
  maquina: "Máquina",
  polea: "Polea",
  banda: "Banda",
  caminadora: "Caminadora",
  bicicleta: "Bicicleta",
  otro: "Otro",
}

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  fuerza: "Fuerza",
  cardio: "Cardio",
  movilidad: "Movilidad",
  estiramiento: "Estiramiento",
  tecnica: "Técnica",
  crossfit: "CrossFit",
}

export const USAGE_TAG_LABELS: Record<UsageTag, string> = {
  calentamiento: "Calentamiento",
  trabajo_principal: "Principal",
  complementario: "Complementario",
  estiramiento: "Estiramiento",
}

// Fallback para ejercicios sin usage_tags asignado (ej. creados por un
// cliente sin completar ese campo): deriva un uso razonable de exercise_type
// para que el filtro "Uso" nunca los deje fuera de todas las categorías.
const USAGE_TAG_FALLBACK_BY_TYPE: Record<ExerciseType, UsageTag[]> = {
  cardio: ["calentamiento", "complementario"],
  movilidad: ["calentamiento", "estiramiento"],
  estiramiento: ["estiramiento"],
  tecnica: ["trabajo_principal"],
  fuerza: ["trabajo_principal", "complementario"],
  // Un WOD es el bloque central de la sesión, y muchos movimientos valen
  // además como complementario. Nunca como calentamiento ni estiramiento.
  crossfit: ["trabajo_principal", "complementario"],
}

export function getEffectiveUsageTags(ex: Pick<Exercise, "usage_tags" | "exercise_type">): UsageTag[] {
  if (ex.usage_tags && ex.usage_tags.length > 0) return ex.usage_tags
  if (ex.exercise_type) return USAGE_TAG_FALLBACK_BY_TYPE[ex.exercise_type]
  return ["trabajo_principal"]
}
