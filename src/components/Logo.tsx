import { Link } from 'react-router-dom'

export function Logo({ to = '/', lockup = false }: { to?: string; lockup?: boolean }) {
    if (lockup) {
        return (
            <Link to={to} className="brand brand-lockup" aria-label="Trafficware">
                <span className="logo-plate">
                    <img src="/brand/logo-lockup.png" alt="Trafficware" />
                </span>
            </Link>
        )
    }

    return (
        <Link to={to} className="brand" aria-label="Trafficware">
            <img src="/brand/logo-mark.png" alt="" />
            <span>Trafficware</span>
        </Link>
    )
}
