import { Link, NavLink, Outlet } from 'react-router-dom'
import { Logo } from './Logo.tsx'
import { useStore } from '../lib/store.tsx'

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
                        <Link to="/business">Office</Link>
                        <Link to="/crew">Crew</Link>
                        <Link to="/#how">How it works</Link>
                        <NavLink to="/product">Product</NavLink>
                        <NavLink to="/platform">Platform</NavLink>
                        <NavLink to="/pricing">Pricing</NavLink>
                        <NavLink to="/demo">Book a demo</NavLink>
                    </nav>
                    <Link to="/app/board" className="btn btn-primary btn-small nav-cta">
                        Open the board{openSlots ? ` · ${openSlots} open` : ''}
                    </Link>
                </div>
            </header>
            <Outlet />
            <footer className="footer">
                <div className="wrap footer-grid">
                    <div>
                        <Logo to="/" lockup />
                        <p className="muted">Booking, people and field dockets for traffic companies. One record for the shift.</p>
                    </div>
                    <div>
                        <p className="kicker">Product</p>
                        <Link to="/#how">Six steps</Link>
                        <Link to="/business">Office</Link>
                        <Link to="/crew">Crew</Link>
                        <Link to="/product">Features</Link>
                        <Link to="/platform">How it fits together</Link>
                        <Link to="/pricing">Pricing</Link>
                    </div>
                    <div>
                        <p className="kicker">Workspace</p>
                        <Link to="/start">Start a company</Link>
                        <Link to="/join">Join the crew</Link>
                        <Link to="/app">Office</Link>
                        <Link to="/dockets">Print dockets</Link>
                    </div>
                    <div>
                        <p className="kicker">Demo</p>
                        <Link to="/demo">Book a demo</Link>
                        <p className="muted">Sample company data stays in this browser until you connect Firebase.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
