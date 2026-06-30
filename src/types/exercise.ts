export type MuscleGroup =
  | "pecho" | "espalda" | "pierna" | "hombro"
  | "biceps" | "triceps" | "abdomen" | "gluteo" | "cardio"
  | "movilidad" | "full_body"

export type Equipment =
  | "peso_corporal" | "mancuernas" | "barra" | "maquina"
  | "polea" | "banda" | "caminadora" | "bicicleta" | "otro"

export type ExerciseType = "fuerza" | "cardio" | "movilidad" | "estiramiento" | "tecnica"

export interface Exercise {
  id: string
  gym_id: string
  name: string
  muscle_group: MuscleGroup | null
  secondary_muscle_groups: MuscleGroup[] | null
  equipment: Equipment | null
  exercise_type: ExerciseType | null
  instructions: string | null
  media_url: string | null
  source: string | null
  external_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
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
