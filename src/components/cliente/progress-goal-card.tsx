"use client"

import { useState, useTransition } from "react"
import { Target, ChevronDown } from "lucide-react"
import { setProgressGoalAction } from "@/actions/progress.actions"
import { GOAL_LABELS } from "@/types/progress"
import type { GoalType, ProgressGoal } from "@/types/progress"

const GOAL_OPTIONS: GoalType[] = [
  "gain_muscle",
  "lose_fat",
  "maintain",
  "improve_strength",
  "improve_consistency",
  "general_health",
]

interface GoalCardProps {
  goal: ProgressGoal | null
}

export function GoalCard({ goal }: GoalCardProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [current, setCurrent] = useState<GoalType | null>(
    goal?.goal_type as GoalType | null ?? null
  )

  const select = (type: GoalType) => {
    setCurrent(type)
    setOpen(false)
    startTransition(() => {
      setProgressGoalAction(type)
    })
  }

  return (
    <div className="relative rounded-2xl border border-white/8 bg-zinc-900/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
        Mi objetivo
      </p>
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="flex w-full items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <Target className="size-4 text-red-500 shrink-0" />
          <span className="text-sm font-semibold text-zinc-100">
            {current ? GOAL_LABELS[current] : "Elige un objetivo"}
          </span>
        </div>
        <ChevronDown
          className={`size-4 text-zinc-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-2 overflow-hidden rounded-xl border border-white/8 bg-zinc-800">
          {GOAL_OPTIONS.map((type) => (
            <button
              key={type}
              onClick={() => select(type)}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-zinc-700 ${
                current === type ? "text-red-400 font-semibold" : "text-zinc-300"
              }`}
            >
              {GOAL_LABELS[type]}
              {current === type && <span className="text-red-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
