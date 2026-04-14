import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useNavigate } from 'react-router-dom'

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

const toLocalDateTimeString = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

export const mapSeancesToCalendarEvents = (seances = []) => {
  console.log("🧪 mapSeancesToCalendarEvents INPUT:", seances)

  if (!Array.isArray(seances)) {
    console.log("❌ Not an array")
    return []
  }

  return seances
    .filter((seance) => {
      const valid = seance?.dateSeance && seance?.startTime
      if (!valid) {
        console.log("❌ FILTERED OUT (missing date or time):", seance)
      }
      return valid
    })
    .map((seance) => {
      console.log("➡️ PROCESSING:", seance)

      const [datePart] = String(seance.dateSeance).split('T')
      const timePart = String(seance.startTime).trim()

      if (!datePart || !TIME_REGEX.test(timePart)) {
        console.log("❌ INVALID FORMAT:", { datePart, timePart })
        return null
      }

      const startDate = new Date(`${datePart}T${timePart}:00`)
      if (Number.isNaN(startDate.getTime())) {
        console.log("❌ INVALID DATE:", startDate)
        return null
      }

      const duration = Number.isFinite(Number(seance.duree))
        ? Math.max(1, Number(seance.duree))
        : 60

      const endDate = new Date(startDate)
      endDate.setMinutes(endDate.getMinutes() + duration)

      const event = {
        id: seance._id,
        title: seance.titre || 'Séance',
        start: toLocalDateTimeString(startDate),
        end: toLocalDateTimeString(endDate),
      }

      console.log("✅ EVENT CREATED:", event)

      return event
    })
    .filter((event) => {
      if (!event) console.log("❌ NULL EVENT REMOVED")
      return Boolean(event)
    })
}

export default function CalendarSection({ seances = [], userType }) {
  const navigate = useNavigate()
  const events = mapSeancesToCalendarEvents(seances)

  return (
    <div style={{ padding: "20px" }}>
      <h2>📅 Planning des séances</h2>

      <FullCalendar
  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
  initialView="dayGridMonth"
  events={events}
  height="auto"
  dayMaxEventRows={true}
  eventDisplay="block"
  eventBackgroundColor="#ffffff"
  eventBorderColor="#ffffff"
  eventTextColor="#111827"
  headerToolbar={{
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek'
  }}
  eventClick={(info) => {
    const id = info.event.id

    if (userType === 'student') {
      navigate(`/seance/${id}`)
    }

    if (userType === 'teacher') {
      navigate(`/manage-seance/${id}`)
    }
  }}
/>
    </div>
  )
}