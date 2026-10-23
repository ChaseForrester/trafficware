import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '../../components/Avatar.tsx'
import { IconKicker } from '../../components/Icons.tsx'
import { addDays, cx, prettyDate, round1, startOfWeek } from '../../lib/format.ts'
import { weekHours } from '../../lib/rules.ts'
import { useStore } from '../../lib/store.tsx'
import { SKILL_NAMES, type EmploymentStatus } from '../../types.ts'

export function People() {
    const { id } = useParams()
    const store = useStore()
    const { state, today } = store
    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState<'all' | EmploymentStatus>('all')
    const [adding, setAdding] = useState(false)
    const people = state.people.filter((person) => {
        const matchesStatus = filter === 'all' || person.status === filter
        const haystack = `${person.name} ${person.title} ${person.depot}`.toLowerCase()
        return matchesStatus && haystack.includes(query.toLowerCase())
    })
    const selected = state.people.find((person) => person.id === id) ?? people[0] ?? state.people[0]

    return (
        <div className="page-pad">
            <header className="page-title">
                <div>
                    <IconKicker name="people">Super admin</IconKicker>
                    <h1>People, tickets and rates</h1>
                </div>
                <button type="button" className="btn btn-primary btn-small" onClick={() => setAdding((value) => !value)}>
                    {adding ? 'Close' : 'Add person'}
                </button>
            </header>
            {adding && <AddPerson onDone={() => setAdding(false)} />}
            <div className="filters">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, title, depot" />
                {(['all', 'active', 'leave', 'onboarding', 'inactive'] as const).map((item) => (
                    <button key={item} type="button" className={cx('chip-btn', filter === item && 'on')} onClick={() => setFilter(item)}>
                        {item}
                    </button>
                ))}
            </div>
            <div className="person-layout">
                <div className="people-table">
                    <div className="people-row people-head">
                        <span>Name</span>
                        <span>Status</span>
                        <span>Role</span>
                        <span>Ticket</span>
                    </div>
                    {people.map((person) => {
                        const ticket = [...person.skills].sort((a, b) => a.expires.localeCompare(b.expires))[0]
                        const ticketTone = !ticket ? 'bad' : ticket.expires < today ? 'bad' : ticket.expires <= addDays(today, state.settings.expiryWarningDays) ? 'warn' : 'ok'
                        return (
                            <Link key={person.id} to={`/app/people/${person.id}`} className={cx('people-row', selected?.id === person.id && 'on')}>
                                <span className="person-id">
                                    <Avatar person={person} size="sm" />
                                    <span>
                                        <strong>{person.name}</strong>
                                        <small>{person.depot}</small>
                                    </span>
                                </span>
                                <span><em className={`status-pill status-${person.status}`}>{person.status}</em></span>
                                <span>{person.title}</span>
                                <span className={`ticket-chip ticket-${ticketTone}`}>{ticket ? `${ticket.name} · ${prettyDate(ticket.expires)}` : 'No ticket'}</span>
                            </Link>
                        )
                    })}
                    {!people.length && <p className="empty">No one matches.</p>}
                </div>
                {selected && <PersonDetail personId={selected.id} today={today} />}
            </div>
        </div>
    )
}

function compliance(person: { skills: { expires: string }[]; onboarding: { done: boolean }[] }, today: string) {
    const current = person.skills.filter((skill) => skill.expires >= today).length
    const done = person.onboarding.filter((item) => item.done).length
    const total = person.skills.length + person.onboarding.length
    if (!total) return 0
    return Math.round(((current + done) / total) * 100)
}

function AddPerson({ onDone }: { onDone: () => void }) {
    const { state, addPerson } = useStore()
    const [form, setForm] = useState({
        name: '',
        title: 'Traffic Controller',
        depot: state.settings.depots[0] ?? 'West',
        phone: '',
        email: '',
        ordinaryRate: state.settings.defaultOrdinary,
        nightRate: state.settings.defaultNight,
        weekendRate: state.settings.defaultWeekend,
    })

    function onSubmit(event: FormEvent) {
        event.preventDefault()
        const result = addPerson(form)
        if (result.tone !== 'bad') onDone()
    }

    return (
        <form className="card form" onSubmit={onSubmit}>
            <div className="form-row">
                <label className="field">Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
                <label className="field">Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                <label className="field">
                    Depot
                    <select value={form.depot} onChange={(event) => setForm({ ...form, depot: event.target.value })}>
                        {state.settings.depots.map((depot) => <option key={depot}>{depot}</option>)}
                    </select>
                </label>
            </div>
            <div className="form-row">
                <label className="field">Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                <label className="field">Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            </div>
            <button className="btn btn-amber btn-small" type="submit">Save person</button>
        </form>
    )
}

function PersonDetail({ personId, today }: { personId: string; today: string }) {
    const store = useStore()
    const person = store.state.people.find((item) => item.id === personId)
    const [skillName, setSkillName] = useState<string>(SKILL_NAMES[1])
    const [expires, setExpires] = useState(addDays(today, 365))
    if (!person) return null
    const days = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(today), index))
    const hours = round1(weekHours(store.state, person.id, today))
    const horizon = addDays(today, store.state.settings.expiryWarningDays)

    function saveRates(ordinaryRate: number, nightRate: number, weekendRate: number) {
        store.updatePerson(personId, { ordinaryRate, nightRate, weekendRate })
    }

    return (
        <article className="card person-detail">
            <header className="job-head">
                <div className="person-id">
                    <Avatar person={person} size="lg" />
                    <div>
                        <p className="kicker">{person.depot} depot</p>
                        <h2>{person.name}</h2>
                        <p className="muted">{person.title} · {person.phone} · {person.email}</p>
                    </div>
                </div>
                <p className="hours-pill">{compliance(person, today)}%</p>
            </header>
            <p className="muted">{hours}h rostered of {store.state.settings.maxWeekHours}h this week. The score is current tickets plus finished onboarding checks.</p>
            <div className="ticket-row">
                {person.skills.map((skill) => {
                    const tone = skill.expires < today ? 'bad' : skill.expires <= horizon ? 'warn' : 'ok'
                    return <span key={skill.id} className={`ticket-chip ticket-${tone}`}>{skill.name}<small>{prettyDate(skill.expires)}</small></span>
                })}
                {!person.skills.length && <span className="ticket-chip ticket-bad">No ticket on file</span>}
            </div>
            <label className="field">
                Employment status
                <select
                    value={person.status}
                    onChange={(event) => store.updatePerson(person.id, { status: event.target.value as EmploymentStatus })}
                >
                    <option value="active">Active</option>
                    <option value="leave">Leave</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="inactive">Inactive</option>
                </select>
            </label>
            <label className="field">
                Depot
                <select value={person.depot} onChange={(event) => store.updatePerson(person.id, { depot: event.target.value })}>
                    {store.state.settings.depots.map((depot) => <option key={depot}>{depot}</option>)}
                </select>
            </label>
            <Rates key={person.id} personId={person.id} ordinary={person.ordinaryRate} night={person.nightRate} weekend={person.weekendRate} onSave={saveRates} />
            <h3>Documents</h3>
            <ul className="feed">
                {person.skills.map((skill) => (
                    <li key={skill.id}>
                        <span>
                            <strong>{skill.name}</strong>
                            <small className={skill.expires < today ? 'bad-text' : skill.expires <= horizon ? 'warn-text' : ''}>
                                {skill.document} · expires {skill.expires}
                            </small>
                        </span>
                        <button type="button" className="text-btn" onClick={() => store.removeSkill(person.id, skill.id)}>Remove</button>
                    </li>
                ))}
                {!person.skills.length && <li>No tickets on file. They cannot be rostered.</li>}
            </ul>
            <form
                className="form-row"
                onSubmit={(event) => {
                    event.preventDefault()
                    store.addSkill(person.id, skillName, expires)
                }}
            >
                <label className="field">
                    Ticket
                    <input list="skill-names" value={skillName} onChange={(event) => setSkillName(event.target.value)} />
                    <datalist id="skill-names">
                        {SKILL_NAMES.map((name) => <option key={name} value={name} />)}
                    </datalist>
                </label>
                <label className="field">
                    Expires
                    <input type="date" value={expires} onChange={(event) => setExpires(event.target.value)} />
                </label>
                <button type="submit" className="btn btn-ghost btn-small">Add ticket</button>
            </form>
            <h3>Leave this week</h3>
            <div className="day-row">
                {days.map((day) => {
                    const on = person.leaveDates.includes(day) || person.status === 'leave'
                    return (
                        <button
                            key={day}
                            type="button"
                            className={cx('day', on && 'on')}
                            onClick={() => store.setLeave(person.id, day, !person.leaveDates.includes(day))}
                        >
                            <span>{prettyDate(day)}</span>
                            <small>{person.leaveDates.includes(day) ? 'Leave' : 'In'}</small>
                        </button>
                    )
                })}
            </div>
            {person.onboarding.length > 0 && (
                <>
                    <h3>HR onboarding</h3>
                    <ul className="feed">
                        {person.onboarding.map((item) => (
                            <li key={item.id}>
                                <label className="check">
                                    <input type="checkbox" checked={item.done} onChange={() => store.completeOnboarding(person.id, item.id)} />
                                    <span>{item.label}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                    <p className="muted">Finish every check and they become active, with a traffic controller ticket on file.</p>
                </>
            )}
        </article>
    )
}

function Rates({
    ordinary,
    night,
    weekend,
    onSave,
}: {
    personId: string
    ordinary: number
    night: number
    weekend: number
    onSave: (ordinary: number, night: number, weekend: number) => void
}) {
    const [values, setValues] = useState({ ordinary, night, weekend })
    return (
        <form
            className="form-row"
            onSubmit={(event) => {
                event.preventDefault()
                onSave(values.ordinary, values.night, values.weekend)
            }}
        >
            <label className="field">Ordinary $/h<input type="number" min="0" step="0.5" value={values.ordinary} onChange={(event) => setValues({ ...values, ordinary: Number(event.target.value) })} /></label>
            <label className="field">Night $/h<input type="number" min="0" step="0.5" value={values.night} onChange={(event) => setValues({ ...values, night: Number(event.target.value) })} /></label>
            <label className="field">Weekend $/h<input type="number" min="0" step="0.5" value={values.weekend} onChange={(event) => setValues({ ...values, weekend: Number(event.target.value) })} /></label>
            <button type="submit" className="btn btn-ghost btn-small">Save rates</button>
        </form>
    )
}
