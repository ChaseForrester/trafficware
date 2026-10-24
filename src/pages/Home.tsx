import { Link } from 'react-router-dom'
import { Architecture } from '../components/Architecture.tsx'
import { Icon, IconKicker } from '../components/Icons.tsx'
import type { IconName } from '../components/Icons.tsx'
import { Interactions } from '../components/Interactions.tsx'
import { FeaturePlays } from '../components/FeaturePlays.tsx'
import { StoryFigure } from '../components/RoleStories.tsx'
import { RosterBoard } from '../components/RosterBoard.tsx'
import { useTitle } from '../components/useTitle.ts'
import { useStore } from '../lib/store.tsx'

const RAIL: { icon: IconName; title: string; text: string }[] = [
    { icon: 'ticket', title: 'Ticket', text: 'Expired means no' },
    { icon: 'fatigue', title: 'Fatigue', text: 'Week hours count' },
    { icon: 'rest', title: 'Rest', text: 'Nights need a gap' },
    { icon: 'clash', title: 'Clash', text: 'One person, one job' },
    { icon: 'dockets', title: 'Docket', text: 'Signed on the phone' },
    { icon: 'invoice', title: 'Invoice', text: 'Clean hours only' },
]

function roleRows(slots: { role: string; personId: string | null }[], people: { id: string; name: string }[]) {
    const order: string[] = []
    const grouped = new Map<string, { open: number; names: string[] }>()
    for (const slot of slots) {
        const row = grouped.get(slot.role) ?? { open: 0, names: [] }
        if (!grouped.has(slot.role)) order.push(slot.role)
        const person = slot.personId ? people.find((item) => item.id === slot.personId) : undefined
        if (person) row.names.push(person.name)
        else row.open += 1
        grouped.set(slot.role, row)
    }
    return order.map((role) => ({ role, ...grouped.get(role)! }))
}

const BAND = [
    {
        src: '/photos/au-night.jpg',
        alt: 'Night lane closure on an Australian road, with an arrow board and crew in high-visibility clothing.',
        caption: 'Night lane closure',
        credit: 'Australian works scene',
    },
    {
        src: '/photos/au-phone.jpg',
        alt: 'A traffic controller holds a phone and a stop-slow bat beside cones on an Australian roadside.',
        caption: 'Stop-slow on the shoulder',
        credit: 'Australian works scene',
    },
    {
        src: '/photos/au-day.jpg',
        alt: 'A traffic controller stands beside queued traffic on an Australian arterial.',
        caption: 'Day shift on the arterial',
        credit: 'Australian works scene',
    },
]

export function Home() {
    useTitle('Trafficware · The yard runs itself')
    const { state, today } = useStore()
    const todayJobs = state.bookings.filter((booking) => booking.date === today)
    const openSlots = todayJobs.reduce((sum, booking) => sum + booking.slots.filter((slot) => !slot.personId).length, 0)
    const crew = state.people.filter((person) => person.status === 'active').length
    const featured = todayJobs.find((booking) => booking.id === 'b-m80') ?? todayJobs[0]
    const featuredClient = state.clients.find((client) => client.id === featured?.clientId)

    return (
        <main>
            <section className="billboard">
                <img
                    className="billboard-photo desk-only"
                    src="/photos/au-day.jpg"
                    alt="A traffic controller in orange high-visibility clothing stands beside queued traffic on an Australian road."
                />
                <img
                    className="billboard-photo phone-only"
                    src="/photos/au-night.jpg"
                    alt="Night works on an Australian road, with an arrow board, cones, and crew in high-visibility clothing."
                />
                <div className="billboard-shade" />
                <div className="billboard-grid">
                    <div className="billboard-copy">
                        <div className="desk-only">
                            <IconKicker name="board" className="kicker-on-dark">Traffic operations</IconKicker>
                            <h1>The yard runs itself.</h1>
                            <p className="lede">
                                Roster, dockets, invoices — handled. You just say yes.
                            </p>
                            <div className="hero-actions">
                                <a className="btn btn-amber" href="#roles">Choose a role</a>
                                <a className="btn btn-on-dark" href="#how">Watch the six automations</a>
                            </div>
                            <div className="billboard-stats">
                                <p><strong>{todayJobs.length}</strong><span>jobs today</span></p>
                                <p><strong>{openSlots}</strong><span>open slots</span></p>
                                <p><strong>{crew}</strong><span>active crew</span></p>
                            </div>
                        </div>
                        <div className="phone-only phone-hero">
                            <h1>The yard<br /><em>runs itself.</em></h1>
                            <p className="lede">Roster, dockets, invoices — handled. You just say yes.</p>
                            <div className="phone-actions">
                                <a className="btn phone-role" href="#roles"><Icon name="user" /> Choose a role</a>
                                <a className="btn phone-watch" href="#how"><Icon name="play" /> Watch the six automations</a>
                            </div>
                            <p className="phone-live"><Icon name="shield" /> Bookings are live. Yard rules update in real time.</p>
                        </div>
                    </div>
                    {featured ? (
                        <a className="live-card" href="#board-checks">
                            <IconKicker name="board" className="live-kicker">Live on today&apos;s board</IconKicker>
                            <h2>{featured.title}</h2>
                            <p>{featured.start}–{featured.end} · {featured.depot}</p>
                            <p className="live-client">{featuredClient?.name} · {featured.site}</p>
                            <ul>
                                {roleRows(featured.slots, state.people).map((row) => (
                                    <li key={row.role}>
                                        <span>{row.role}</span>
                                        {row.open > 0 ? (
                                            <strong className="slot-open">{row.open} open</strong>
                                        ) : (
                                            <strong>{row.names.join(', ')}</strong>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            <span className="live-go">See the bot check it</span>
                        </a>
                    ) : null}
                </div>
                <p className="photo-credit">Australian works scene.</p>
            </section>

            <section className="cap-rail" aria-label="What the board checks">
                {RAIL.map((item) => (
                    <p key={item.title}><Icon name={item.icon} /><span>{item.title}</span><strong>{item.text}</strong></p>
                ))}
            </section>
            <p className="rail-note wrap">The office page runs these checks. The crew page only receives the shift that passed.</p>

            <section className="section wrap">
                <div className="section-head">
                    <IconKicker name="product">Built for traffic control</IconKicker>
                    <h2>The same four jobs, on the live yard.</h2>
                    <p className="lede">Each one plays inside the screen that does the job. Three steps, then it repeats.</p>
                </div>
                <FeaturePlays />
            </section>

            <section className="section wrap" id="site-check">
                <div className="section-head">
                    <IconKicker name="field">On the site</IconKicker>
                    <h2>One check, while the page is open.</h2>
                    <p className="lede">
                        The office draws a circle on the job. The crew member opens the shift and taps the check.
                        The phone reads location once and the docket keeps inside or outside. After the page closes, the check stops.
                    </p>
                </div>
                <div className="hero-actions">
                    <Link to="/field" className="btn btn-primary">Open the field phone</Link>
                    <Link to="/guides" className="btn btn-ghost">Yard guides</Link>
                    <Link to="/privacy" className="btn btn-ghost">Privacy</Link>
                    <Link to="/client" className="btn btn-ghost">Client view</Link>
                </div>
            </section>

            <section className="doors" id="roles">
                <div className="wrap">
                    <div className="section-head">
                        <IconKicker name="people">Two different pages</IconKicker>
                        <h2>The business and the person do not share a screen.</h2>
                        <p className="lede">A company signs up on the office page. A traffic controller joins that company on the crew page. Each page shows the bot that does that job.</p>
                    </div>
                    <div className="door-grid">
                        <article className="door">
                            <IconKicker name="office">Super Admin · the business</IconKicker>
                            <h3>Your own company</h3>
                            <p>The desktop office. The roster bot refuses a bad name. The close-out bot turns a signed docket into an invoice.</p>
                            <StoryFigure kind="refuse" />
                            <Link to="/business" className="btn btn-primary">Open the office page</Link>
                        </article>
                        <article className="door">
                            <IconKicker name="field">Field · the person</IconKicker>
                            <h3>Join a company</h3>
                            <p>A different page. The field sync bot puts one shift on the phone. Pay rates and the booking board stay in the office.</p>
                            <StoryFigure kind="offer" />
                            <Link to="/crew" className="btn btn-amber">Open the crew page</Link>
                        </article>
                    </div>
                </div>
            </section>

            <Interactions />

            <section className="photo-band" aria-label="Traffic control at work">
                {BAND.map((shot) => (
                    <figure key={shot.src}>
                        <img src={shot.src} alt={shot.alt} />
                        <figcaption>
                            <strong>{shot.caption}</strong>
                            <span>{shot.credit}</span>
                        </figcaption>
                    </figure>
                ))}
            </section>

            <section className="look" id="board">
                <div className="wrap">
                    <div className="section-head">
                        <IconKicker name="board">Take a look</IconKicker>
                        <h2>The same board, still live.</h2>
                        <p className="lede">The automations write onto this board. Drag another name. The rules have not relaxed.</p>
                    </div>
                    <RosterBoard compact />
                </div>
            </section>

            <section className="section wrap">
                <div className="section-head">
                    <IconKicker name="cloud">One database</IconKicker>
                    <h2>Every part of the yard reads the same jobs.</h2>
                    <p className="lede">The three bots sit on the lines between the office, the board, the phone and the accounts file. Click a bot and it runs on this yard.</p>
                </div>
                <Architecture playLinks />
            </section>

            <section className="closer">
                <img src="/photos/au-night.jpg" alt="" />
                <div className="closer-shade" />
                <div className="wrap closer-copy">
                    <IconKicker name="bot" className="kicker-on-dark">Sample yard</IconKicker>
                    <h2>West, Central and Geelong are already loaded.</h2>
                    <p>Try Ben Walsh, Priya Shah or Aisha Rahman on the board. It will tell you why the name stays off the job.</p>
                    <div className="hero-actions">
                        <Link to="/business" className="btn btn-amber">The office page</Link>
                        <Link to="/crew" className="btn btn-on-dark">The crew page</Link>
                    </div>
                </div>
            </section>

            <section className="credits wrap">
                <p className="kicker">Photographs</p>
                <ul>
                    <li>The scenes on this site show Australian traffic-control work: stop-slow bats, orange high-visibility clothing, and left-hand roads. They are not photographs of Trafficware jobs or staff.</li>
                </ul>
                <p className="muted">Sample yard names are not real crew. The pictures are scenes of the work, not a Trafficware job.</p>
            </section>
        </main>
    )
}
