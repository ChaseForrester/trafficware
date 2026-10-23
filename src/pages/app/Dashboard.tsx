import { Link } from 'react-router-dom'
import { Avatar } from '../../components/Avatar.tsx'
import { Icon, IconKicker } from '../../components/Icons.tsx'
import { buildAlerts } from '../../lib/bots.ts'
import { addDays, cx, prettyLong, prettyWhen } from '../../lib/format.ts'
import { usePair } from '../../lib/pair.tsx'
import { useStore } from '../../lib/store.tsx'

export function Dashboard() {
    const { state, today } = useStore()
    const pair = usePair()
    const todays = state.bookings.filter((booking) => booking.date === today)
    const yesterday = addDays(today, -1)
    const yesterdays = state.bookings.filter((booking) => booking.date === yesterday)
    const openSlots = todays.reduce((sum, booking) => sum + booking.slots.filter((slot) => !slot.personId).length, 0)
    const toApprove = state.dockets.filter((docket) => docket.status === 'submitted').length
    const alerts = buildAlerts(state, today).slice(0, 6)
    const weekStart = addDays(today, -6)
    const weekBookings = state.bookings.filter((booking) => booking.date >= weekStart && booking.date <= today)
    const weekSlots = weekBookings.flatMap((booking) => booking.slots)
    const filled = weekSlots.filter((slot) => slot.personId).length
    const onLeave = state.people.filter((person) => person.status === 'leave' || person.leaveDates.includes(today)).length
    const active = state.people.filter((person) => person.status === 'active' && !person.leaveDates.includes(today)).length
    const activeYesterday = state.people.filter((person) => person.status === 'active' && !person.leaveDates.includes(yesterday)).length
    const expiring = countExpiring(state.people, today, state.settings.expiryWarningDays)
    const expiringYesterday = countExpiring(state.people, yesterday, state.settings.expiryWarningDays)

    return (
        <div className="page-pad">
            <header className="page-title">
                <div>
                    <IconKicker name="today">Overview</IconKicker>
                    <h1>{greeting()}{pair.holder ? `, ${pair.holder.name.split(' ')[0]}` : ''}</h1>
                </div>
                <p className="hours-pill">{prettyLong(today)}</p>
            </header>
            <div className="overview-kpis">
                <Kpi icon="people" label="Active crew" value={active} note={delta(active, activeYesterday)} href="/app/people" />
                <Kpi icon="board" label="Today's jobs" value={todays.length} note={`${openSlots} still open · ${delta(todays.length, yesterdays.length)}`} href="/app/board" />
                <Kpi icon="ticket" label="Expiring tickets" value={expiring} note={delta(expiring, expiringYesterday)} href="/app/people" tone={expiring ? 'bad' : 'ok'} />
                <Kpi icon="dockets" label="Dockets to approve" value={toApprove} note="Submitted, waiting on the office" href="/app/closeout" />
            </div>
            <p className="muted">{filled} of {weekSlots.length} shifts filled this week · {onLeave} on leave</p>
            <StarterChecks />
            <section className="card" id="alerts">
                <div className="job-head">
                    <IconKicker name="alert">Compliance alerts</IconKicker>
                    <Link to="/app/people">People</Link>
                </div>
                <ul className="alert-list">
                    {alerts.map((alert) => (
                        <li key={alert.id}>
                            <Link to={alert.href}>
                                <Icon name={alert.tone === 'bad' ? 'ticket' : 'alert'} />
                                <span>
                                    <strong>{alert.title}</strong>
                                    <small>{alert.detail}</small>
                                </span>
                                <em className={`sev sev-${alert.tone}`}>{alert.tone === 'bad' ? 'High' : 'Medium'}</em>
                            </Link>
                        </li>
                    ))}
                    {!alerts.length && <li>Nothing is ringing. The week is clear.</li>}
                </ul>
            </section>
            <section className="card">
                <IconKicker name="bot">Recent activity</IconKicker>
                <ul className="feed">
                    {state.activity.slice(0, 5).map((event) => (
                        <li key={event.id}>
                            <Icon name={event.source === 'field-sync' ? 'field' : event.source === 'closeout-bot' ? 'closeout' : event.source === 'roster-bot' ? 'bot' : 'check'} />
                            <span>
                                <strong>{event.message}</strong>
                                <small>{sourceLabel(event.source)} · {prettyWhen(event.at)}</small>
                            </span>
                        </li>
                    ))}
                </ul>
                {!state.activity.length && <p className="muted">Nothing has been written yet.</p>}
            </section>
            <div className="pair-grid">
                {[pair.primary, pair.partner].filter((person, index, list) => person && list.findIndex((item) => item?.id === person.id) === index).map((person) => person && (
                    <article key={person.id} className="card pair-card">
                        <div className="person-id">
                            <Avatar person={person} />
                            <div>
                                <IconKicker name="field">{pair.holderId === person.id ? 'On this phone' : 'The other one'}</IconKicker>
                                <h2>{person.name}</h2>
                            </div>
                        </div>
                        <ul className="feed">
                            {todays.filter((booking) => booking.slots.some((slot) => slot.personId === person.id)).map((booking) => (
                                <li key={booking.id}>
                                    <span>
                                        <strong>{booking.title}</strong>
                                        <small>{booking.start}–{booking.end} · {booking.site}</small>
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {!todays.some((booking) => booking.slots.some((slot) => slot.personId === person.id)) && <p className="muted">Nothing with their name on it today.</p>}
                    </article>
                ))}
            </div>
            {state.demoRequests.length > 0 && (
                <section className="card">
                    <IconKicker name="demo">Demo requests</IconKicker>
                    <ul className="feed">
                        {state.demoRequests.map((request) => (
                            <li key={request.id}>
                                <span>
                                    <strong>{request.name} · {request.company}</strong>
                                    <small>{request.email} · crew {request.crewSize}{request.note ? ` · ${request.note}` : ''}</small>
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )
}

function StarterChecks() {
    const { state } = useStore()
    const starters = state.people.filter((person) => person.onboarding.some((item) => !item.done))
    return (
        <section className="card">
            <div className="job-head">
                <IconKicker name="people">Onboarding</IconKicker>
                <Link to="/app/people">People</Link>
            </div>
            <ul className="feed">
                {starters.map((person) => {
                    const done = person.onboarding.filter((item) => item.done).length
                    return (
                        <li key={person.id}>
                            <Link to={`/app/people/${person.id}`}>
                                <span>
                                    <strong>{person.name}</strong>
                                    <small>{done} of {person.onboarding.length} checks done · {person.depot}</small>
                                </span>
                            </Link>
                        </li>
                    )
                })}
                {!starters.length && <li>No one is waiting on onboarding checks.</li>}
            </ul>
        </section>
    )
}

function greeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Morning'
    if (hour < 17) return 'Afternoon'
    return 'Evening'
}

function delta(now: number, then: number) {
    const diff = now - then
    if (diff === 0) return 'Same as yesterday'
    return `${diff > 0 ? 'Up' : 'Down'} ${Math.abs(diff)} vs yesterday`
}

function countExpiring(people: { skills: { expires: string }[] }[], day: string, warningDays: number) {
    const horizon = addDays(day, warningDays)
    return people.reduce((sum, person) => sum + person.skills.filter((skill) => skill.expires <= horizon).length, 0)
}

function sourceLabel(source: string) {
    if (source === 'field-sync') return 'Field'
    if (source === 'closeout-bot') return 'Close-out'
    if (source === 'roster-bot') return 'Roster'
    return 'Office'
}

function Kpi({ icon, label, value, note, href, tone = 'ok' }: { icon: 'people' | 'board' | 'ticket' | 'dockets'; label: string; value: number; note: string; href: string; tone?: 'ok' | 'bad' }) {
    return (
        <Link to={href} className={cx('kpi', 'overview-kpi', tone === 'bad' && 'kpi-bad')}>
            <Icon name={icon} />
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
        </Link>
    )
}
