import { useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import { rosterPlan } from '../lib/bots.ts'
import { addDays, cx, prettyDate, prettyLong, round1, startOfWeek } from '../lib/format.ts'
import { Avatar } from './Avatar.tsx'
import { useGrok } from './GrokDock.tsx'
import { IconKicker } from './Icons.tsx'
import { findClient, findPerson, slotIssues, statusFor, vehicleIssues, weekHours } from '../lib/rules.ts'
import { useStore } from '../lib/store.tsx'
import type { Booking } from '../types.ts'

const STATUS_LABEL = {
    planning: 'Open',
    offered: 'Offered',
    confirmed: 'Confirmed',
    submitted: 'Dockets in',
    approved: 'Approved',
    invoiced: 'Invoiced',
} as const

export function RosterBoard({ compact = false, focusDate, onFocusDate }: { compact?: boolean; focusDate?: string; onFocusDate?: (iso: string) => void }) {
    const store = useStore()
    const grok = useGrok()
    const { state, today } = store
    const [ownDate, setOwnDate] = useState(today)
    const date = focusDate ?? ownDate
    function setDate(next: string) {
        if (onFocusDate) onFocusDate(next)
        else setOwnDate(next)
    }
    const [depot, setDepot] = useState('All')
    const [over, setOver] = useState<string | null>(null)
    const [showBot, setShowBot] = useState(false)
    const plan = useMemo(() => rosterPlan(state, date, depot), [state, date, depot])
    const days = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(date), index))
    const bookings = state.bookings
        .filter((booking) => booking.date === date && (depot === 'All' || booking.depot === depot))
        .sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title))
    const people = [...state.people].sort((a, b) => a.name.localeCompare(b.name))

    function onDrop(event: DragEvent<HTMLDivElement>, bookingId: string, slotId: string) {
        event.preventDefault()
        setOver(null)
        const personId = event.dataTransfer.getData('text/person-id') || event.dataTransfer.getData('text/plain')
        if (personId) store.assignPerson(bookingId, slotId, personId)
    }

    return (
        <section className={cx('board', compact && 'board-compact')}>
            <header className="board-bar">
                <div>
                    <IconKicker name="board">{compact ? 'Live board' : 'This day'}</IconKicker>
                    <h2>{prettyLong(date)}</h2>
                </div>
                <div className="board-actions">
                    <label className="field inline">
                        Depot
                        <select value={depot} onChange={(event) => setDepot(event.target.value)}>
                            <option value="All">All depots</option>
                            {state.settings.depots.map((item) => (
                                <option key={item}>{item}</option>
                            ))}
                        </select>
                    </label>
                    <button type="button" className="btn btn-amber btn-small" onClick={() => setShowBot((open) => !open)}>
                        Roster bot
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary btn-small"
                        onClick={() => grok.openWith(`Who should fill the open slots on ${date}? Use only the suggestions in the snapshot for today, and say which slots are still blocked. Depot filter is ${depot}.`)}
                    >
                        Ask Grok
                    </button>
                </div>
            </header>

            <div className="day-row" role="tablist" aria-label="Days">
                {days.map((day) => {
                    const count = state.bookings.filter((booking) => booking.date === day).length
                    return (
                        <button
                            key={day}
                            type="button"
                            className={cx('day', day === date && 'on', day === today && 'today')}
                            onClick={() => setDate(day)}
                        >
                            <span>{prettyDate(day)}</span>
                            <small>{count} job{count === 1 ? '' : 's'}</small>
                        </button>
                    )
                })}
            </div>

            {showBot && (
                <div className="bot-panel">
                    <div>
                        <IconKicker name="bot">Roster bot</IconKicker>
                        <h3>{plan.suggestions.length ? `${plan.suggestions.length} people fit the open slots` : 'No clean fill available'}</h3>
                        <p className="muted">Suggestions skip anyone who would break a ticket, rest, fatigue or clash rule. Existing problems stay until you move them.</p>
                    </div>
                    <ul className="plan-list">
                        {plan.suggestions.map((suggestion) => {
                            const person = findPerson(state, suggestion.personId)
                            const booking = state.bookings.find((item) => item.id === suggestion.bookingId)
                            const slot = booking?.slots.find((item) => item.id === suggestion.slotId)
                            return (
                                <li key={suggestion.slotId}>
                                    <strong>{person?.name}</strong> as {slot?.role} on {booking?.title}
                                    <span>{suggestion.reason}</span>
                                </li>
                            )
                        })}
                        {plan.gaps.map((gap) => (
                            <li key={gap.slotId} className="gap">
                                <strong>{gap.role} still open</strong> on {gap.bookingTitle}
                                <span>{gap.reason}</span>
                            </li>
                        ))}
                        {!plan.suggestions.length && !plan.gaps.length && <li>Every slot on this day already has a name, or the jobs are in close-out.</li>}
                    </ul>
                    <button
                        type="button"
                        className="btn btn-primary btn-small"
                        disabled={!plan.suggestions.length}
                        onClick={() => store.applySuggestions(date, depot)}
                    >
                        Apply suggestions
                    </button>
                </div>
            )}

            <p className="muted drag-hint">Drag a person onto a slot, or use the assign list. Both paths run the same checks.</p>

            <div className="board-grid">
                <aside className="pool">
                    <h3>Crew</h3>
                    {people.map((person) => {
                        const hours = round1(weekHours(state, person.id, date))
                        const unavailable = person.status !== 'active' || person.leaveDates.includes(date)
                        return (
                            <div
                                key={person.id}
                                className={cx('chip', unavailable && 'dim')}
                                draggable
                                onDragStart={(event) => {
                                    event.dataTransfer.setData('text/person-id', person.id)
                                    event.dataTransfer.setData('text/plain', person.id)
                                    event.dataTransfer.effectAllowed = 'copy'
                                }}
                            >
                                <Avatar person={person} />
                                <span>
                                    <strong>{person.name}</strong>
                                    <small>
                                        {person.title} · {person.depot} · {hours}h
                                        {person.status !== 'active' ? ` · ${person.status}` : ''}
                                        {person.leaveDates.includes(date) ? ' · leave' : ''}
                                    </small>
                                </span>
                            </div>
                        )
                    })}
                </aside>

                <div className="jobs">
                    {bookings.length === 0 && <p className="empty">No jobs for this depot on {prettyDate(date)}.</p>}
                    {bookings.map((booking) => (
                        <JobCard
                            key={booking.id}
                            booking={booking}
                            over={over}
                            setOver={setOver}
                            onDrop={onDrop}
                            people={people}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

function JobCard({
    booking,
    over,
    setOver,
    onDrop,
    people,
}: {
    booking: Booking
    over: string | null
    setOver: (id: string | null) => void
    onDrop: (event: DragEvent<HTMLDivElement>, bookingId: string, slotId: string) => void
    people: { id: string; name: string }[]
}) {
    const store = useStore()
    const { state } = store
    const client = findClient(state, booking.clientId)
    const status = statusFor(state, booking)
    const vehicle = state.vehicles.find((item) => item.id === booking.vehicleId)
    const truckIssues = vehicle ? vehicleIssues(state, booking, vehicle) : []

    return (
        <article className="job">
            <header className="job-head">
                <div>
                    <p className="kicker">
                        {client?.name} · {booking.depot}
                    </p>
                    <h3>{booking.title}</h3>
                    <p className="muted">
                        {booking.start}–{booking.end} · {booking.site}
                    </p>
                </div>
                <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
            </header>
            <div className="slots">
                {booking.slots.map((slot) => {
                    const person = findPerson(state, slot.personId)
                    const issues = slotIssues(state, booking, slot)
                    const blocked = issues.some((issue) => issue.level === 'block')
                    const warned = issues.some((issue) => issue.level === 'warn')
                    return (
                        <div
                            key={slot.id}
                            className={cx('slot', over === slot.id && 'over', blocked && 'bad', !blocked && warned && 'warn')}
                            onDragOver={(event) => {
                                event.preventDefault()
                                setOver(slot.id)
                            }}
                            onDrop={(event) => onDrop(event, booking.id, slot.id)}
                        >
                            <div className="slot-top">
                                <strong>{slot.role}</strong>
                                {person && (
                                    <button type="button" className="text-btn" onClick={() => store.unassignPerson(booking.id, slot.id)}>
                                        Remove
                                    </button>
                                )}
                            </div>
                            {person ? (
                                <p className="slot-person">
                                    <Avatar person={person} size="sm" />
                                    {person.name}
                                    <em>{slot.response}</em>
                                </p>
                            ) : (
                                <label className="field">
                                    Assign
                                    <select
                                        value=""
                                        onChange={(event) => {
                                            if (event.target.value) store.assignPerson(booking.id, slot.id, event.target.value)
                                        }}
                                    >
                                        <option value="">Choose crew</option>
                                        {people.map((personOption) => (
                                            <option key={personOption.id} value={personOption.id}>
                                                {personOption.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                            {issues.map((issue) => (
                                <p key={issue.code} className={issue.level === 'block' ? 'issue bad' : 'issue warn'}>
                                    {issue.message}
                                </p>
                            ))}
                        </div>
                    )
                })}
            </div>
            <label className="field vehicle-pick">
                Vehicle
                <select
                    value={booking.vehicleId ?? ''}
                    onChange={(event) => store.setVehicle(booking.id, event.target.value || null)}
                >
                    <option value="">No vehicle</option>
                    {state.vehicles.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name} · {item.rego} · {item.depot}
                            {item.status === 'maintenance' ? ' · workshop' : ''}
                        </option>
                    ))}
                </select>
            </label>
            {truckIssues.map((issue) => (
                <p key={issue.code} className={issue.level === 'block' ? 'issue bad' : 'issue warn'}>
                    {issue.message}
                </p>
            ))}
            {booking.notes && <p className="muted">{booking.notes}</p>}
        </article>
    )
}
