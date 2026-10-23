import { Link } from 'react-router-dom'

const nodes = [
    {
        href: '/app/people',
        kicker: 'Super admin',
        title: 'Web platform',
        text: 'People, tickets, employment status, payroll rates and company rules.',
    },
    {
        href: '/app/board',
        kicker: 'Roster bot',
        title: 'Auto-suggest',
        text: 'Fills open slots with crew who clear skills, rest, fatigue and clashes.',
    },
    {
        href: '/app/board',
        kicker: 'Booking board',
        title: 'Employee roster',
        text: 'Drag a name onto a job. Conflict, fatigue and ticket checks run on the drop.',
    },
    {
        href: '/app/closeout',
        kicker: 'Close-out bot',
        title: 'Timesheets & invoices',
        text: 'Reviews dockets, approves the clean ones, and builds payroll and invoices.',
    },
    {
        href: '/app',
        kicker: 'Single source of truth',
        title: 'Central database',
        text: 'Jobs, people, trucks and dockets live in one record. This demo keeps it on the device.',
        center: true,
    },
    {
        href: '/field',
        kicker: 'Field sync bot',
        title: 'Push the outbox',
        text: 'Accepts, dockets and near misses queue offline, then sync when the phone is back.',
    },
    {
        href: '/app/integrations',
        kicker: 'Integrations',
        title: 'Accounts & HR',
        text: 'Xero, Employment Hero, GPS telematics and HR onboarding.',
    },
    {
        href: '/field',
        kicker: 'Mobile',
        title: 'Field crew',
        text: 'Job offers, digital dockets, photos, near misses and offline tickets.',
    },
]

export function Architecture() {
    return (
        <div className="diagram-grid">
            {nodes.map((node) => (
                <Link key={node.title} to={node.href} className={node.center ? 'node node-center' : 'node'}>
                    <span className="kicker">{node.kicker}</span>
                    <strong>{node.title}</strong>
                    <span>{node.text}</span>
                </Link>
            ))}
        </div>
    )
}
