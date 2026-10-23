import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, IconKicker } from '../components/Icons.tsx'
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
                <IconKicker name="pricing">Pricing</IconKicker>
                <h1 className="display">Month to month, sized by the yard.</h1>
                <p className="lede">
                    These figures are for the demo workspace so you can see the shape of the offer. They are not a live checkout.
                </p>
            </header>
            <div className="price-grid">
                {plans.map((plan) => (
                    <article key={plan.name} className={plan.featured ? 'price featured' : 'price'}>
                        <IconKicker name="pricing">{plan.name}</IconKicker>
                        <p className="price-figure">{plan.price}</p>
                        <p className="muted">{plan.note}</p>
                        <ul className="icon-list">
                            {plan.points.map((point) => (
                                <li key={point}><Icon name="check" /><span>{point}</span></li>
                            ))}
                        </ul>
                        <Link to="/demo" className={plan.featured ? 'btn btn-primary' : 'btn btn-ghost'}>
                            Book a demo
                        </Link>
                    </article>
                ))}
            </div>
            <div className="card page-gap">
                <h2>What every plan includes</h2>
                <ul className="check-list icon-list">
                    <li><Icon name="people" /><span>People, skills, documents and employment status</span></li>
                    <li><Icon name="board" /><span>Drag-and-drop roster with clash, rest and fatigue checks</span></li>
                    <li><Icon name="field" /><span>Field accept / decline, digital dockets and near misses</span></li>
                    <li><Icon name="cloud" /><span>Offline outbox and a sync step you can see</span></li>
                    <li><Icon name="check" /><span>No lock-in story: the demo data is yours to reset</span></li>
                </ul>
                <Link to="/app">Skip the form and open the sample yard</Link>
            </div>
            <YardEstimate />
        </main>
    )
}

function YardEstimate() {
    const [people, setPeople] = useState(40)
    const [shifts, setShifts] = useState(30)
    const [missed, setMissed] = useState(4)
    const [cost, setCost] = useState(450)
    const missedMonth = Math.max(0, shifts) * 4 * (Math.max(0, missed) / 100)
    const dollars = missedMonth * Math.max(0, cost)
    const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(dollars)

    return (
        <section className="card page-gap">
            <IconKicker name="pricing">Estimate</IconKicker>
            <h2>What an empty shift costs this yard</h2>
            <p>
                Type your own figures. This is an estimate for the conversation next to the demo prices. It is not a measured result from a Trafficware customer.
            </p>
            <div className="roi-grid">
                <label className="field">
                    People in the yard
                    <input type="number" min="1" value={people} onChange={(event) => setPeople(Number(event.target.value))} />
                </label>
                <label className="field">
                    Shifts in a week
                    <input type="number" min="0" value={shifts} onChange={(event) => setShifts(Number(event.target.value))} />
                </label>
                <label className="field">
                    Shifts that fall over, percent
                    <input type="number" min="0" max="100" value={missed} onChange={(event) => setMissed(Number(event.target.value))} />
                </label>
                <label className="field">
                    Cost of one empty shift, dollars
                    <input type="number" min="0" value={cost} onChange={(event) => setCost(Number(event.target.value))} />
                </label>
            </div>
            <p>
                At these figures, about {missedMonth.toFixed(1)} shifts a month go unfilled, which is about {money} before anyone is replaced.
                A yard of {Math.max(0, people)} people sits nearest the {people <= 25 ? 'Crew plan at $490' : people <= 80 ? 'Depot plan at $990' : 'Network plan at $1,890'} on this page.
            </p>
            <p className="muted">The plan figures are demo pricing. They are not a checkout.</p>
        </section>
    )
}
