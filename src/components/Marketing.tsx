import { Link, NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../lib/store.tsx'
import { Icon, IconKicker, TechStack } from './Icons.tsx'
import { Logo } from './Logo.tsx'

export function Marketing() {
    const { state, today } = useStore()
    const openSlots = state.bookings
        .filter((booking) => booking.date === today)
        .reduce((sum, booking) => sum + booking.slots.filter((slot) => !slot.personId).length, 0)

    return (
        <div className="site">
            <header className="nav nav-dark">
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
