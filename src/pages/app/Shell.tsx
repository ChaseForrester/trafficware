import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useGrok } from '../../components/GrokDock.tsx'
import { useTitle } from '../../components/useTitle.ts'
import { clearAuth } from '../../lib/auth.ts'
import { addDays, cx, initials } from '../../lib/format.ts'
import { usePair } from '../../lib/pair.tsx'
import { useSession } from '../../lib/session.tsx'
import { useStore } from '../../lib/store.tsx'
import { useTheme } from '../../lib/theme.tsx'

const OFFICE_TABS = [
    { to: '/app', label: 'Today', icon: IconToday, match: (path: string) => path === '/app' },
    { to: '/app/board', label: 'Jobs', icon: IconJobs, match: (path: string) => path.startsWith('/app/board') },
    { to: '/field', label: 'Field', icon: IconField, match: (path: string) => path.startsWith('/field') },
    { to: '/app/people', label: 'Crew', icon: IconCrew, match: (path: string) => path.startsWith('/app/people') },
    { to: '/app/more', label: 'More', icon: IconMore, match: (path: string) => ['/app/more', '/app/fleet', '/app/clients', '/app/closeout', '/app/integrations', '/app/settings', '/dockets'].some((item) => path === item || path.startsWith(`${item}/`)) },
]

const FIELD_TABS = [
    { to: '/field', label: 'My jobs', icon: IconField, match: (path: string) => path.startsWith('/field') },
    { to: '/dockets', label: 'Dockets', icon: IconJobs, match: (path: string) => path.startsWith('/docket') },
]

const OFFICE_LINKS = [
    { to: '/app', label: 'Today', match: (path: string) => path === '/app' },
    { to: '/app/board', label: 'Booking board', match: (path: string) => path.startsWith('/app/board') },
    { to: '/app/people', label: 'People', match: (path: string) => path.startsWith('/app/people') },
    { to: '/app/fleet', label: 'Fleet', match: (path: string) => path.startsWith('/app/fleet') },
    { to: '/app/clients', label: 'Clients', match: (path: string) => path.startsWith('/app/clients') },
    { to: '/app/closeout', label: 'Close-out', match: (path: string) => path.startsWith('/app/closeout') },
    { to: '/dockets', label: 'Print dockets', match: (path: string) => path.startsWith('/docket') },
    { to: '/field', label: 'Field phone', match: (path: string) => path.startsWith('/field') },
    { to: '/app/integrations', label: 'Integrations', match: (path: string) => path.startsWith('/app/integrations') },
    { to: '/app/settings', label: 'Rules', match: (path: string) => path.startsWith('/app/settings') },
]

const FIELD_LINKS = [
    { to: '/field', label: 'My jobs', match: (path: string) => path.startsWith('/field') },
    { to: '/dockets', label: 'My dockets', match: (path: string) => path.startsWith('/docket') },
]

export function AppShell() {
    useTitle('Trafficware')
    const { state, today } = useStore()
    const pair = usePair()
    const { theme, toggle } = useTheme()
    const { configured } = useGrok()
    const { session, clear } = useSession()
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const field = session?.role === 'field'
    const fresh = state.bookings.some((booking) => booking.date >= addDays(today, -2) && booking.date <= addDays(today, 2))
    const queued = state.outbox.length + state.safetyNotes.filter((note) => note.status === 'queued').length
    const operators = [pair.primary, pair.partner].filter((person, index, list) => person && list.findIndex((item) => item?.id === person.id) === index)
    const tabs = field ? FIELD_TABS : OFFICE_TABS
    const links = field ? FIELD_LINKS : OFFICE_LINKS

    if (field && pathname.startsWith('/app')) return <Navigate to="/field" replace />

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="brand">
                    <img src="/brand/logo-mark.png" alt="" />
                    <span>Trafficware</span>
                </div>
                <nav aria-label={field ? 'Field' : 'Office'}>
                    {links.map((link) => (
                        <NavLink key={link.to} to={link.to} className={cx('side-link', link.match(pathname) && 'on')}>
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="side-quiet">
                    {session ? (
                        <>
                            <p>{session.personName}</p>
                            <p>{session.email || `${session.companyName} · ${session.state}`}</p>
                            <button type="button" className="btn btn-ghost btn-small" onClick={() => { clearAuth(); clear(); navigate('/') }}>
                                {session.email ? 'Sign out' : 'Leave this role'}
                            </button>
                        </>
                    ) : (
                        <>
                            <p>Sample office</p>
                            <Link to="/start">Start a company</Link>
                            <Link to="/join">Join the crew</Link>
                        </>
                    )}
                    <Link to="/">Website</Link>
                </div>
            </aside>
            <header className="app-bar">
                <div className="brand">
                    <img src="/brand/logo-mark.png" alt="" />
                    <span>Trafficware</span>
                </div>
                <div className="app-tools">
                    <span className={cx('live-dot', configured === true && 'on')} title={configured ? 'Grok is live' : 'Grok is offline'}>
                        {configured ? 'Grok live' : configured === false ? 'Grok off' : 'Grok'}
                    </span>
                    {!field && (
                        <div className="who" role="group" aria-label="Who is holding the phone">
                            {operators.map((person) => person && (
                                <button
                                    key={person.id}
                                    type="button"
                                    className={cx('who-btn', pair.holderId === person.id && 'on')}
                                    aria-pressed={pair.holderId === person.id}
                                    onClick={() => pair.setHolder(person.id)}
                                >
                                    <span className="avatar sm" style={{ background: person.color }}>{initials(person.name)}</span>
                                    <span>{person.name.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <button type="button" className="theme-btn" aria-pressed={theme === 'night'} onClick={toggle}>
                        {theme === 'night' ? 'Day' : 'Night'}
                    </button>
                </div>
            </header>
            <div className="app-main" id="today">
                {!fresh && (
                    <div className="banner">
                        This workspace was seeded for another week, so today looks empty. Restore the sample week from More, then Rules.
                    </div>
                )}
                {!session && (
                    <div className="banner">
                        Sample office on this device. <Link to="/start">Start your company</Link> or <Link to="/join">join the crew</Link>. The six-step guide still runs on this yard.
                    </div>
                )}
                {session?.role === 'super-admin' && (
                    <div className="banner">
                        Office for {session.companyName} · {session.state}. Signed in as {session.email || session.personName}.
                    </div>
                )}
                <Outlet />
            </div>
            <nav className="tabbar" aria-label="App">
                {tabs.map((tab) => (
                    <NavLink key={tab.to} to={tab.to} className={cx('tab', tab.match(pathname) && 'on')}>
                        <tab.icon />
                        <span>{tab.label}</span>
                        {tab.to === '/field' && queued > 0 ? <em>{queued}</em> : null}
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}

function IconToday() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 3.5v3M16 3.5v3M4 9.5h16" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    )
}

function IconJobs() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 7h14M5 12h14M5 17h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    )
}

function IconField() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M11 18h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    )
}

function IconCrew() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="9" cy="9" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="16" cy="10" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M4.8 18c.6-2.2 2.3-3.4 4.2-3.4s3.6 1.2 4.2 3.4M14 14.7c1.3-.3 2.6.2 3.4 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    )
}

function IconMore() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="6" cy="12" r="1.3" fill="currentColor" />
            <circle cx="12" cy="12" r="1.3" fill="currentColor" />
            <circle cx="18" cy="12" r="1.3" fill="currentColor" />
        </svg>
    )
}
