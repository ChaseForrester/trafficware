import { Link } from 'react-router-dom'
import { useTitle } from '../components/useTitle.ts'

const features = [
    {
        href: '/app/board',
        kicker: 'Booking and scheduling',
        title: 'A board the whole yard can read.',
        text: 'Day by day, depot by depot. Slots know which ticket they need. Offers wait for the crew to accept.',
    },
    {
        href: '/app/people',
        kicker: 'People',
        title: 'Profiles, documents and pay rates.',
        text: 'Employment status, leave, tickets and ordinary, night and weekend rates live on each person.',
    },
    {
        href: '/app/fleet',
        kicker: 'Fleet and equipment',
        title: 'The truck is part of the booking.',
        text: 'Rego, service and workshop status gate the vehicle list. Gear quantities show against today\'s jobs.',
    },
    {
        href: '/field',
        kicker: 'Field app',
        title: 'Accept, docket, photograph.',
        text: 'Crew work from the phone: job offers, signed dockets, near misses and tickets stored for offline use.',
    },
    {
        href: '/app/closeout',
        kicker: 'Payroll and invoicing',
        title: 'Hours become money once.',
        text: 'Approved dockets price at the right loading, then roll into a client invoice with the wage cost beside it.',
    },
    {
        href: '/app/integrations',
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
                <p className="kicker">Product</p>
                <h1 className="display">Everything the shift touches, in one workspace.</h1>
                <p className="lede">
                    Trafficware is built for traffic companies that book people, vehicles and equipment onto the same job,
                    then need the docket to survive contact with payroll.
                </p>
            </header>
            <div className="grid-2">
                {features.map((feature) => (
                    <article key={feature.title} className="card">
                        <p className="kicker">{feature.kicker}</p>
                        <h2>{feature.title}</h2>
                        <p>{feature.text}</p>
                        <Link to={feature.href}>Open it</Link>
                    </article>
                ))}
            </div>
        </main>
    )
}
