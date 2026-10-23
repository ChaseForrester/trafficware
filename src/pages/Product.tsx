import { Link } from 'react-router-dom'
import { IconKicker } from '../components/Icons.tsx'
import type { IconName } from '../components/Icons.tsx'
import { useTitle } from '../components/useTitle.ts'

const features: { href: string; icon: IconName; kicker: string; title: string; text: string }[] = [
    {
        href: '/app/board',
        icon: 'board',
        kicker: 'Booking and scheduling',
        title: 'A board the whole yard can read.',
        text: 'Day by day, depot by depot. Slots know which ticket they need. Offers wait for the crew to accept.',
    },
    {
        href: '/app/people',
        icon: 'people',
        kicker: 'People',
        title: 'Profiles, documents and pay rates.',
        text: 'Employment status, leave, tickets and ordinary, night and weekend rates live on each person.',
    },
    {
        href: '/app/fleet',
        icon: 'fleet',
        kicker: 'Fleet and equipment',
        title: 'The truck is part of the booking.',
        text: 'Rego, service and workshop status gate the vehicle list. Gear quantities show against today\'s jobs.',
    },
    {
        href: '/field',
        icon: 'field',
        kicker: 'Field app',
        title: 'Accept, docket, photograph.',
        text: 'Crew work from the phone: job offers, a one-tap site check while the page is open, signed dockets, near misses and tickets stored for offline use.',
    },
    {
        href: '/guides#site',
        icon: 'field',
        kicker: 'Site check',
        title: 'Inside the fence, on the docket.',
        text: 'The office saves a circle on the job. The phone compares one location reading with that circle and records inside or outside. The page has to stay open. There is no background track.',
    },
    {
        href: '/client',
        icon: 'office',
        kicker: 'Client view',
        title: 'The client sees status, not rates.',
        text: 'A read-only list of the job, the day, signed dockets and the site check. Pay rates and phone numbers stay on the office side.',
    },
    {
        href: '/app/closeout',
        icon: 'closeout',
        kicker: 'Payroll and invoicing',
        title: 'Hours become money once.',
        text: 'Approved dockets price at the right loading, then roll into a client invoice with the wage cost beside it.',
    },
    {
        href: '/app/integrations',
        icon: 'integrations',
        kicker: 'Integrations',
        title: 'Hand the file to the next system.',
        text: 'Xero, Employment Hero, GPS and HR onboarding. The demo connection is real on this device, and the CSV is a real file.',
    },
]

export function Product() {
    useTitle('Product · Trafficware')
    return (
        <main className="wrap page">
            <header className="page-hero">
                <IconKicker name="product">Product</IconKicker>
                <h1 className="display">Everything the shift touches, in one workspace.</h1>
                <p className="lede">
                    Trafficware is built for traffic companies that book people, vehicles and equipment onto the same job,
                    then need the docket to survive contact with payroll.
                </p>
                <p className="lede">
                    <Link to="/guides">Guides</Link> cover the week-hour limit, the night rest gap and the field phone. <Link to="/compare">Compare</Link> says what this yard checks. <Link to="/privacy">Privacy</Link> covers the site check.
                </p>
            </header>
            <div className="grid-2">
                {features.map((feature) => (
                    <article key={feature.title} className="card">
                        <IconKicker name={feature.icon}>{feature.kicker}</IconKicker>
                        <h2>{feature.title}</h2>
                        <p>{feature.text}</p>
                        <Link to={feature.href}>Open it</Link>
                    </article>
                ))}
            </div>
        </main>
    )
}
