"use client"

import { useState } from "react"
import { Plus, Trash2, Edit2, Check, X, ChevronLeft, ChevronRight } from "lucide-react"
import { type Weekday, WEEKDAY_LABELS } from "@/types/routine"

interface Day {
  id: string
  title: string
  weekday: Weekday | null
  position: number
}

interface DayTabBarProps {
  days: Day[]
  activeDayId: string | null
  readOnly?: boolean
  onSelectDay: (id: string) => void
  onAddDay: () => void
  onUpdateDay: (id: string, title: string, weekday: Weekday | null) => void
  onDeleteDay: (id: string) => void
  onMoveDay?: (id: string, direction: "left" | "right") => void
}

const WEEKDAYS: Weekday[] = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"]

export function DayTabBar({
  days,
  activeDayId,
  readOnly = false,
  onSelectDay,
  onAddDay,
  onUpdateDay,
  onDeleteDay,
  onMoveDay,
}: DayTabBarProps) {
  const [editingDayId, setEditingDayId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editWeekday, setEditWeekday] = useState<Weekday | null>(null)

  const handleStartEdit = (day: Day) => {
    if (readOnly) return
    setEditingDayId(day.id)
    setEditTitle(day.title)
    setEditWeekday(day.weekday)
  }

  const handleSave = (id: string) => {
    if (!editTitle.trim()) return
    onUpdateDay(id, editTitle.trim(), editWeekday)
    setEditingDayId(null)
  }

  return (
    <div className="w-full space-y-3">
      {/* Scrollable tab row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {days.map((day) => {
          const isActive = day.id === activeDayId
          const isEditing = day.id === editingDayId

          if (isEditing) {
            return (
              <div key={day.id} className="flex items-center gap-1.5 shrink-0 rounded-xl bg-zinc-900 border border-red-600/30 px-3 py-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-20 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-100 outline-none focus:border-red-600/50"
                  placeholder="Día"
                />
                <select
                  value={editWeekday ?? ""}
                  onChange={(e) => setEditWeekday((e.target.value as Weekday) || null)}
                  className="rounded bg-zinc-800 px-1 py-0.5 text-[11px] text-zinc-300 outline-none"
                >
                  <option value="">Sin día</option>
                  {WEEKDAYS.map((w) => (
                    <option key={w} value={w}>
                      {WEEKDAY_LABELS[w]}
                    </option>
                  ))}
                </select>
                <button onClick={() => handleSave(day.id)} className="text-green-400 hover:text-green-300">
                  <Check className="size-3.5" />
                </button>
                <button onClick={() => setEditingDayId(null)} className="text-zinc-500 hover:text-zinc-300">
                  <X className="size-3.5" />
                </button>
              </div>
            )
          }

          return (
            <div
              key={day.id}
              className={`flex items-center gap-1.5 shrink-0 rounded-xl px-3 py-2 transition-all border ${
                isActive
                  ? "bg-red-600/10 border-red-600/40 text-red-400 font-semibold"
                  : "bg-zinc-900/60 border-white/5 text-zinc-400 hover:border-white/10"
              }`}
            >
              <button
                onClick={() => onSelectDay(day.id)}
                className="text-xs text-left"
              >
                <span>{day.title}</span>
                {day.weekday && (
                  <span className="ml-1 text-[10px] opacity-75 font-normal">
                    ({WEEKDAY_LABELS[day.weekday]})
                  </span>
                )}
              </button>

              {!readOnly && (
                <div className="flex items-center gap-0.5 border-l border-white/10 pl-1 ml-0.5">
                  {onMoveDay && (
                    <>
                      <button
                        onClick={() => onMoveDay(day.id, "left")}
                        disabled={day.position === 0}
                        className="p-0.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                      >
                        <ChevronLeft className="size-3" />
                      </button>
                      <button
                        onClick={() => onMoveDay(day.id, "right")}
                        disabled={day.position === days.length - 1}
                        className="p-0.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                      >
                        <ChevronRight className="size-3" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleStartEdit(day)}
                    className="p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <Edit2 className="size-3" />
                  </button>
                  {days.length > 1 && (
                    <button
                      onClick={() => onDeleteDay(day.id)}
                      className="p-0.5 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {!readOnly && (
          <button
            onClick={onAddDay}
            className="flex items-center justify-center shrink-0 rounded-xl border border-dashed border-white/15 px-3 py-2 text-xs text-zinc-500 hover:border-red-600/40 hover:text-red-400 transition-colors"
          >
            <Plus className="size-3.5 mr-1" />
            Nuevo día
          </button>
        )}
      </div>
    </div>
  )
}
