import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar.tsx'
import { useGrok } from '../../components/GrokDock.tsx'
import { Icon, TechStack } from '../../components/Icons.tsx'
import type { IconName } from '../../components/Icons.tsx'
import { useTitle } from '../../components/useTitle.ts'
import { clearAuth } from '../../lib/auth.ts'
import { addDays, cx } from '../../lib/format.ts'
import { usePair } from '../../lib/pair.tsx'
import { useSession } from '../../lib/session.tsx'
import { useStore } from '../../lib/store.tsx'
import { useTheme } from '../../lib/theme.tsx'

const OFFICE_TABS: { to: string; label: string; icon: IconName; match: (path: string) => boolean }[] = [
    { to: '/app', label: 'Today', icon: 'today', match: (path) => path === '/app' },
    { to: '/app/board', label: 'Jobs', icon: 'board', match: (path) => path.startsWith('/app/board') },
    { to: '/field', label: 'Field', icon: 'field', match: (path) => path.startsWith('/field') },
    { to: '/app/people', label: 'Crew', icon: 'crew', match: (path) => path.startsWith('/app/people') },
    { to: '/app/more', label: 'More', icon: 'more', match: (path) => ['/app/more', '/app/fleet', '/app/clients', '/app/closeout', '/app/integrations', '/app/settings', '/dockets'].some((item) => path === item || path.startsWith(`${item}/`)) },
]

const FIELD_TABS: { to: string; label: string; icon: IconName; match: (path: string) => boolean }[] = [
    { to: '/field', label: 'My jobs', icon: 'field', match: (path) => path.startsWith('/field') },
    { to: '/dockets', label: 'Dockets', icon: 'dockets', match: (path) => path.startsWith('/docket') },
]

const OFFICE_LINKS: { to: string; label: string; icon: IconName; match: (path: string) => boolean }[] = [
    { to: '/app', label: 'Today', icon: 'today', match: (path) => path === '/app' },
    { to: '/app/board', label: 'Booking board', icon: 'board', match: (path) => path.startsWith('/app/board') },
    { to: '/app/people', label: 'People', icon: 'people', match: (path) => path.startsWith('/app/people') },
    { to: '/app/fleet', label: 'Fleet', icon: 'fleet', match: (path) => path.startsWith('/app/fleet') },
    { to: '/app/clients', label: 'Clients', icon: 'clients', match: (path) => path.startsWith('/app/clients') },
    { to: '/app/closeout', label: 'Close-out', icon: 'closeout', match: (path) => path.startsWith('/app/closeout') },
    { to: '/dockets', label: 'Print dockets', icon: 'dockets', match: (path) => path.startsWith('/docket') },
    { to: '/field', label: 'Field phone', icon: 'field', match: (path) => path.startsWith('/field') },
    { to: '/app/integrations', label: 'Integrations', icon: 'integrations', match: (path) => path.startsWith('/app/integrations') },
    { to: '/app/settings', label: 'Rules', icon: 'rules', match: (path) => path.startsWith('/app/settings') },
]

const FIELD_LINKS: { to: string; label: string; icon: IconName; match: (path: string) => boolean }[] = [
    { to: '/field', label: 'My jobs', icon: 'field', match: (path) => path.startsWith('/field') },
    { to: '/dockets', label: 'My dockets', icon: 'dockets', match: (path) => path.startsWith('/docket') },
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
    const [query, setQuery] = useState('')
    const needle = query.trim().toLowerCase()
    const hits = !field && needle.length >= 2
        ? [
            ...state.people
                .filter((person) => `${person.name} ${person.title} ${person.depot}`.toLowerCase().includes(needle))
                .slice(0, 4)
                .map((person) => ({ to: `/app/people/${person.id}`, label: person.name, detail: person.title })),
            ...state.bookings
                .filter((booking) => `${booking.title} ${booking.site}`.toLowerCase().includes(needle))
                .slice(0, 4)
                .map((booking) => ({ to: '/app/board', label: booking.title, detail: `${booking.date} · ${booking.site}` })),
        ]
        : []
    const signedIn = session
        ? state.people.find((person) => (session.personId && person.id === session.personId) || person.name === session.personName) ?? null
        : null

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
                            <Icon name={link.icon} />
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="side-quiet">
                    {session ? (
                        <>
                            <p className="side-person">
                                <Avatar person={signedIn ?? { id: session.personId ?? 'session', name: session.personName, color: '#3f3a64' }} size="sm" />
                                <span>{session.personName}</span>
                            </p>
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
            <div className="app-head">
                <header className="app-bar">
                    <div className="brand">
                        <img src="/brand/logo-mark.png" alt="" />
                        <span>Trafficware</span>
                    </div>
                    {!field && (
                        <form className="app-search" role="search" onSubmit={(event) => event.preventDefault()}>
                            <Icon name="people" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search crew, jobs, sites"
                                aria-label="Search crew, jobs, sites"
                            />
                            {hits.length > 0 && (
                                <div className="app-hits">
                                    {hits.map((hit) => (
                                        <Link key={`${hit.to}-${hit.label}`} to={hit.to} onClick={() => setQuery('')}>
                                            <strong>{hit.label}</strong>
                                            <small>{hit.detail}</small>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </form>
                    )}
                    <div className="app-tools">
                        {!field && <Link to="/app#alerts" className="icon-btn" aria-label="Compliance alerts"><Icon name="alert" /></Link>}
                        {!field && <Link to="/#how" className="icon-btn" aria-label="How the yard works"><Icon name="bot" /></Link>}
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
                                        <Avatar person={person} size="sm" />
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
                <div className="stack-bar">
                    <TechStack />
                </div>
            </div>
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
                        <Icon name={tab.icon} />
                        <span>{tab.label}</span>
                        {tab.to === '/field' && queued > 0 ? <em>{queued}</em> : null}
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}
