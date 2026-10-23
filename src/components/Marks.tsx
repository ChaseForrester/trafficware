import { Icon } from './Icons.tsx'
import type { IconName } from './Icons.tsx'

export type StepIconName = 'job' | 'block' | 'bot' | 'phone' | 'sign' | 'invoice'

const stroke = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
}

export function StepIcon({ name }: { name: StepIconName }) {
    if (name === 'job') {
        return (
            <svg {...stroke}>
                <rect x="4" y="3" width="16" height="18" rx="2" />
                <path d="M8 8h8M8 12h8M8 16h5" />
            </svg>
        )
    }
    if (name === 'block') {
        return (
            <svg {...stroke}>
                <circle cx="12" cy="12" r="8" />
                <path d="M7 17 17 7" />
            </svg>
        )
    }
    if (name === 'bot') {
        return (
            <svg {...stroke}>
                <rect x="4" y="7" width="16" height="12" rx="3" />
                <path d="M12 7V4M9 13h.01M15 13h.01" />
            </svg>
        )
    }
    if (name === 'phone') {
        return (
            <svg {...stroke}>
                <rect x="7" y="2.5" width="10" height="19" rx="2" />
                <path d="M11 18.5h2" />
            </svg>
        )
    }
    if (name === 'sign') {
        return (
            <svg {...stroke}>
                <path d="M4 20h8" />
                <path d="M14.5 4.5 19 9l-8 8H6.5v-4.5l8-8Z" />
            </svg>
        )
    }
    return (
        <svg {...stroke}>
            <path d="M6 3h8l4 4v14H6V3Z" />
            <path d="M14 3v5h5M8 13h8M8 17h5" />
        </svg>
    )
}

export function DoneTick() {
    return (
        <svg className="mini-tick" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M7 12.5 10.2 16 17 8.5" />
        </svg>
    )
}

const ICONS: Record<string, IconName> = {
    Xero: 'xero',
    'Payroll file': 'payroll',
    GPS: 'gps',
    Tickets: 'ticket',
    'HR onboarding': 'hr',
    Stripe: 'card',
}

export function IntegrationMark({ name }: { name: string }) {
    const icon = ICONS[name]
    if (!icon) return <b className="brand-mark" aria-hidden="true">{name.slice(0, 2)}</b>
    return (
        <span className="brand-mark" aria-hidden="true">
            <Icon name={icon} />
        </span>
    )
}
