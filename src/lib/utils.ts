import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { BmiCategory, GoalType } from "@/types/progress"

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

export type ChangeMeaning = "positive" | "negative" | "neutral"
export type Direction = "increase" | "decrease" | "stable"

export function getChangeMeaning(
  goal: GoalType | null | undefined,
  metric: string,
  diff: number | null
): ChangeMeaning {
  if (diff === null || diff === 0) return "neutral"
  const direction: Direction = diff > 0 ? "increase" : "decrease"
  const goalType = goal || "general_health"

  // 1. Objetivo: ganar masa
  if (goalType === "gain_muscle") {
    if (["arm", "chest", "leg"].includes(metric)) {
      return direction === "increase" ? "positive" : "negative"
    }
    return "neutral"
  }

  // 2. Objetivo: bajar grasa
  if (goalType === "lose_fat") {
    if (["weight", "waist"].includes(metric)) {
      return direction === "decrease" ? "positive" : "negative"
    }
    return "neutral"
  }

  // 3. Objetivo: mantener
  if (goalType === "maintain") {
    const absDiff = Math.abs(diff)
    if (metric === "weight") {
      return absDiff > 2.0 ? "negative" : "neutral"
    }
    return absDiff > 1.5 ? "negative" : "neutral"
  }

  // 4. Otros objetivos
  return "neutral"
}
