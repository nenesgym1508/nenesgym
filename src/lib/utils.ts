import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { BmiCategory } from "@/types/progress"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCOP(cents: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

// Para montos que ya vienen en pesos (no en centavos), como el monto
// detectado por la IA en un comprobante — no dividir entre 100.
export function formatPesos(pesos: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pesos)
}

export function computePlanDiscount(planPriceCents: number, planDays: number, singleDayPriceCents: number): number {
  if (planDays <= 1) return 0
  const fullPrice = planDays * singleDayPriceCents
  return fullPrice > 0 ? Math.round((1 - planPriceCents / fullPrice) * 100) : 0
}

export function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight"
  if (bmi < 25) return "normal"
  if (bmi < 30) return "overweight"
  return "obese"
}
