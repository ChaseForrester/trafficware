import { Link } from 'react-router-dom'

export function Logo({ light = false }: { light?: boolean }) {
    return (
        <Link to="/" className={light ? 'brand brand-light' : 'brand'} aria-label="Trafficware home">
            <svg viewBox="0 0 36 36" aria-hidden="true">
                <rect width="36" height="36" rx="8" fill={light ? '#ffe14a' : '#10141c'} />
                <path d="M18 6 29 28H7L18 6Z" fill={light ? '#10141c' : '#ffe14a'} />
                <rect x="16.2" y="15" width="3.6" height="8" rx="0.6" fill={light ? '#ffe14a' : '#10141c'} />
            </svg>
            <span>Trafficware</span>
        </Link>
    )
}
