import { Link } from 'react-router-dom'
import { useTitle } from '../components/useTitle.ts'

const plans = [
    {
        name: 'Crew',
        price: '$490',
        note: 'per month, one depot',
        points: ['Up to 25 people', 'Booking board and field app', 'Ticket and fatigue checks', 'Dockets and CSV export'],
    },
    {
        name: 'Depot',
        price: '$990',
        note: 'per month, the working yard',
        points: ['Up to 80 people', 'Roster bot and close-out bot', 'Payroll rates and invoices', 'Xero and Employment Hero files'],
        featured: true,
    },
    {
        name: 'Network',
        price: '$1,890',
        note: 'per month, multi-depot',
        points: ['Unlimited depots in the workspace', 'GPS telematics and HR onboarding', 'Field sync across crews', 'Shared clients and fleet'],
    },
]

export function Pricing() {
    useTitle('Pricing · Trafficware')
    return (
        <main className="wrap page">
            <header className="page-hero">
                <p className="kicker">Pricing</p>
                <h1 className="display">Month to month, sized by the yard.</h1>
                <p className="lede">
                    These figures are for the demo workspace so you can see the shape of the offer. They are not a live checkout.
                </p>
            </header>
            <div className="price-grid">
                {plans.map((plan) => (
                    <article key={plan.name} className={plan.featured ? 'price featured' : 'price'}>
                        <p className="kicker">{plan.name}</p>
                        <p className="price-figure">{plan.price}</p>
                        <p className="muted">{plan.note}</p>
                        <ul>
                            {plan.points.map((point) => (
                                <li key={point}>{point}</li>
                            ))}
                        </ul>
                        <Link to="/demo" className={plan.featured ? 'btn btn-amber' : 'btn btn-ghost'}>
                            Book a demo
                        </Link>
                    </article>
                ))}
            </div>
            <div className="card page-gap">
                <h2>What every plan includes</h2>
                <ul className="check-list">
                    <li>People, skills, documents and employment status</li>
                    <li>Drag-and-drop roster with clash, rest and fatigue checks</li>
                    <li>Field accept / decline, digital dockets and near misses</li>
                    <li>Offline outbox and a sync step you can see</li>
                    <li>No lock-in story: the demo data is yours to reset</li>
                </ul>
                <Link to="/app">Skip the form and open the sample yard</Link>
            </div>
        </main>
    )
}
