import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../lib/store.tsx'
import { useGrok } from './GrokDock.tsx'
import { Icon, IconKicker, TechStack } from './Icons.tsx'
import { Logo } from './Logo.tsx'

const PHONE_PLACES = [
    { to: '/', label: 'Board', detail: 'Rostering home' },
    { to: '/#board', label: 'Jobs', detail: 'Today’s live board' },
    { to: '/crew', label: 'Crew', detail: 'The person page' },
    { to: '/#how', label: 'Automations', detail: 'The six yard automations' },
    { to: '/app', label: 'Profile', detail: 'The office' },
    { to: '/business', label: 'Office', detail: 'The business page' },
    { to: '/product', label: 'Product', detail: 'Features' },
    { to: '/pricing', label: 'Pricing', detail: 'Plans' },
    { to: '/demo', label: 'Book a demo', detail: 'Talk to us' },
]

export function Marketing() {
    const { state, today } = useStore()
    const grok = useGrok()
    const { pathname, hash } = useLocation()
    const [searching, setSearching] = useState(false)
    const [query, setQuery] = useState('')
    const openSlots = state.bookings
        .filter((booking) => booking.date === today)
        .reduce((sum, booking) => sum + booking.slots.filter((slot) => !slot.personId).length, 0)
    const needle = query.trim().toLowerCase()
    const places = PHONE_PLACES.filter((place) => `${place.label} ${place.detail}`.toLowerCase().includes(needle))
    const onHome = pathname === '/'
    const tab = pathname === '/crew'
        ? 'crew'
        : pathname === '/start' || pathname === '/join'
            ? 'profile'
            : !onHome
                ? ''
                : hash === '#board'
                    ? 'jobs'
                    : hash === '#how'
                        ? 'auto'
                        : 'board'

    return (
        <div className="site">
            <header className="nav nav-dark">
                <div className="phone-bar">
                    <Logo to="/" />
                    <span className="phone-bar-rule" aria-hidden="true" />
                    <span className="phone-bar-title">Rostering</span>
                    <button type="button" className="phone-icon" aria-label="Search" aria-expanded={searching} onClick={() => setSearching((open) => !open)}>
                        <Icon name="search" />
                    </button>
                    <button type="button" className="phone-voice" aria-label="Ask Grok" onClick={() => { setSearching(false); grok.open() }}>
                        <Icon name="wave" />
                    </button>
                </div>
                {searching && (
                    <div className="phone-search">
                        <label className="field">
                            Search
                            <input
                                value={query}
                                autoFocus
                                placeholder="Board, crew, pricing"
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </label>
                        <ul>
                            {places.map((place) => (
                                <li key={place.to}>
                                    <Link to={place.to} onClick={() => setSearching(false)}>
                                        <strong>{place.label}</strong>
                                        <span>{place.detail}</span>
                                    </Link>
                                </li>
                            ))}
                            {!places.length && <li className="muted">Nothing matches that.</li>}
                        </ul>
                    </div>
                )}
                <div className="nav-inner wrap">
                    <Logo to="/" />
                    <nav className="nav-links" aria-label="Primary">
                        <Link to="/business"><Icon name="office" /> Office</Link>
                        <Link to="/crew"><Icon name="crew" /> Crew</Link>
                        <Link to="/#how"><Icon name="bot" /> How it works</Link>
                        <NavLink to="/product"><Icon name="product" /> Product</NavLink>
                        <NavLink to="/platform"><Icon name="platform" /> Platform</NavLink>
                        <NavLink to="/pricing"><Icon name="pricing" /> Pricing</NavLink>
                        <NavLink to="/demo"><Icon name="demo" /> Book a demo</NavLink>
                    </nav>
                    <Link to="/app/board" className="btn btn-primary btn-small nav-cta">
                        <Icon name="board" /> Open the board{openSlots ? ` · ${openSlots} open` : ''}
                    </Link>
                </div>
            </header>
            <div className="stack-bar stack-bar-site">
                <div className="wrap">
                    <TechStack />
                </div>
            </div>
            <Outlet />
            <nav className="phone-tabs" aria-label="Rostering">
                <Link to="/" className={tab === 'board' ? 'on' : undefined}><Icon name="board" />Board</Link>
                <Link to="/#board" className={tab === 'jobs' ? 'on' : undefined}><Icon name="jobs" />Jobs</Link>
                <Link to="/crew" className={tab === 'crew' ? 'on' : undefined}><Icon name="people" />Crew</Link>
                <Link to="/#how" className={tab === 'auto' ? 'on' : undefined}><Icon name="bot" />Automations</Link>
                <Link to="/app" className={tab === 'profile' ? 'on' : undefined}><Icon name="user" />Profile</Link>
            </nav>
            <footer className="footer">
                <div className="wrap">
                    <TechStack />
                    <div className="footer-grid">
                        <div>
                            <Logo to="/" lockup />
                            <p className="muted">Booking, people and field dockets for traffic companies. One record for the shift.</p>
                        </div>
                        <div>
                            <IconKicker name="product">Product</IconKicker>
                            <Link to="/#how">Six steps</Link>
                            <Link to="/business">Office</Link>
                            <Link to="/crew">Crew</Link>
                            <Link to="/product">Features</Link>
                            <Link to="/platform">How it fits together</Link>
                            <Link to="/pricing">Pricing</Link>
                        </div>
                        <div>
                            <IconKicker name="office">Workspace</IconKicker>
                            <Link to="/start">Start a company</Link>
                            <Link to="/join">Join the crew</Link>
                            <Link to="/app">Office</Link>
                            <Link to="/dockets">Print dockets</Link>
                        </div>
                        <div>
                            <IconKicker name="demo">Demo</IconKicker>
                            <Link to="/demo">Book a demo</Link>
                            <p className="muted">Sample company data stays in this browser until you connect Firebase.</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
