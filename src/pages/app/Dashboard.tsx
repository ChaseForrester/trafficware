import { Link } from 'react-router-dom'
import { Avatar } from '../../components/Avatar.tsx'
import { useGrok } from '../../components/GrokDock.tsx'
import { Icon, IconKicker } from '../../components/Icons.tsx'
import { buildAlerts } from '../../lib/bots.ts'
import { addDays, cx, prettyLong, prettyWhen, round1 } from '../../lib/format.ts'
import { usePair } from '../../lib/pair.tsx'
import { statusFor, weekHours } from '../../lib/rules.ts'
import { useStore } from '../../lib/store.tsx'

export function Dashboard() {
    const { state, today } = useStore()
    const pair = usePair()
    const grok = useGrok()
    const todays = state.bookings.filter((booking) => booking.date === today)
    const yesterday = addDays(today, -1)
    const yesterdays = state.bookings.filter((booking) => booking.date === yesterday)
    const openSlots = todays.reduce((sum, booking) => sum + booking.slots.filter((slot) => !slot.personId).length, 0)
    const rostered = new Set(todays.flatMap((booking) => booking.slots.map((slot) => slot.personId).filter(Boolean))).size
    const toApprove = state.dockets.filter((docket) => docket.status === 'submitted').length
    const alerts = buildAlerts(state, today).slice(0, 6)
    const weekStart = addDays(today, -6)
    const weekBookings = state.bookings.filter((booking) => booking.date >= weekStart && booking.date <= today)
    const weekSlots = weekBookings.flatMap((booking) => booking.slots)
    const filled = weekSlots.filter((slot) => slot.personId).length
    const open = weekSlots.length - filled
    const onLeave = state.people.filter((person) => person.status === 'leave' || person.leaveDates.includes(today)).length
    const active = state.people.filter((person) => person.status === 'active' && !person.leaveDates.includes(today)).length
    const activeYesterday = state.people.filter((person) => person.status === 'active' && !person.leaveDates.includes(yesterday)).length
    const expiring = countExpiring(state.people, today, state.settings.expiryWarningDays)
    const expiringYesterday = countExpiring(state.people, yesterday, state.settings.expiryWarningDays)
    const sparkJobs = Array.from({ length: 7 }, (_, index) => state.bookings.filter((booking) => booking.date === addDays(weekStart, index)).length)
    const filledPct = weekSlots.length ? Math.round((filled / weekSlots.length) * 100) : 0
    const heavy = [...state.people]
        .map((person) => ({ person, hours: weekHours(state, person.id, today) }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 4)

    return (
        <div className="page-pad">
            <header className="page-title">
                <div>
                    <IconKicker name="today">Overview</IconKicker>
                    <h1>{greeting()}{pair.holder ? `, ${pair.holder.name.split(' ')[0]}` : ''}</h1>
                    <p className="muted">Here is the yard today. Counts are this workspace, not a sample chart.</p>
                </div>
                <p className="hours-pill">{prettyLong(today)}</p>
            </header>
            <div className="overview-kpis">
                <Kpi icon="people" label="Active crew" value={active} note={delta(active, activeYesterday)} href="/app/people" series={sparkJobs} />
                <Kpi icon="board" label="Today's jobs" value={todays.length} note={delta(todays.length, yesterdays.length)} href="/app/board" series={sparkJobs} />
                <Kpi icon="ticket" label="Expiring tickets" value={expiring} note={delta(expiring, expiringYesterday)} href="/app/people" series={sparkJobs} tone={expiring ? 'bad' : 'ok'} />
                <Kpi icon="dockets" label="Dockets to approve" value={toApprove} note={`${rostered} people rostered · ${openSlots} open slots`} href="/app/closeout" series={sparkJobs} />
            </div>
            <div className="split">
                <section className="card">
                    <IconKicker name="board">Roster use this week</IconKicker>
                    <div className="util-row">
                        <div
                            className="donut"
                            style={{ background: donut(filled, open) }}
                            role="img"
                            aria-label={`${filledPct}% of this week's slots are filled`}
                        >
                            <div className="donut-hole">
                                <strong>{filledPct}%</strong>
                                <span>Filled</span>
                            </div>
                        </div>
                        <ul className="util-legend">
                            <li><i className="swatch swatch-ok" /> Filled shifts <strong>{filled}</strong></li>
                            <li><i className="swatch swatch-open" /> Open shifts <strong>{open}</strong></li>
                            <li><i className="swatch swatch-leave" /> On leave <strong>{onLeave}</strong></li>
                            <li><i className="swatch swatch-total" /> People <strong>{state.people.length}</strong></li>
                        </ul>
                    </div>
                    <p className="muted">Filled and open are slots from the last 7 days. On leave is people, so it sits beside the ring.</p>
                </section>
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
            </div>
            <section className="card">
                <IconKicker name="bot">Recent activity</IconKicker>
                <div className="activity-row">
                    {state.activity.slice(0, 4).map((event) => (
                        <article key={event.id}>
                            <Icon name={event.source === 'field-sync' ? 'field' : event.source === 'closeout-bot' ? 'closeout' : event.source === 'roster-bot' ? 'bot' : 'check'} />
                            <strong>{event.message}</strong>
                            <small>{event.source} · {prettyWhen(event.at)}</small>
                        </article>
                    ))}
                    {!state.activity.length && <p className="muted">The log is empty until a bot or the office writes to it.</p>}
                </div>
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
            <section className="card grok-card">
                <IconKicker name="xai">Grok</IconKicker>
                <h2>Ask before you roll</h2>
                <p>Grok reads today's jobs, tickets and the rules the board already checked.</p>
                <button
                    type="button"
                    className="btn btn-primary btn-small"
                    onClick={() => grok.openWith('Give the two of us a morning brief. Start with our own jobs, then open slots, then anything that blocks the day.')}
                >
                    Morning brief
                </button>
            </section>
            <div className="split">
                <section className="card">
                    <IconKicker name="fatigue">Hours this week</IconKicker>
                    <h2>Who is carrying the load</h2>
                    <ul className="feed">
                        {heavy.map(({ person, hours }) => (
                            <li key={person.id}>
                                <Link to={`/app/people/${person.id}`}>
                                    <Avatar person={person} size="sm" />
                                    <span>
                                        <strong>{person.name}</strong>
                                        <small>{round1(hours)}h rostered in 7 days · limit {state.settings.maxWeekHours}h</small>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
                <section className="card">
                    <IconKicker name="cloud">Record room</IconKicker>
                    <h2>What the database is holding</h2>
                    <ul className="check-list">
                        <li>{state.people.length} people</li>
                        <li>{state.bookings.length} jobs · {state.bookings.filter((booking) => statusFor(state, booking) === 'invoiced').length} invoiced</li>
                        <li>{state.dockets.length} dockets · {state.outbox.length} waiting on a phone</li>
                        <li>{state.invoices.length} invoices · {state.safetyNotes.length} near misses</li>
                        <li>{state.clients.length} clients · {state.vehicles.length} vehicles</li>
                    </ul>
                    {state.demoRequests.length > 0 && (
                        <>
                            <h3>Demo requests</h3>
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
                        </>
                    )}
                </section>
            </div>
        </div>
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

function donut(filled: number, open: number) {
    const total = Math.max(1, filled + open)
    const a = (filled / total) * 100
    return `conic-gradient(#1f9d55 0 ${a}%, #3b6cff ${a}% 100%)`
}

function Spark({ series }: { series: number[] }) {
    const max = Math.max(1, ...series)
    const points = series.map((value, index) => `${(index / Math.max(1, series.length - 1)) * 100},${28 - (value / max) * 24}`).join(' ')
    return (
        <svg className="spark" viewBox="0 0 100 32" aria-hidden="true">
            <polyline points={points} />
        </svg>
    )
}

function Kpi({ icon, label, value, note, href, series, tone = 'ok' }: { icon: 'people' | 'board' | 'ticket' | 'dockets'; label: string; value: number; note: string; href: string; series: number[]; tone?: 'ok' | 'bad' }) {
    return (
        <Link to={href} className={cx('kpi', 'overview-kpi', tone === 'bad' && 'kpi-bad')}>
            <Icon name={icon} />
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
            <Spark series={series} />
        </Link>
    )
}
