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
  const [error, setError] = useState<string | null>(null)

  const select = (type: GoalType) => {
    const previous = current
    setCurrent(type)
    setError(null)
    setOpen(false)
    startTransition(async () => {
      const result = await setProgressGoalAction(type)
      if (result.error) {
        setCurrent(previous)
        setError(result.error)
      }
    })
  }

  return (
    <div className="relative rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-5 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
        Mi objetivo
      </p>
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="flex w-full items-center justify-between gap-2"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full border border-red-500/40 shadow-[0_0_10px_rgba(220,38,38,0.15)] flex items-center justify-center bg-zinc-950 shrink-0">
            <Target className="size-5 text-red-500" />
          </div>
          <span className="font-bebas text-lg tracking-wide uppercase text-white">
            {current ? GOAL_LABELS[current] : "Elige un objetivo"}
          </span>
        </div>
        <ChevronDown
          className={`size-4 text-zinc-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3 overflow-hidden rounded-xl border border-white/8 bg-zinc-950">
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

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
