import { Link } from 'react-router-dom'
import { IconKicker } from '../components/Icons.tsx'
import { AuthorityRow, CheckRow, ClientRow, IntegrationRow, RoleStories } from '../components/RoleStories.tsx'
import { useTitle } from '../components/useTitle.ts'

const STORIES = [
    {
        bot: 'Roster bot',
        pain: 'An expired ticket still ends up on the job.',
        fix: 'Drop the name on the board. The roster bot turns that slot red and offers someone whose ticket is current for the role.',
        figure: 'refuse' as const,
    },
    {
        bot: 'Roster bot',
        pain: 'The week is already long, or the person is on two jobs.',
        fix: 'Fatigue and a clash show before the offer goes out. The field phone never sees the name the bot refused.',
        figure: 'fatigue' as const,
    },
    {
        bot: 'Close-out bot',
        pain: 'The morning after, the hours are still in a notebook.',
        fix: 'Signed dockets come back from the phones. The close-out bot prices them here, then prepares the Xero invoice for the council or the civil client.',
        figure: 'closeout' as const,
    },
]

export function Business() {
    useTitle('For the office · Trafficware')
    return (
        <main className="story-page">
            <section className="story-hero">
                <img src="/photos/au-night.jpg" alt="Night lane closure on an Australian road, with an arrow board, cones and crew in high-visibility clothing." />
                <div className="billboard-shade" />
                <div className="wrap story-hero-copy">
                    <IconKicker name="office" className="kicker-on-dark">Page for the business</IconKicker>
                    <h1>Run the company from the office.</h1>
                    <p className="lede">This is the Super Admin page. The person on the tools has a different page and never sees this one. You hold the board, the rates, the dockets and the invoice.</p>
                    <div className="hero-actions">
                        <Link className="btn btn-amber" to="/start">Start your company</Link>
                        <Link className="btn btn-on-dark" to="/crew">I work on the tools</Link>
                    </div>
                </div>
            </section>

            <section className="section wrap">
                <div className="section-head">
                    <IconKicker name="bot">Three bots, one yard</IconKicker>
                    <h2>The office runs two of them. The phone runs the third.</h2>
                    <p className="lede">The roster bot fills the board. The field sync bot only delivers a shift that already passed. The close-out bot turns the signed docket into pay lines and a client invoice.</p>
                </div>
                <RoleStories stories={STORIES} />
            </section>

            <section className="section wrap">
                <div className="section-head">
                    <IconKicker name="rules">What the roster bot checks</IconKicker>
                    <h2>Six reasons a name stays off the job.</h2>
                    <p className="lede">These are the same checks as the strip under the homepage, written out. The crew page does not show this desk. An offer arrives only after the checks have passed.</p>
                </div>
                <CheckRow />
            </section>

            <section className="section wrap">
                <div className="section-head">
                    <IconKicker name="clients">Councils and clients</IconKicker>
                    <h2>The job names the client. The docket names the state rule.</h2>
                    <p className="lede">City of Maribyrnong is a sample council on the Geelong job, not a login. The printable docket cites the instrument for the state the work was in. The sheet is not a copy of the manual.</p>
                </div>
                <ClientRow />
                <AuthorityRow />
            </section>

            <section className="section wrap">
                <div className="section-head">
                    <IconKicker name="integrations">Same names as the office screen</IconKicker>
                    <h2>Integrations the desk already recognises.</h2>
                    <p className="lede">Open them later under Integrations. The marks here are ours, so the name is familiar without borrowing another company’s logo. Field phones do not get these switches.</p>
                </div>
                <IntegrationRow />
                <p className="page-next"><Link className="btn btn-primary" to="/start">Open the office</Link></p>
            </section>
        </main>
    )
}
