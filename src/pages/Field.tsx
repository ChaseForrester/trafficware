import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo.tsx'
import { useTitle } from '../components/useTitle.ts'
import { cx, prettyDate, prettyWhen } from '../lib/format.ts'
import { findClient } from '../lib/rules.ts'
import { useStore } from '../lib/store.tsx'

export function FieldApp() {
    useTitle('Field · Trafficware')
    const store = useStore()
    const { state, today } = store
    const defaultId = useMemo(() => {
        const pending = state.bookings
            .filter((booking) => booking.date === today)
            .flatMap((booking) => booking.slots)
            .find((slot) => slot.response === 'pending' && slot.personId)
        return pending?.personId ?? state.people.find((person) => person.status === 'active')?.id ?? state.people[0]?.id ?? ''
    }, [state.bookings, state.people, today])
    const [personId, setPersonId] = useState(defaultId)
    const [tab, setTab] = useState<'jobs' | 'docs' | 'safety'>('jobs')
    const [docketFor, setDocketFor] = useState<string | null>(null)
    const person = state.people.find((item) => item.id === personId) ?? state.people[0]
    const offers = state.bookings
        .flatMap((booking) => booking.slots.filter((slot) => slot.personId === person?.id).map((slot) => ({ booking, slot })))
        .sort((a, b) => {
            const aRank = a.booking.date >= today ? 0 : 1
            const bRank = b.booking.date >= today ? 0 : 1
            if (aRank !== bRank) return aRank - bRank
            return a.booking.date.localeCompare(b.booking.date) || a.booking.start.localeCompare(b.booking.start)
        })

    if (!person) return null

    return (
        <div className="field-page">
            <div className="phone">
                <header className="phone-bar">
                    <Logo light />
                    <label className="field">
                        Crew
                        <select value={person.id} onChange={(event) => { setPersonId(event.target.value); setDocketFor(null) }}>
                            {state.people.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    </label>
                </header>
                <div className="phone-offline">
                    <span>{state.offline ? 'Offline · work stays on this phone' : 'Online · dockets go straight to the office'}</span>
                    <button type="button" className="btn btn-amber btn-small" onClick={() => store.setOffline(!state.offline)}>
                        {state.offline ? 'Go online' : 'Go offline'}
                    </button>
                </div>
                <div className="tabs">
                    {(['jobs', 'docs', 'safety'] as const).map((item) => (
                        <button key={item} type="button" className={cx('chip-btn', tab === item && 'on')} onClick={() => { setTab(item); setDocketFor(null) }}>
                            {item === 'jobs' ? 'Jobs' : item === 'docs' ? 'Tickets' : 'Near miss'}
                        </button>
                    ))}
                </div>
                {tab === 'jobs' && !docketFor && (
                    <div className="phone-body">
                        {offers.map(({ booking, slot }) => {
                            const docket = state.dockets.find((item) => item.bookingId === booking.id && item.personId === person.id && item.status !== 'queried')
                                ?? state.outbox.find((item) => item.bookingId === booking.id && item.personId === person.id)
                            const client = findClient(state, booking.clientId)
                            return (
                                <article key={slot.id} className="card">
                                    <p className="kicker">{prettyDate(booking.date)} · {slot.role}</p>
                                    <h2>{booking.title}</h2>
                                    <p className="muted">{booking.start}–{booking.end}</p>
                                    <p>{booking.site}</p>
                                    <p className="muted">{client?.name}</p>
                                    {booking.notes && <p>{booking.notes}</p>}
                                    {slot.response === 'pending' && (
                                        <div className="hero-actions">
                                            <button type="button" className="btn btn-primary btn-small" onClick={() => store.respond(booking.id, slot.id, 'accepted')}>Accept</button>
                                            <button type="button" className="btn btn-ghost btn-small" onClick={() => store.respond(booking.id, slot.id, 'declined')}>Decline</button>
                                        </div>
                                    )}
                                    {slot.response === 'accepted' && !docket && (
                                        <button type="button" className="btn btn-amber btn-small" onClick={() => { setDocketFor(booking.id) }}>
                                            Open docket
                                        </button>
                                    )}
                                    {docket && <p className="tag">{docket.status === 'queued' ? 'Queued offline' : docket.status}</p>}
                                </article>
                            )
                        })}
                        {!offers.length && <p className="empty">No offers for {person.name}. Run the roster bot, then come back.</p>}
                    </div>
                )}
                {tab === 'jobs' && docketFor && (
                    <DocketForm bookingId={docketFor} personId={person.id} personName={person.name} onClose={() => setDocketFor(null)} />
                )}
                {tab === 'docs' && (
                    <div className="phone-body">
                        <p className="muted">These tickets are stored with the person, so they stay readable when the phone is offline.</p>
                        {person.skills.map((skill) => (
                            <article key={skill.id} className="card">
                                <p className="kicker">On this phone</p>
                                <h2>{skill.name}</h2>
                                <p>Expires {skill.expires}</p>
                                <p className="muted">{skill.document}</p>
                            </article>
                        ))}
                        {!person.skills.length && <p className="empty">No tickets on file yet.</p>}
                    </div>
                )}
                {tab === 'safety' && <SafetyForm personId={person.id} offers={offers.map((offer) => offer.booking.id)} />}
            </div>
            <aside className="sync-console">
                <p className="kicker">Field sync bot</p>
                <h2>Outbox</h2>
                <p className="muted">Dockets and near misses submitted offline wait here until you are back online.</p>
                <ul className="feed">
                    {state.outbox.map((docket) => (
                        <li key={docket.id}><span><strong>Docket · {docket.signedBy}</strong><small>{docket.start}–{docket.end}</small></span></li>
                    ))}
                    {state.safetyNotes.filter((note) => note.status === 'queued').map((note) => (
                        <li key={note.id}><span><strong>Near miss</strong><small>{note.note}</small></span></li>
                    ))}
                    {!state.outbox.length && !state.safetyNotes.some((note) => note.status === 'queued') && <li>Outbox is empty.</li>}
                </ul>
                <button type="button" className="btn btn-primary" onClick={() => store.syncField()}>Sync now</button>
                <h3>Recent sync</h3>
                <ul className="feed">
                    {state.activity.filter((event) => event.source === 'field-sync').slice(0, 5).map((event) => (
                        <li key={event.id}><span><strong>{event.message}</strong><small>{prettyWhen(event.at)}</small></span></li>
                    ))}
                </ul>
                <Link to="/app">Back to the office</Link>
            </aside>
        </div>
    )
}

function DocketForm({
    bookingId,
    personId,
    personName,
    onClose,
}: {
    bookingId: string
    personId: string
    personName: string
    onClose: () => void
}) {
    const { state, submitDocket } = useStore()
    const booking = state.bookings.find((item) => item.id === bookingId)
    const [start, setStart] = useState(booking?.start ?? '07:00')
    const [end, setEnd] = useState(booking?.end ?? '15:30')
    const [breakMins, setBreakMins] = useState(30)
    const [notes, setNotes] = useState('')
    const [signedBy, setSignedBy] = useState(personName)
    const [nearMiss, setNearMiss] = useState('')
    const [photoName, setPhotoName] = useState('')

    if (!booking) return null

    function onSubmit(event: FormEvent) {
        event.preventDefault()
        const result = submitDocket({ bookingId, personId, start, end, breakMins, notes, signedBy, nearMiss, photoName })
        if (result.tone !== 'bad') onClose()
    }

    return (
        <form className="phone-body form" onSubmit={onSubmit}>
            <p className="kicker">Digital docket</p>
            <h2>{booking.title}</h2>
            <label className="field">Start<input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
            <label className="field">Finish<input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
            <label className="field">Break minutes<input type="number" min="0" value={breakMins} onChange={(event) => setBreakMins(Number(event.target.value))} /></label>
            <label className="field">Notes<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            <label className="field">Near miss<textarea rows={3} value={nearMiss} onChange={(event) => setNearMiss(event.target.value)} placeholder="Leave blank if nothing happened" /></label>
            <label className="field">
                Photo
                <input type="file" accept="image/*" onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? '')} />
            </label>
            {photoName && <p className="muted">{photoName} attached. The file name is kept with the docket.</p>}
            <label className="field">Sign by typing your name<input value={signedBy} onChange={(event) => setSignedBy(event.target.value)} required /></label>
            <button type="submit" className="btn btn-primary">{state.offline ? 'Queue docket' : 'Submit docket'}</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Back</button>
        </form>
    )
}

function SafetyForm({ personId, offers }: { personId: string; offers: string[] }) {
    const { state, addSafetyNote } = useStore()
    const [note, setNote] = useState('')
    const [photoName, setPhotoName] = useState('')
    const [bookingId, setBookingId] = useState<string>(offers[0] ?? '')
    const mine = state.safetyNotes.filter((item) => item.personId === personId)

    return (
        <div className="phone-body">
            <form
                className="form"
                onSubmit={(event) => {
                    event.preventDefault()
                    const result = addSafetyNote({ personId, bookingId: bookingId || null, note, photoName })
                    if (result.tone !== 'bad') {
                        setNote('')
                        setPhotoName('')
                    }
                }}
            >
                <label className="field">
                    Job
                    <select value={bookingId} onChange={(event) => setBookingId(event.target.value)}>
                        <option value="">Not tied to a job</option>
                        {offers.map((id) => {
                            const booking = state.bookings.find((item) => item.id === id)
                            return <option key={id} value={id}>{booking?.title}</option>
                        })}
                    </select>
                </label>
                <label className="field">What happened?<textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} required /></label>
                <label className="field">Photo<input type="file" accept="image/*" onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? '')} /></label>
                <button type="submit" className="btn btn-amber">Log near miss</button>
            </form>
            <ul className="feed">
                {mine.map((item) => (
                    <li key={item.id}>
                        <span>
                            <strong>{item.status === 'queued' ? 'Waiting to sync' : 'Logged'}</strong>
                            <small>{item.note}{item.photoName ? ` · ${item.photoName}` : ''}</small>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
