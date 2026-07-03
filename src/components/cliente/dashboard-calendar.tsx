
import { Card } from "@/components/ui/card"
import { AttendanceLegend } from "@/components/ui/attendance-legend"
import { ChevronRight } from "lucide-react"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, isSunday, isSaturday, startOfDay } from "date-fns"
import { es } from "date-fns/locale"

interface DashboardCalendarProps {
  currentDate: Date
  attendanceDates: Date[]
  integrated?: boolean
  membershipStartDate?: Date
  daysPerWeek?: number // 5 o 6 días a la semana
}

export function DashboardCalendar({ currentDate, attendanceDates, integrated = false, membershipStartDate, daysPerWeek = 6 }: DashboardCalendarProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday as start of week
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const today = startOfDay(new Date())
  const activationDay = membershipStartDate ? startOfDay(membershipStartDate) : null

  const dateFormat = "d"
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  })

  const weekDays = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"]

  const Container = integrated ? "div" : Card
  const containerClasses = integrated ? "pt-2" : "p-4 bg-zinc-950/50 border-white/5"

  return (
    <Container className={containerClasses}>
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Asistencia – {format(currentDate, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
        </h3>
        <button className="p-1 hover:bg-white/5 rounded-full transition-colors">
          <ChevronRight className="size-4 text-zinc-400" />
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
          const isAttended = attendanceDates.some(d => isSameDay(d, day))
          const inSameMonth = isSameMonth(day, monthStart)
          const isCurrentDay = isToday(day)
          const isPast = isBefore(day, today)
          const isSun = isSunday(day)
          const isSat = isSaturday(day)
          const isBeforeActivation = activationDay ? isBefore(day, activationDay) : false
          const isActivationDay = activationDay ? isSameDay(day, activationDay) : false
          
          const isFreeDay = daysPerWeek === 5 ? (isSun || isSat) : isSun
          const isMissed = inSameMonth && isPast && !isAttended && !isFreeDay && !isBeforeActivation

          let dayClasses = "relative text-[12px] font-medium transition-[background-color,color,border-color,box-shadow,transform] flex items-center justify-center w-7 h-7 rounded-full "

          if (isCurrentDay) {
            dayClasses += "bg-red-600 text-white shadow-[0_0_18px_rgba(220,38,38,0.7)] font-bold scale-110"
          } else if (isAttended) {
            dayClasses += "bg-green-600/60 border border-green-500/50 text-white font-semibold"
          } else if (isMissed) {
            dayClasses += "bg-red-500/25 border border-red-500/40 text-red-200"
          } else if (!inSameMonth) {
            dayClasses += "text-zinc-700"
          } else {
            dayClasses += "text-zinc-300 hover:bg-white/5"
          }

          if (isActivationDay) {
            dayClasses += " ring-2 ring-white ring-offset-2 ring-offset-zinc-950"
          }

          return (
            <div key={idx} className="flex items-center justify-center h-9">
              <span className={dayClasses}>
                {format(day, dateFormat)}
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
