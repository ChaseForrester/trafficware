import type { DragEvent } from 'react'
import { Avatar } from './Avatar.tsx'
import { addDays, cx, minutesOf, prettyDate, startOfWeek } from '../lib/format.ts'
import { findClient, slotIssues, vehicleIssues, weekHours } from '../lib/rules.ts'
import { useStore } from '../lib/store.tsx'
import type { AppState, Booking, Person } from '../types.ts'

const OPEN = 6 * 60
const CLOSE = 19 * 60
const HOURS = Array.from({ length: 13 }, (_, index) => OPEN + index * 60)

export function WeekRoster({ date, onDate }: { date: string; onDate: (iso: string) => void }) {
    const store = useStore()
    const { state } = store
    const start = startOfWeek(date)
    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))

    function onDrop(event: DragEvent<HTMLDivElement>, day: string) {
        event.preventDefault()
        const bookingId = event.dataTransfer.getData('text/booking-id')
        if (bookingId) store.moveBooking(bookingId, day)
    }

    function fillWeek() {
        for (const day of days) store.applySuggestions(day, 'All')
    }

    return (
        <section className="card week-card">
            <header className="job-head">
                <div>
                    <p className="kicker">Week view</p>
                    <h2>{prettyDate(days[0])} – {prettyDate(days[6])}</h2>
                    <p className="muted">Drag a job to another day. Green is a clean crew, amber is a warning, red is a ticket or a rule block. Open slots stay blue.</p>
                </div>
                <div className="hero-actions">
                    <button type="button" className="btn btn-primary btn-small" onClick={fillWeek}>Fill open slots</button>
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => onDate(addDays(start, -7))}>Previous</button>
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => onDate(addDays(start, 7))}>Next</button>
                </div>
            </header>
            <div className="week-layout">
                <div className="week-scroll">
                    <div className="week-grid" role="grid" aria-label="Week roster">
                        <div />
                        {days.map((day) => (
                            <button key={day} type="button" className={cx('week-head', day === date && 'on')} onClick={() => onDate(day)}>
                                <span>{prettyDate(day).split(' ')[0]}</span>
                                <strong>{prettyDate(day).replace(/^\S+\s/, '')}</strong>
                            </button>
                        ))}
                        <div className="week-hours" aria-hidden="true">
                            {HOURS.slice(0, -1).map((minute, index) => (
                                <span key={minute} style={{ top: `${(index / (HOURS.length - 1)) * 100}%` }}>{String(minute / 60).padStart(2, '0')}:00</span>
                            ))}
                        </div>
                        {days.map((day) => (
                            <div
                                key={day}
                                className={cx('week-col', day === date && 'on')}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => onDrop(event, day)}
                            >
                                {state.bookings.filter((booking) => booking.date === day).map((booking) => (
                                    <JobBlock key={booking.id} state={state} booking={booking} onOpen={() => onDate(day)} />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                <aside className="week-crew">
                    <h3>Crew · {prettyDate(date)}</h3>
                    {state.people.map((person) => {
                        const mark = crewMark(state, person, date)
                        return (
                            <div key={person.id} className="week-person">
                                <Avatar person={person} size="sm" />
                                <span>
                                    <strong>{person.name}</strong>
                                    <small>{person.title} · {person.depot}</small>
                                    <em className={`crew-mark crew-${mark.tone}`}>{mark.label}</em>
                                </span>
                            </div>
                        )
                    })}
                </aside>
            </div>
        </section>
    )
}

function JobBlock({ state, booking, onOpen }: { state: AppState; booking: Booking; onOpen: () => void }) {
    const client = findClient(state, booking.clientId)
    const tone = jobTone(state, booking)
    const names = booking.slots
        .map((slot) => state.people.find((person) => person.id === slot.personId)?.name.split(' ')[0])
        .filter(Boolean)
    return (
        <button
            type="button"
            className={`week-job week-${tone}`}
            style={blockStyle(booking.start, booking.end)}
            draggable
            onDragStart={(event) => {
                event.dataTransfer.setData('text/booking-id', booking.id)
                event.dataTransfer.effectAllowed = 'move'
            }}
            onClick={onOpen}
        >
            <strong>{booking.title}</strong>
            <span>{client?.name ?? booking.site}</span>
            <em>{names.length ? names.join(', ') : 'Open'}</em>
        </button>
    )
}

function blockStyle(start: string, end: string) {
    const span = CLOSE - OPEN
    let from = minutesOf(start)
    let to = minutesOf(end)
    if (to <= from) to = CLOSE
    from = Math.max(OPEN, Math.min(from, CLOSE - 30))
    to = Math.max(from + 30, Math.min(to, CLOSE))
    return {
        top: `${((from - OPEN) / span) * 100}%`,
        height: `${((to - from) / span) * 100}%`,
    }
}

function jobTone(state: AppState, booking: Booking) {
    const issues = booking.slots.flatMap((slot) => slotIssues(state, booking, slot))
    const vehicle = state.vehicles.find((item) => item.id === booking.vehicleId)
    if (vehicle) issues.push(...vehicleIssues(state, booking, vehicle))
    if (issues.some((issue) => issue.level === 'block')) return 'bad'
    if (issues.some((issue) => issue.level === 'warn')) return 'warn'
    if (booking.slots.some((slot) => !slot.personId)) return 'open'
    return 'ok'
}

function crewMark(state: AppState, person: Person, date: string) {
    if (person.status === 'inactive') return { label: 'Inactive', tone: 'bad' }
    if (person.status === 'onboarding') return { label: 'Onboarding', tone: 'warn' }
    if (person.status === 'leave' || person.leaveDates.includes(date)) return { label: 'On leave', tone: 'warn' }
    if (person.skills.some((skill) => skill.expires < date)) return { label: 'Ticket expired', tone: 'bad' }
    if (weekHours(state, person.id, date) >= state.settings.maxWeekHours) return { label: 'Fatigue risk', tone: 'warn' }
    return { label: 'Available', tone: 'ok' }
}
