import { Link } from 'react-router-dom'
import { IconKicker } from '../components/Icons.tsx'
import { CheckRow, ClientRow, IntegrationRow, RoleStories } from '../components/RoleStories.tsx'
import { useTitle } from '../components/useTitle.ts'

const STORIES = [
    {
        bot: 'Field sync bot',
        pain: 'The offer arrives after you have already left the depot.',
        fix: 'The field sync bot puts only your job on the phone. Accept or decline. The roster bot has already refused an expired ticket, a long week, and a clash.',
        figure: 'offer' as const,
    },
    {
        bot: 'Field sync bot',
        pain: 'The site has no signal and the paper docket stays in the ute.',
        fix: 'Sign the times, a photo and a near miss on the phone. The docket queues, then the close-out bot in the office reads it when the signal returns.',
        figure: 'offline' as const,
    },
    {
        bot: 'Your login',
        pain: 'A shared login shows everyone else’s pay.',
        fix: 'Joining a company opens your jobs, your tickets and your docket. Rates, the booking board and invoices stay on the office page.',
        figure: 'private' as const,
    },
]

export function Crew() {
    useTitle('For the crew · Trafficware')
    return (
        <main className="story-page">
            <section className="story-hero">
                <img src="/photos/au-phone.jpg" alt="A traffic controller in orange high-visibility clothing holds a phone and a stop-slow bat beside cones on an Australian roadside." />
                <div className="billboard-shade" />
                <div className="wrap story-hero-copy">
                    <IconKicker name="crew" className="kicker-on-dark">Page for the person</IconKicker>
                    <h1>Join a company. See only your shift.</h1>
                    <p className="lede">This is not the office. You get an offer, a docket and your own tickets. The business that employs you uses the other page to roster you and to pay the job.</p>
                    <div className="hero-actions">
                        <Link className="btn btn-amber" to="/join">Join a company</Link>
                        <Link className="btn btn-on-dark" to="/business">I run the company</Link>
                    </div>
                </div>
            </section>

            <section className="section wrap">
                <div className="section-head">
                    <IconKicker name="field">The bot on the phone</IconKicker>
                    <h2>The field sync bot is the one you touch.</h2>
                    <p className="lede">The roster bot and the close-out bot stay on the office page. You feel them as an offer that is safe to accept, and as a docket the office can pay.</p>
                </div>
                <RoleStories stories={STORIES} />
            </section>

            <section className="section wrap">
                <div className="section-head">
                    <IconKicker name="rules">Already done before you see it</IconKicker>
                    <h2>The offer is what passed the office checks.</h2>
                    <p className="lede">You do not run these. If your ticket is expired, or the week is too long, or you are already on another job, the roster bot does not send the offer.</p>
                </div>
                <CheckRow />
            </section>

            <section className="section wrap">
                <div className="section-head">
                    <IconKicker name="clients">The name on the job</IconKicker>
                    <h2>You see the client. You do not see their account.</h2>
                    <p className="lede">City of Maribyrnong on the offer is the council that booked the sample shift. The office prints the state rule on the docket. You sign the hours.</p>
                </div>
                <ClientRow />
            </section>

            <section className="section wrap">
                <div className="section-head">
                    <IconKicker name="integrations">Connected in the office, not on the phone</IconKicker>
                    <h2>These are the other systems. They are not your login.</h2>
                    <p className="lede">Xero, the payroll file, GPS and onboarding sit on the business page. Your signed docket is what the close-out bot sends them.</p>
                </div>
                <IntegrationRow />
                <p className="page-next"><Link className="btn btn-primary" to="/join">Open my jobs</Link></p>
            </section>
        </main>
    )
}
