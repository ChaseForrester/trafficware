import { Link } from 'react-router-dom'
import { buildAlerts } from '../../lib/bots.ts'
import { prettyWhen, round1 } from '../../lib/format.ts'
import { statusFor, weekHours } from '../../lib/rules.ts'
import { useStore } from '../../lib/store.tsx'

export function Dashboard() {
    const { state, today } = useStore()
    const todays = state.bookings.filter((booking) => booking.date === today)
    const openSlots = todays.reduce((sum, booking) => sum + booking.slots.filter((slot) => !slot.personId).length, 0)
    const rostered = new Set(todays.flatMap((booking) => booking.slots.map((slot) => slot.personId).filter(Boolean))).size
    const toApprove = state.dockets.filter((docket) => docket.status === 'submitted').length
    const alerts = buildAlerts(state, today).slice(0, 8)
    const heavy = [...state.people]
        .map((person) => ({ person, hours: weekHours(state, person.id, today) }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 4)

    return (
        <div className="page-pad">
            <header className="page-title">
                <div>
                    <p className="kicker">Today</p>
                    <h1>The yard at a glance</h1>
                </div>
                <Link to="/app/board" className="btn btn-primary btn-small">Go to the board</Link>
            </header>
            <div className="kpi-grid">
                <Link to="/app/board" className="kpi"><strong>{todays.length}</strong><span>Jobs today</span></Link>
                <Link to="/app/board" className="kpi"><strong>{rostered}</strong><span>People rostered</span></Link>
                <Link to="/app/board" className="kpi"><strong>{openSlots}</strong><span>Open slots</span></Link>
                <Link to="/app/closeout" className="kpi"><strong>{toApprove}</strong><span>Dockets to approve</span></Link>
            </div>
            <div className="split">
                <section className="card">
                    <p className="kicker">Alerts</p>
                    <h2>Expiry, fatigue, gaps</h2>
                    <ul className="feed">
                        {alerts.map((alert) => (
                            <li key={alert.id}>
                                <Link to={alert.href}>
                                    <em className={`dot dot-${alert.tone}`} />
                                    <span>
                                        <strong>{alert.title}</strong>
                                        <small>{alert.detail}</small>
                                    </span>
                                </Link>
                            </li>
                        ))}
                        {!alerts.length && <li>Nothing is ringing. The week is clear.</li>}
                    </ul>
                </section>
                <section className="card">
                    <p className="kicker">Activity</p>
                    <h2>Bots and the office</h2>
                    <ul className="feed">
                        {state.activity.slice(0, 8).map((event) => (
                            <li key={event.id}>
                                <span>
                                    <strong>{event.message}</strong>
                                    <small>{event.source} · {prettyWhen(event.at)}</small>
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
            <div className="split">
                <section className="card">
                    <p className="kicker">Hours this week</p>
                    <h2>Who is carrying the load</h2>
                    <ul className="feed">
                        {heavy.map(({ person, hours }) => (
                            <li key={person.id}>
                                <Link to={`/app/people/${person.id}`}>
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
                    <p className="kicker">Record room</p>
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
