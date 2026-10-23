import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { rosterPlan } from '../lib/bots.ts'
import { addDays, cx, prettyDate, prettyLong, prettyWhen, round1, startOfWeek } from '../lib/format.ts'
import { fenceDraft, parseFence } from '../lib/geo.ts'
import type { FenceDraft } from '../lib/geo.ts'
import { Avatar } from './Avatar.tsx'
import { useGrok } from './GrokDock.tsx'
import { IconKicker } from './Icons.tsx'
import { findClient, findPerson, slotIssues, statusFor, vehicleIssues, weekHours } from '../lib/rules.ts'
import { useStore } from '../lib/store.tsx'
import { ROLES, type Booking } from '../types.ts'

const SiteMap = lazy(() => import('./SiteMap.tsx'))

const STATUS_LABEL = {
    planning: 'Open',
    offered: 'Offered',
    confirmed: 'Confirmed',
    submitted: 'Dockets in',
    approved: 'Approved',
    invoiced: 'Invoiced',
} as const

export function RosterBoard({ compact = false, focusDate, onFocusDate, focusJob }: { compact?: boolean; focusDate?: string; onFocusDate?: (iso: string) => void; focusJob?: string | null }) {
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
    const [picked, setPicked] = useState<string | null>(null)
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

            <p className="muted drag-hint">
                {picked
                    ? `${people.find((person) => person.id === picked)?.name ?? 'Crew'} is selected. Press Place on an empty slot, or tap them again to clear.`
                    : 'Tap a person, then Place them on an empty slot. Drag still works, and so does the assign list.'}
            </p>

            <div className="board-grid">
                <aside className="pool">
                    <h3>Crew</h3>
                    {people.map((person) => {
                        const hours = round1(weekHours(state, person.id, date))
                        const unavailable = person.status !== 'active' || person.leaveDates.includes(date)
                        return (
                            <div
                                key={person.id}
                                className={cx('chip', unavailable && 'dim', picked === person.id && 'on')}
                                role="button"
                                tabIndex={0}
                                aria-pressed={picked === person.id}
                                draggable
                                onClick={() => setPicked((current) => (current === person.id ? null : person.id))}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        setPicked((current) => (current === person.id ? null : person.id))
                                    }
                                }}
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
                            picked={picked}
                            focused={focusJob === booking.id}
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
    picked,
    focused,
}: {
    booking: Booking
    over: string | null
    setOver: (id: string | null) => void
    onDrop: (event: DragEvent<HTMLDivElement>, bookingId: string, slotId: string) => void
    people: { id: string; name: string }[]
    picked: string | null
    focused: boolean
}) {
    const store = useStore()
    const { state } = store
    const card = useRef<HTMLElement>(null)
    const client = findClient(state, booking.clientId)
    const status = statusFor(state, booking)
    const vehicle = state.vehicles.find((item) => item.id === booking.vehicleId)
    const truckIssues = vehicle ? vehicleIssues(state, booking, vehicle) : []
    const locked = Boolean(booking.invoiceId) || state.dockets.some((docket) => docket.bookingId === booking.id && docket.status !== 'queried')
    const pickedName = people.find((person) => person.id === picked)?.name ?? 'crew'
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState({
        title: booking.title,
        clientId: booking.clientId,
        site: booking.site,
        depot: booking.depot,
        date: booking.date,
        start: booking.start,
        end: booking.end,
        notes: booking.notes,
    })
    const [fence, setFence] = useState<FenceDraft>(() => fenceDraft(booking.geofence))
    const [mapOpen, setMapOpen] = useState(false)
    const [fenceError, setFenceError] = useState('')

    useEffect(() => {
        if (focused) card.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, [focused])

    function saveJob(event: FormEvent) {
        event.preventDefault()
        const geofence = parseFence(fence)
        if (geofence === 'bad') {
            setFenceError('A site boundary needs a pin and a radius between 50 and 5,000 metres. Leave the pin blank to clear it.')
            return
        }
        setFenceError('')
        const result = store.updateBooking(booking.id, { ...draft, geofence })
        if (result.tone !== 'bad') setEditing(false)
    }

    return (
        <article className={cx('job', focused && 'on')} ref={card} id={`job-${booking.id}`}>
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
            {locked && <p className="issue warn">This job has dockets or an invoice. Query the docket before changing the crew.</p>}
            {!locked && (
                <div className="job-actions">
                    <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => {
                            setDraft({
                                title: booking.title,
                                clientId: booking.clientId,
                                site: booking.site,
                                depot: booking.depot,
                                date: booking.date,
                                start: booking.start,
                                end: booking.end,
                                notes: booking.notes,
                            })
                            setFence(fenceDraft(booking.geofence))
                            setFenceError('')
                            setEditing((open) => !open)
                        }}
                    >
                        {editing ? 'Close edit' : 'Edit job'}
                    </button>
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => store.addSlot(booking.id, 'Traffic Controller')}>
                        Add slot
                    </button>
                    <button
                        type="button"
                        className="text-btn danger"
                        onClick={() => {
                            if (window.confirm(`Take ${booking.title} off the board?`)) store.deleteBooking(booking.id)
                        }}
                    >
                        Take off the board
                    </button>
                </div>
            )}
            {editing && !locked && (
                <form className="form job-edit" onSubmit={saveJob}>
                    <div className="form-row">
                        <label className="field">
                            Job name
                            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
                        </label>
                        <label className="field">
                            Client
                            <select value={draft.clientId} onChange={(event) => setDraft({ ...draft, clientId: event.target.value })}>
                                {state.clients.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label className="field">
                        Site
                        <input value={draft.site} onChange={(event) => setDraft({ ...draft, site: event.target.value })} />
                    </label>
                    <div className="form-row">
                        <label className="field">
                            Depot
                            <select value={draft.depot} onChange={(event) => setDraft({ ...draft, depot: event.target.value })}>
                                {state.settings.depots.map((depot) => (
                                    <option key={depot}>{depot}</option>
                                ))}
                            </select>
                        </label>
                        <label className="field">
                            Date
                            <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required />
                        </label>
                        <label className="field">
                            Start
                            <input type="time" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} required />
                        </label>
                        <label className="field">
                            End
                            <input type="time" value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} required />
                        </label>
                    </div>
                    <label className="field">
                        Notes
                        <input value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
                    </label>
                    <div className="form-row">
                        <label className="field">
                            Pin latitude
                            <input inputMode="decimal" value={fence.lat} onChange={(event) => setFence({ ...fence, lat: event.target.value })} placeholder="-37.8136" />
                        </label>
                        <label className="field">
                            Pin longitude
                            <input inputMode="decimal" value={fence.lng} onChange={(event) => setFence({ ...fence, lng: event.target.value })} placeholder="144.9631" />
                        </label>
                        <label className="field">
                            Radius metres
                            <input inputMode="numeric" value={fence.radiusM} onChange={(event) => setFence({ ...fence, radiusM: event.target.value })} />
                        </label>
                    </div>
                    <p className="muted">Leave the pin blank to clear the boundary. The numbers save even if the map tiles do not load.</p>
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => setMapOpen((open) => !open)}>
                        {mapOpen ? 'Hide map' : 'Show map'}
                    </button>
                    {mapOpen && (
                        <Suspense fallback={<p className="muted">Loading the map…</p>}>
                            <SiteMap
                                lat={Number.isFinite(Number(fence.lat)) && fence.lat.trim() ? Number(fence.lat) : -37.8136}
                                lng={Number.isFinite(Number(fence.lng)) && fence.lng.trim() ? Number(fence.lng) : 144.9631}
                                radiusM={Number.isFinite(Number(fence.radiusM)) && Number(fence.radiusM) > 0 ? Number(fence.radiusM) : 250}
                                onPick={(lat, lng) => setFence((current) => ({ ...current, lat: lat.toFixed(5), lng: lng.toFixed(5) }))}
                            />
                        </Suspense>
                    )}
                    {fenceError && <p className="form-error" role="alert">{fenceError}</p>}
                    <button type="submit" className="btn btn-primary btn-small">Save job</button>
                </form>
            )}
            <div className="site-check">
                {booking.geofence ? (
                    <p className="muted">Site boundary {booking.geofence.radiusM} m around the pin.</p>
                ) : (
                    <p className="muted">No site boundary on this job yet.</p>
                )}
                {booking.siteChecks.slice(0, 3).map((check) => {
                    const who = findPerson(state, check.personId)
                    return (
                        <p key={check.id} className={check.inside ? 'tag' : 'issue warn'}>
                            {who?.name ?? 'Crew'} {check.inside ? 'inside' : 'outside'} the fence · {check.distanceM} m · GPS ±{Math.round(check.accuracyM)} m · {prettyWhen(check.at)}
                        </p>
                    )
                })}
            </div>
            <div className="slots">
                {booking.slots.map((slot) => {
                    const person = findPerson(state, slot.personId)
                    const issues = slotIssues(state, booking, slot)
                    const blocked = issues.some((issue) => issue.level === 'block')
                    const warned = issues.some((issue) => issue.level === 'warn')
                    const roles = (ROLES as readonly string[]).includes(slot.role) ? ROLES : [slot.role, ...ROLES]
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
                                <label className="field slot-role">
                                    Role
                                    <select
                                        value={slot.role}
                                        disabled={locked}
                                        onChange={(event) => store.setSlotRole(booking.id, slot.id, event.target.value)}
                                    >
                                        {roles.map((role) => (
                                            <option key={role}>{role}</option>
                                        ))}
                                    </select>
                                </label>
                                <span className="slot-actions">
                                    {person && (
                                        <button type="button" className="text-btn" disabled={locked} onClick={() => store.unassignPerson(booking.id, slot.id)}>
                                            Remove
                                        </button>
                                    )}
                                    {!person && booking.slots.length > 1 && (
                                        <button type="button" className="text-btn" disabled={locked} onClick={() => store.removeSlot(booking.id, slot.id)}>
                                            Drop slot
                                        </button>
                                    )}
                                </span>
                            </div>
                            {person ? (
                                <p className="slot-person">
                                    <Avatar person={person} size="sm" />
                                    {person.name}
                                    <em>{slot.response}</em>
                                </p>
                            ) : (
                                <>
                                    {picked && !locked && (
                                        <button type="button" className="btn btn-primary btn-small" onClick={() => store.assignPerson(booking.id, slot.id, picked)}>
                                            Place {pickedName}
                                        </button>
                                    )}
                                    <label className="field">
                                        Assign
                                        <select
                                            value=""
                                            disabled={locked}
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
                                </>
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
                    disabled={locked}
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
            {booking.notes && !editing && <p className="muted">{booking.notes}</p>}
        </article>
    )
}
