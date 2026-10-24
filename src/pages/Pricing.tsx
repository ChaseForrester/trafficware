import { Link } from 'react-router-dom'
import { DemoForm } from '../components/DemoForm.tsx'
import { useGrok } from '../components/GrokDock.tsx'
import { Icon, IconKicker } from '../components/Icons.tsx'
import { useTitle } from '../components/useTitle.ts'
import { AU_STATES, NATIONAL, STATE_CONDUCT } from '../lib/conduct.ts'

const plans = [
    {
        name: 'Trial',
        price: 'Free',
        note: 'Read-only demo yard',
        points: ['Look around the sample yard', 'See the booking board and dockets', 'Nothing to install, nothing to pay'],
        cta: { to: '/app', label: 'Open the demo yard' },
    },
    {
        name: 'Core',
        price: '$150–250',
        note: 'per month, indicative demo figure',
        points: ['One yard', 'Booking board', 'Roster bot', 'Field sync', 'Dockets'],
        featured: true,
        cta: { to: '/demo', label: 'Book a demo' },
    },
    {
        name: 'Pro',
        price: '$400–600',
        note: 'per month, indicative demo figure',
        points: ['Everything in Core', 'Xero', 'Payroll export', 'Close-out bot', 'Grok actions', 'MCP access'],
        cta: { to: '/demo', label: 'Book a demo' },
    },
]

const faqs = [
    {
        q: 'What is a demo figure?',
        a: 'The prices on this page are indicative ranges for the demo workspace. They show the shape of the offer. There is no live checkout, and nothing on this page charges a card.',
    },
    {
        q: 'Is my state covered?',
        a: 'The docket carries a citation block for all eight states and territories: NSW, VIC, QLD, SA, WA, TAS, ACT and NT. Each state block names the traffic management instrument for that state. The Australian Consumer Law line, enforced by the ACCC, sits on every docket.',
    },
    {
        q: 'Can I cancel?',
        a: 'There is no paid plan to cancel yet. The Trial is free and read-only, and the demo data is yours to reset. Paid terms will be set before any live checkout opens.',
    },
]

const SAMPLE_STATES = ['NSW', 'VIC', 'QLD'] as const

export function Pricing() {
    useTitle('Pricing · Trafficware')
    const grok = useGrok()
    return (
        <main className="wrap page">
            <header className="page-hero">
                <IconKicker name="rules">Every printable docket</IconKicker>
                <h1 className="display">Your docket is audit-ready in every state.</h1>
                <p className="lede">
                    Each docket cites the Australian Consumer Law line enforced by the ACCC, plus the traffic management
                    instrument for the state or territory on the job. All eight are built in.
                </p>
            </header>

            <section className="card page-gap answer-capsule" aria-label="Pricing in short">
                <h2>Pricing in short</h2>
                <p>
                    Trafficware has three plans. Trial is free and gives you a read-only demo yard. Core is $150–250 a month
                    for one yard with the booking board, roster bot, field sync and dockets. Pro is $400–600 a month and adds
                    Xero, payroll export, the close-out bot, Grok actions and MCP access. These are indicative demo figures,
                    not a live checkout. Every printable docket cites the ACCC consumer law line and the instrument for
                    NSW, VIC, QLD, SA, WA, TAS, ACT or NT.
                </p>
            </section>

            <div className="price-grid page-gap">
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
                        <Link to={plan.cta.to} className={plan.featured ? 'btn btn-primary' : 'btn btn-ghost'}>
                            {plan.cta.label}
                        </Link>
                    </article>
                ))}
            </div>
            <p className="muted">Indicative demo figures in Australian dollars. Not a live checkout.</p>

            <section className="card page-gap" aria-label="Sample docket footer">
                <IconKicker name="dockets">Sample · not a real job</IconKicker>
                <h2>What the bottom of a printed docket says</h2>
                <p className="muted">
                    This is a sample footer built from the citation text inside the app. It is not a customer docket and shows no customer result.
                </p>
                <div className="docket-sample" style={{ border: '1px dashed currentColor', borderRadius: 12, padding: '1rem', fontSize: '0.9rem' }}>
                    <p><strong>National:</strong> {NATIONAL.standard}</p>
                    <p><strong>Consumer law:</strong> Australian Consumer Law, Schedule 2 to the Competition and Consumer Act 2010 (Cth), enforced by the ACCC.</p>
                    {SAMPLE_STATES.map((id) => (
                        <p key={id}><strong>{id} · {STATE_CONDUCT[id].authority}:</strong> {STATE_CONDUCT[id].instrument}</p>
                    ))}
                    <p className="muted">One state block prints per docket, matched to the job. Shown here: three of eight.</p>
                </div>
                <details className="page-gap">
                    <summary>All eight state and territory instruments</summary>
                    <ul className="icon-list">
                        {AU_STATES.map((id) => (
                            <li key={id}><Icon name="rules" /><span><strong>{id} · {STATE_CONDUCT[id].authority}:</strong> {STATE_CONDUCT[id].instrument}</span></li>
                        ))}
                    </ul>
                </details>
                <p><Link to="/dockets/codes">State codes on the docket</Link></p>
            </section>

            <section className="card page-gap" aria-label="Questions">
                <h2>Questions people ask first</h2>
                {faqs.map((item) => (
                    <div key={item.q}>
                        <h3>{item.q}</h3>
                        <p>{item.a}</p>
                    </div>
                ))}
            </section>

            <section className="card page-gap" id="talk" aria-label="Talk to us">
                <IconKicker name="bot">Ask or leave your details</IconKicker>
                <h2>Not sure which plan fits the yard?</h2>
                <p>Ask in the chat, or leave your details below. The request is saved in this demo workspace. No email is sent.</p>
                <div className="hero-actions">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => grok.openWith('I am looking at pricing. Which plan, Trial, Core or Pro, fits a traffic company like mine?')}
                    >
                        Ask in the chat
                    </button>
                    <Link to="/app" className="btn btn-ghost">Open the demo yard</Link>
                </div>
                <DemoForm />
            </section>

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'FAQPage',
                        mainEntity: faqs.map((item) => ({
                            '@type': 'Question',
                            name: item.q,
                            acceptedAnswer: { '@type': 'Answer', text: item.a },
                        })),
                    }),
                }}
            />
        </main>
    )
}
