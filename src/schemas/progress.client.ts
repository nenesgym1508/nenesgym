import type { Resolver } from "react-hook-form"

/**
 * Validación del formulario de progreso, sin zod.
 *
 * Antes esto era `zodResolver(progressRecordSchema)`. Como el formulario es un
 * componente cliente, importar el schema arrastraba **zod entero al navegador**:
 * ~285 KB de JavaScript para comprobar siete rangos numéricos, descargados por
 * cada usuario en cada visita. zod sigue siendo la herramienta correcta en el
 * servidor, donde su peso no lo paga nadie; aquí no compensaba ni de lejos.
 *
 * Si se añade un campo, hay que añadirlo también a RANGES.
 */

export interface ProgressInput {
  weight_kg?: number
  height_cm?: number
  waist_cm?: number
  chest_cm?: number
  arm_cm?: number
  leg_cm?: number
  note?: string
}

const RANGES: Record<string, { min: number; max: number; label: string; unit: string }> = {
  weight_kg: { min: 20, max: 300, label: "Peso", unit: "kg" },
  height_cm: { min: 50, max: 250, label: "Estatura", unit: "cm" },
  waist_cm: { min: 30, max: 200, label: "Cintura", unit: "cm" },
  chest_cm: { min: 30, max: 200, label: "Pecho", unit: "cm" },
  arm_cm: { min: 10, max: 100, label: "Brazo", unit: "cm" },
  leg_cm: { min: 20, max: 150, label: "Pierna", unit: "cm" },
}

const MAX_NOTE = 300

export const progressResolver: Resolver<ProgressInput> = async (values) => {
  const errors: Record<string, { type: string; message: string }> = {}

  for (const [field, r] of Object.entries(RANGES)) {
    const raw = values[field as keyof ProgressInput]
    // Vacío es válido: todas las medidas son opcionales.
    if (raw === undefined || raw === null || raw === "") continue

    const n = Number(raw)
    if (Number.isNaN(n)) {
      errors[field] = { type: "type", message: `Ingresa un número válido` }
    } else if (n < r.min) {
      errors[field] = { type: "min", message: `${r.label} mínimo ${r.min} ${r.unit}` }
    } else if (n > r.max) {
      errors[field] = { type: "max", message: `${r.label} máximo ${r.max} ${r.unit}` }
    }
  }

  if (typeof values.note === "string" && values.note.length > MAX_NOTE) {
    errors.note = { type: "max", message: `Máximo ${MAX_NOTE} caracteres` }
  }

  return Object.keys(errors).length
    ? { values: {}, errors: errors as never }
    : { values, errors: {} }
}
