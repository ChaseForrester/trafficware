import { Link, NavLink, Outlet } from 'react-router-dom'
import { Logo } from '../../components/Logo.tsx'
import { useTitle } from '../../components/useTitle.ts'
import { addDays, cx } from '../../lib/format.ts'
import { useStore } from '../../lib/store.tsx'

const links = [
    { to: '/app', label: 'Today', end: true },
    { to: '/app/people', label: 'People' },
    { to: '/app/board', label: 'Booking board' },
    { to: '/app/fleet', label: 'Fleet & gear' },
    { to: '/app/clients', label: 'Clients' },
    { to: '/app/closeout', label: 'Close-out' },
    { to: '/app/integrations', label: 'Integrations' },
    { to: '/field', label: 'Field app' },
    { to: '/app/settings', label: 'Settings' },
]

export function AppShell() {
    useTitle('Platform · Trafficware')
    const { state, today } = useStore()
    const fresh = state.bookings.some((booking) => booking.date >= addDays(today, -2) && booking.date <= addDays(today, 2))
    const queued = state.outbox.length + state.safetyNotes.filter((note) => note.status === 'queued').length

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <Logo light />
                <nav aria-label="Platform">
                    {links.map((link) => (
                        <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => cx('side-link', isActive && 'on')}>
                            {link.label}
                            {link.to === '/field' && queued > 0 ? <em>{queued}</em> : null}
                        </NavLink>
                    ))}
                </nav>
                <Link to="/" className="side-quiet">
                    Back to the site
                </Link>
            </aside>
            <div className="main">
                <div className="topbar">
                    <strong>{state.settings.companyName}</strong>
                    <span className="tag">Database on this device</span>
                    {state.offline && <span className="tag tag-warn">Field offline</span>}
                </div>
                {!fresh && (
                    <div className="banner">
                        This workspace was seeded for another week, so today looks empty.{' '}
                        <Link to="/app/settings">Restore the sample week in Settings.</Link>
                    </div>
                )}
                <Outlet />
            </div>
        </div>
    )
}
