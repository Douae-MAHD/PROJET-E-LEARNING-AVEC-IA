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

// Helper to get event styling based on phase
const getEventStyles = (phase) => {
  switch (phase) {
    case 'prelab':
      return {
        backgroundColor: 'var(--color-gold-light)',
        borderColor: 'var(--color-gold)',
        textColor: 'var(--color-gold-text)',
        icon: '📖',
      }
    case 'inlab':
      return {
        backgroundColor: 'var(--color-sky-light)',
        borderColor: 'var(--color-sky)',
        textColor: 'var(--color-navy)',
        icon: '🔬',
      }
    case 'postlab':
      return {
        backgroundColor: '#E8F5E9', // Light success tint
        borderColor: 'var(--color-success)',
        textColor: 'var(--color-text)',
        icon: '📝',
      }
    default:
      return {
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-text-muted)',
        textColor: 'var(--color-text)',
        icon: '📅',
      }
  }
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
      console.log('🔍 subModuleId:', seance?.subModuleId)

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

      const normalizedSubModuleId = typeof seance.subModuleId === 'object'
        ? seance.subModuleId?._id
        : seance.subModuleId

      const normalizedModuleId = typeof seance.moduleId === 'object'
        ? seance.moduleId?._id
        : seance.moduleId

      const phase = seance.phase || 'prelab'
      const styles = getEventStyles(phase)

      const event = {
        id: seance._id,
        title: `${styles.icon} ${seance.titre || 'Séance'}`,
        start: toLocalDateTimeString(startDate),
        end: toLocalDateTimeString(endDate),
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        textColor: styles.textColor,
        extendedProps: {
          phase: phase,
          subModuleId: normalizedSubModuleId,
          moduleId: normalizedModuleId,
        },
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
    <div className="db-calendar-wrap" style={{ padding: "20px", backgroundColor: 'var(--color-bg)' }}>
      <div style={{ 
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h2 style={{ 
          color: 'var(--color-navy)', 
          margin: 0,
          fontSize: '1.5rem',
          fontWeight: '600'
        }}>
          📅 Planning des séances
        </h2>
        
        {/* Legend */}
        <div style={{ 
          display: 'flex', 
          gap: '16px',
          flexWrap: 'wrap',
          fontSize: '0.875rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--color-gold)', borderRadius: '2px' }}></div>
            <span style={{ color: 'var(--color-text-muted)' }}>Prélab</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--color-sky)', borderRadius: '2px' }}></div>
            <span style={{ color: 'var(--color-text-muted)' }}>Inlab</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--color-success)', borderRadius: '2px' }}></div>
            <span style={{ color: 'var(--color-text-muted)' }}>Postlab</span>
          </div>
        </div>
      </div>

      <style>{`
        /* FullCalendar Custom Styling using the provided palette */
        .fc {
          --fc-border-color: #E5E7EB;
          --fc-button-bg-color: var(--color-surface);
          --fc-button-border-color: var(--color-text-muted);
          --fc-button-hover-bg-color: var(--color-sky-light);
          --fc-button-hover-border-color: var(--color-sky);
          --fc-button-active-bg-color: var(--color-navy);
          --fc-button-active-border-color: var(--color-navy);
          --fc-today-bg-color: var(--color-gold-light);
          --fc-page-bg-color: var(--color-surface);
          --fc-neutral-bg-color: var(--color-bg);
          --fc-list-event-hover-bg-color: var(--color-sky-light);
        }

        /* Toolbar buttons */
        .fc .fc-button-primary {
          background-color: var(--fc-button-bg-color);
          border-color: var(--fc-button-border-color);
          color: var(--color-text);
          font-weight: 500;
          text-transform: capitalize;
          transition: all 0.2s ease;
        }

        .fc .fc-button-primary:hover {
          background-color: var(--fc-button-hover-bg-color);
          border-color: var(--fc-button-hover-border-color);
          color: var(--color-navy);
        }

        .fc .fc-button-primary:focus {
          box-shadow: 0 0 0 2px var(--color-sky-light);
        }

        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background-color: var(--fc-button-active-bg-color);
          border-color: var(--fc-button-active-border-color);
          color: white;
        }

        /* Toolbar title */
        .fc .fc-toolbar-title {
          color: var(--color-navy);
          font-weight: 600;
          font-size: 1.25rem;
        }

        /* Day headers */
        .fc .fc-col-header-cell-cushion {
          color: var(--color-navy);
          font-weight: 600;
          padding: 10px 4px;
          text-decoration: none;
        }

        /* Day numbers */
        .fc .fc-daygrid-day-number {
          color: var(--color-text);
          text-decoration: none;
          font-weight: 500;
        }

        .fc .fc-daygrid-day-number:hover {
          color: var(--color-sky);
          background-color: transparent;
        }

        /* Today highlight */
        .fc .fc-day-today {
          background-color: var(--fc-today-bg-color) !important;
        }

        .fc .fc-day-today .fc-daygrid-day-number {
          color: var(--color-gold-text);
          font-weight: 700;
        }

        /* Event styling */
        .fc .fc-daygrid-event {
          border-radius: 6px;
          padding: 2px 4px;
          margin: 2px 4px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }

        .fc .fc-daygrid-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        /* TimeGrid view events */
        .fc .fc-timegrid-event {
          border-radius: 6px;
          padding: 4px 6px;
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }

        .fc .fc-timegrid-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        /* More link */
        .fc .fc-daygrid-more-link {
          color: var(--color-sky);
          font-weight: 500;
          font-size: 0.75rem;
        }

        .fc .fc-daygrid-more-link:hover {
          color: var(--color-navy-mid);
          text-decoration: underline;
        }

        /* Popover */
        .fc .fc-popover {
          border-radius: 12px;
          border-color: var(--color-sky-light);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .fc .fc-popover-header {
          background-color: var(--color-sky-light);
          color: var(--color-navy);
          border-radius: 12px 12px 0 0;
        }

        /* List view */
        .fc .fc-list-day-cushion {
          background-color: var(--color-sky-light);
          color: var(--color-navy);
        }

        .fc .fc-list-event:hover td {
          background-color: var(--color-gold-light);
        }

        /* Weekend days subtle indication */
        .fc .fc-day-sat, 
        .fc .fc-day-sun {
          background-color: rgba(0, 0, 0, 0.02);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .fc .fc-toolbar {
            flex-direction: column;
            gap: 12px;
          }
          
          .fc .fc-toolbar-title {
            font-size: 1rem;
          }
          
          .fc .fc-daygrid-event {
            font-size: 0.7rem;
          }
        }
      `}</style>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        height="auto"
        dayMaxEventRows={true}
        eventDisplay="block"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek'
        }}
        buttonText={{
          today: 'Aujourd\'hui',
          month: 'Mois',
          week: 'Semaine'
        }}
        eventClick={(info) => {
          const id = info.event.id
          const eventMeta = info.event.extendedProps || {}
          console.log('🧭 eventClick.extendedProps:', eventMeta)
          const phase = info.event.extendedProps?.phase || 'prelab'
          const subModuleId = info.event.extendedProps?.subModuleId
          const moduleId = info.event.extendedProps?.moduleId

          if (userType === 'student') {
            if (phase === 'prelab' && moduleId) {
              navigate(`/qcm/${moduleId}`)
              return
            }

            if (phase === 'prelab') {
              console.warn('Prelab navigation missing moduleId, falling back to subModuleId:', {
                id,
                subModuleId,
                eventMeta,
              })

              if (subModuleId) {
                navigate(`/qcm/${subModuleId}`)
                return
              }
            }

            if (phase === 'inlab') {
              navigate(`/seance/${id}`)
              return
            }

            if (phase === 'postlab') {
              navigate(`/evaluation/${id}`)
              return
            }

            navigate(`/seance/${id}`)
          }

          if (userType === 'teacher') {
            if (moduleId) {
              navigate(`/teacher/module/${moduleId}/seances`)
              return
            }

            console.warn('Teacher navigation missing moduleId for event:', { id, eventMeta })
            navigate('/dashboard/teacher')
          }
        }}
      />
    </div>
  )
}