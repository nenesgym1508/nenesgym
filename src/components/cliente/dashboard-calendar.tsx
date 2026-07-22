"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { AttendanceLegend } from "@/components/ui/attendance-legend"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { 
  format,
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSunday, 
  isSaturday, 
  addMonths,
  subMonths
} from "date-fns"
import { es } from "date-fns/locale"

interface DashboardCalendarProps {
  currentDateStr: string // "yyyy-MM-dd"
  todayStr: string // "yyyy-MM-dd"
  attendanceDates: string[] // Array de "yyyy-MM-dd"
  integrated?: boolean
  membershipStartDate?: string | null // "yyyy-MM-dd"
  membershipEndDate?: string | null // "yyyy-MM-dd"
  daysPerWeek?: number // 5 o 6 días a la semana
}

function toYmd(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function DashboardCalendar({ 
  currentDateStr, 
  todayStr,
  attendanceDates, 
  integrated = false, 
  membershipStartDate, 
  membershipEndDate,
  daysPerWeek = 6 
}: DashboardCalendarProps) {
  const [activeDateStr, setActiveDateStr] = useState<string>(currentDateStr.split("T")[0])

  const activeDate = new Date(activeDateStr + "T00:00:00")
  const activationStr = membershipStartDate ? membershipStartDate.split("T")[0] : null
  const expirationStr = membershipEndDate ? membershipEndDate.split("T")[0] : null
  const attendanceSet = new Set(attendanceDates.map(d => d.split("T")[0]))

  const monthStart = startOfMonth(activeDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday as start of week
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  })

  const weekDays = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"]

  const Container = integrated ? "div" : Card
  const containerClasses = integrated ? "pt-2" : "p-4 bg-zinc-950/50 border-white/5"

  const currentMonthStr = activeDateStr.slice(0, 7)
  const maxMonthStr = expirationStr ? expirationStr.slice(0, 7) : todayStr.slice(0, 7)
  const showNextButton = currentMonthStr < maxMonthStr

  const handlePrevMonth = () => {
    setActiveDateStr(prev => {
      const prevDate = subMonths(new Date(prev + "T00:00:00"), 1)
      const year = prevDate.getFullYear()
      const month = String(prevDate.getMonth() + 1).padStart(2, "0")
      return `${year}-${month}-01`
    })
  }

  const handleNextMonth = () => {
    setActiveDateStr(prev => {
      const nextDate = addMonths(new Date(prev + "T00:00:00"), 1)
      const year = nextDate.getFullYear()
      const month = String(nextDate.getMonth() + 1).padStart(2, "0")
      return `${year}-${month}-01`
    })
  }

  return (
    <Container className={containerClasses}>
      <div className="flex justify-between items-center mb-5">
        <button 
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-zinc-200"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 select-none">
          Asistencia – {format(activeDate, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
        </h3>

        <button 
          onClick={handleNextMonth}
          disabled={!showNextButton}
          className={`p-1.5 rounded-full transition-colors ${
            showNextButton 
              ? "hover:bg-white/5 text-zinc-400 hover:text-zinc-200 cursor-pointer" 
              : "opacity-20 cursor-not-allowed text-zinc-600"
          }`}
          aria-label="Mes siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-3 text-center mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-[10px] font-semibold text-zinc-600 tracking-wider">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {days.map((day, idx) => {
          const dStr = toYmd(day)
          const isAttended = attendanceSet.has(dStr)
          const inSameMonth = isSameMonth(day, monthStart)
          const isCurrentDay = dStr === todayStr
          const isPast = dStr < todayStr
          const isFutureDay = dStr > todayStr
          const isSun = isSunday(day)
          const isSat = isSaturday(day)
          const isBeforeActivation = activationStr ? dStr < activationStr : false
          const isActivationDay = activationStr ? dStr === activationStr : false
          const isExpirationDay = expirationStr ? dStr === expirationStr : false
          
          const isFreeDay = daysPerWeek === 5 ? (isSun || isSat) : isSun
          const isMissed = inSameMonth && isPast && !isAttended && !isFreeDay && !isBeforeActivation

          const isInPlanPeriod = activationStr && expirationStr
            ? (dStr >= activationStr && dStr <= expirationStr)
            : activationStr
            ? (dStr >= activationStr)
            : false

          const isUpcomingPlanDay = inSameMonth && isFutureDay && isInPlanPeriod && !isFreeDay

          let dayClasses = "relative text-[12px] font-medium transition-[background-color,color,border-color,box-shadow,transform] flex items-center justify-center w-7 h-7 rounded-full "

          if (isCurrentDay && isAttended) {
            dayClasses += "bg-green-600/60 border border-green-500/50 text-white font-bold scale-110"
          } else if (isCurrentDay) {
            dayClasses += "bg-red-600 text-white shadow-[0_0_18px_rgba(220,38,38,0.7)] font-bold scale-110"
          } else if (isAttended) {
            dayClasses += "bg-green-600/60 border border-green-500/50 text-white font-semibold"
          } else if (isMissed || isUpcomingPlanDay) {
            dayClasses += "bg-red-500/25 border border-red-500/40 text-red-200"
          } else if (!inSameMonth) {
            dayClasses += "text-zinc-700"
          } else {
            dayClasses += "text-zinc-300 hover:bg-white/5"
          }

          if (isCurrentDay) {
            dayClasses += " ring-2 ring-white ring-offset-2 ring-offset-zinc-950"
          } else if (isActivationDay) {
            dayClasses += " ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-950"
          } else if (isExpirationDay) {
            dayClasses += " ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-950"
          }

          return (
            <div key={idx} className="flex items-center justify-center h-9">
              <span className={dayClasses}>
                {format(day, "d")}
              </span>
            </div>
          )
        })}
      </div>
      
      {/* Leyenda */}
      <AttendanceLegend className="mt-5 border-t border-white/5 pt-4" />
    </Container>
  )
}
