"use client"

import { useState, useTransition } from "react"
import { Check, Undo, Loader2 } from "lucide-react"
import { markRoutineSessionAction, undoRoutineSessionAction } from "@/actions/routines.actions"

interface MarkDoneTodayBarProps {
  routineId: string
  activeDayId: string | null
  initialHasSession: boolean
  sessionDate: string
}

export function MarkDoneTodayBar({
  routineId,
  activeDayId,
  initialHasSession,
  sessionDate
}: MarkDoneTodayBarProps) {
  const [hasSession, setHasSession] = useState(initialHasSession)
  const [isPending, startTransition] = useTransition()

  const handleMark = () => {
    startTransition(async () => {
      if (hasSession) {
        const res = await undoRoutineSessionAction(routineId, sessionDate)
        if (!res.error) setHasSession(false)
      } else {
        const res = await markRoutineSessionAction(routineId, activeDayId, sessionDate)
        if (!res.error) setHasSession(true)
      }
    })
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 border-t border-white/8 bg-zinc-950/90 backdrop-blur-md p-4 flex gap-3 z-40">
      <button
        onClick={handleMark}
        disabled={isPending}
        className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
          hasSession
            ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            : "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/10"
        }`}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : hasSession ? (
          <>
            <Undo className="size-4" /> Desmarcar día de hoy
          </>
        ) : (
          <>
            <Check className="size-4" /> Marcar como hecho hoy
          </>
        )}
      </button>
    </div>
  )
}
