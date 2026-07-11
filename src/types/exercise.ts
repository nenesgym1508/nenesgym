export type MuscleGroup =
  | "pecho" | "espalda" | "pierna" | "hombro"
  | "biceps" | "triceps" | "abdomen" | "gluteo" | "cardio"
  | "movilidad" | "full_body"

export type Equipment =
  | "peso_corporal" | "mancuernas" | "barra" | "maquina"
  | "polea" | "banda" | "caminadora" | "bicicleta" | "otro"

export type ExerciseType = "fuerza" | "cardio" | "movilidad" | "estiramiento" | "tecnica"

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
  media_url: string | null
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
}

export function getEffectiveUsageTags(ex: Pick<Exercise, "usage_tags" | "exercise_type">): UsageTag[] {
  if (ex.usage_tags && ex.usage_tags.length > 0) return ex.usage_tags
  if (ex.exercise_type) return USAGE_TAG_FALLBACK_BY_TYPE[ex.exercise_type]
  return ["trabajo_principal"]
}
