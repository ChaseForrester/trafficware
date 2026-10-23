import type { ReactNode } from 'react'
import { cx } from '../lib/format.ts'

export type IconName =
    | 'today'
    | 'board'
    | 'people'
    | 'fleet'
    | 'clients'
    | 'closeout'
    | 'dockets'
    | 'field'
    | 'integrations'
    | 'rules'
    | 'more'
    | 'office'
    | 'crew'
    | 'product'
    | 'platform'
    | 'pricing'
    | 'demo'
    | 'ticket'
    | 'fatigue'
    | 'rest'
    | 'clash'
    | 'invoice'
    | 'alert'
    | 'cloud'
    | 'bot'
    | 'payroll'
    | 'gps'
    | 'hr'
    | 'xero'
    | 'card'
    | 'react'
    | 'typescript'
    | 'vite'
    | 'firebase'
    | 'vercel'
    | 'xai'
    | 'check'

const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
}

function wrap(children: ReactNode) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            {children}
        </svg>
    )
}

const MARKS: Record<IconName, ReactNode> = {
    today: wrap(
        <>
            <rect x="4" y="5" width="16" height="15" rx="2" {...stroke} />
            <path d="M8 3.5v3M16 3.5v3M4 9.5h16" {...stroke} />
        </>,
    ),
    board: wrap(
        <>
            <rect x="3.5" y="4" width="7" height="6" rx="1.4" {...stroke} />
            <rect x="13.5" y="4" width="7" height="6" rx="1.4" {...stroke} />
            <rect x="3.5" y="14" width="7" height="6" rx="1.4" {...stroke} />
            <rect x="13.5" y="14" width="7" height="6" rx="1.4" {...stroke} />
        </>,
    ),
    people: wrap(
        <>
            <circle cx="9" cy="9" r="2.3" {...stroke} />
            <circle cx="16" cy="10" r="1.8" {...stroke} />
            <path d="M4.8 18.2c.6-2.3 2.3-3.5 4.2-3.5s3.6 1.2 4.2 3.5M13.8 14.8c1.2-.4 2.5.1 3.4 1.6" {...stroke} />
        </>,
    ),
    crew: wrap(
        <>
            <circle cx="12" cy="8" r="2.6" {...stroke} />
            <path d="M6.5 18.5c.8-2.8 2.8-4.2 5.5-4.2s4.7 1.4 5.5 4.2" {...stroke} />
        </>,
    ),
    fleet: wrap(
        <>
            <path d="M3 15V9.5L6 6h8l3 3H21v6" {...stroke} />
            <path d="M3 15h18" {...stroke} />
            <circle cx="7.5" cy="16.5" r="1.6" {...stroke} />
            <circle cx="16.5" cy="16.5" r="1.6" {...stroke} />
        </>,
    ),
    clients: wrap(
        <>
            <path d="M4 19V8l8-4 8 4v11" {...stroke} />
            <path d="M9 19v-5h6v5" {...stroke} />
        </>,
    ),
    closeout: wrap(
        <>
            <path d="M6 3.5h8l4 4V20H6V3.5Z" {...stroke} />
            <path d="M14 3.5v5h5M8 13h8M8 17h5" {...stroke} />
        </>,
    ),
    dockets: wrap(
        <>
            <path d="M7 3.5h8l3 3V20H7V3.5Z" {...stroke} />
            <path d="M15 3.5v3.5h3M9 12h6M9 16h4" {...stroke} />
        </>,
    ),
    field: wrap(
        <>
            <rect x="7" y="2.5" width="10" height="19" rx="2" {...stroke} />
            <path d="M11 18.5h2" {...stroke} />
        </>,
    ),
    integrations: wrap(
        <>
            <circle cx="6" cy="12" r="2.2" {...stroke} />
            <circle cx="18" cy="7" r="2.2" {...stroke} />
            <circle cx="18" cy="17" r="2.2" {...stroke} />
            <path d="M8 11.2 16 8M8 12.8l8 3.2" {...stroke} />
        </>,
    ),
    rules: wrap(
        <>
            <circle cx="12" cy="12" r="7.5" {...stroke} />
            <path d="M12 8.5v4l2.5 1.5" {...stroke} />
        </>,
    ),
    more: wrap(
        <>
            <circle cx="6" cy="12" r="1.3" fill="currentColor" />
            <circle cx="12" cy="12" r="1.3" fill="currentColor" />
            <circle cx="18" cy="12" r="1.3" fill="currentColor" />
        </>,
    ),
    office: wrap(
        <>
            <rect x="4" y="3.5" width="16" height="17" rx="1.5" {...stroke} />
            <path d="M8 8h3M13 8h3M8 12h3M13 12h3M8 16h3M13 16h3" {...stroke} />
        </>,
    ),
    product: wrap(
        <>
            <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z" {...stroke} />
            <path d="M12 12 20 8M12 12v8.5M12 12 4 8" {...stroke} />
        </>,
    ),
    platform: wrap(
        <>
            <ellipse cx="12" cy="7" rx="6" ry="2.4" {...stroke} />
            <path d="M6 7v5c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4V7" {...stroke} />
            <path d="M6 12v4.5c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4V12" {...stroke} />
        </>,
    ),
    pricing: wrap(
        <>
            <rect x="3.5" y="6" width="17" height="12" rx="2" {...stroke} />
            <path d="M3.5 10h17" {...stroke} />
        </>,
    ),
    demo: wrap(
        <>
            <rect x="3.5" y="5" width="17" height="14" rx="2" {...stroke} />
            <path d="M8 5V3.8h8V5M8 16h8" {...stroke} />
        </>,
    ),
    ticket: wrap(
        <>
            <path d="M4 8.5h16v3a2 2 0 0 0 0 3v3H4v-3a2 2 0 0 0 0-3v-3Z" {...stroke} />
            <path d="M12 8.5v9" {...stroke} />
        </>,
    ),
    fatigue: wrap(
        <>
            <circle cx="12" cy="12" r="7.5" {...stroke} />
            <path d="M12 8v4.5" {...stroke} />
            <path d="M9 15.5h6" {...stroke} />
        </>,
    ),
    rest: wrap(
        <>
            <path d="M6 16.5h12" {...stroke} />
            <path d="M7 16.5V12a5 5 0 0 1 10 0v4.5" {...stroke} />
            <path d="M9 8.5c.4-1.5 1.6-2.5 3-2.5" {...stroke} />
        </>,
    ),
    clash: wrap(
        <>
            <circle cx="12" cy="12" r="7.5" {...stroke} />
            <path d="M8 8l8 8" {...stroke} />
        </>,
    ),
    invoice: wrap(
        <>
            <path d="M6 3.5h12v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2V3.5Z" {...stroke} />
            <path d="M9 8h6M9 12h6" {...stroke} />
        </>,
    ),
    alert: wrap(
        <>
            <path d="M12 4 3.5 19h17L12 4Z" {...stroke} />
            <path d="M12 10v4" {...stroke} />
            <circle cx="12" cy="16.2" r="0.8" fill="currentColor" />
        </>,
    ),
    cloud: wrap(
        <>
            <path d="M7 17h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.2A3.5 3.5 0 0 0 7 17Z" {...stroke} />
        </>,
    ),
    bot: wrap(
        <>
            <rect x="5" y="8" width="14" height="10" rx="3" {...stroke} />
            <path d="M12 8V5" {...stroke} />
            <circle cx="9" cy="13" r="0.8" fill="currentColor" />
            <circle cx="15" cy="13" r="0.8" fill="currentColor" />
        </>,
    ),
    payroll: wrap(
        <>
            <rect x="3.5" y="6" width="17" height="12" rx="2" {...stroke} />
            <path d="M7 12h4M7 15h6M14 11.5v4" {...stroke} />
        </>,
    ),
    gps: wrap(
        <>
            <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" {...stroke} />
            <circle cx="12" cy="11" r="2" {...stroke} />
        </>,
    ),
    hr: wrap(
        <>
            <rect x="6" y="3.5" width="12" height="17" rx="1.6" {...stroke} />
            <path d="M9 8h6M9 12h6M9 15.5l1.4 1.4L15 12.5" {...stroke} />
        </>,
    ),
    xero: wrap(
        <>
            <path d="M5 5.5h10l4 4V19H5V5.5Z" {...stroke} />
            <path d="M15 5.5V10h4M8 14h8M8 17h5" {...stroke} />
        </>,
    ),
    card: wrap(
        <>
            <rect x="3" y="6" width="18" height="12" rx="2" {...stroke} />
            <path d="M3 10h18M7 14.5h4" {...stroke} />
        </>,
    ),
    react: wrap(
        <>
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <ellipse cx="12" cy="12" rx="8" ry="3.2" {...stroke} />
            <ellipse cx="12" cy="12" rx="8" ry="3.2" transform="rotate(60 12 12)" {...stroke} />
            <ellipse cx="12" cy="12" rx="8" ry="3.2" transform="rotate(120 12 12)" {...stroke} />
        </>,
    ),
    typescript: wrap(
        <>
            <rect x="3.5" y="3.5" width="17" height="17" rx="3" {...stroke} />
            <path d="M8 9h8M12 9v7" {...stroke} />
        </>,
    ),
    vite: wrap(<path d="M13 3 5 13h6l-1 8 9-12h-6l0-6Z" {...stroke} />),
    firebase: wrap(<path d="M12 3.5 6 20h3.2L12 8.5 16.2 20H19L12 3.5Z" {...stroke} />),
    vercel: wrap(
        <>
            <path d="M12 5 20 18H4L12 5Z" {...stroke} />
            <path d="M12 11v4" {...stroke} />
        </>,
    ),
    xai: wrap(
        <>
            <circle cx="12" cy="12" r="7.5" {...stroke} />
            <path d="M8 12h8M12 8v8" {...stroke} />
        </>,
    ),
    check: wrap(<path d="M5 12.5 9.2 17 19 7" {...stroke} />),
}

const STACK: { name: IconName; label: string }[] = [
    { name: 'react', label: 'React' },
    { name: 'typescript', label: 'TypeScript' },
    { name: 'vite', label: 'Vite' },
    { name: 'firebase', label: 'Firebase' },
    { name: 'vercel', label: 'Vercel' },
    { name: 'xai', label: 'xAI' },
]

export function Icon({ name, className }: { name: IconName; className?: string }) {
    return <span className={className ? `ico ${className}` : 'ico'}>{MARKS[name]}</span>
}

export function IconKicker({ name, children, className }: { name: IconName; children: ReactNode; className?: string }) {
    return (
        <p className={cx('kicker', 'kicker-icon', className)}>
            <Icon name={name} />
            <span>{children}</span>
        </p>
    )
}

export function TechStack({ className }: { className?: string }) {
    return (
        <ul className={cx('tech-stack', className)} aria-label="Built with">
            {STACK.map((item) => (
                <li key={item.name}>
                    <Icon name={item.name} />
                    <span>{item.label}</span>
                </li>
            ))}
        </ul>
    )
}
