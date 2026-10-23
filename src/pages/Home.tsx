import { Link } from 'react-router-dom'
import { Architecture } from '../components/Architecture.tsx'
import { Interactions } from '../components/Interactions.tsx'
import { StoryFigure } from '../components/RoleStories.tsx'
import { RosterBoard } from '../components/RosterBoard.tsx'
import { useTitle } from '../components/useTitle.ts'
import { useStore } from '../lib/store.tsx'

const RAIL = [
    ['Ticket', 'Expired means no'],
    ['Fatigue', 'Week hours count'],
    ['Rest', 'Nights need a gap'],
    ['Clash', 'One person, one job'],
    ['Docket', 'Signed on the phone'],
    ['Invoice', 'Clean hours only'],
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
    useTitle('Trafficware · Put the right crew on the right job')
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
                    className="billboard-photo"
                    src="/photos/au-day.jpg"
                    alt="A traffic controller in orange high-visibility clothing stands beside queued traffic on an Australian road."
                />
                <div className="billboard-shade" />
                <div className="billboard-grid">
                    <div className="billboard-copy">
                        <p className="kicker kicker-on-dark">Traffic operations</p>
                        <h1>Put the right crew on the right job.</h1>
                        <p className="lede">
                            Trafficware is the booking board for traffic companies. Open a shift, drop a name,
                            and the yard rules answer before anyone leaves the depot.
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
                    {featured ? (
                        <a className="live-card" href="#board-checks">
                            <p className="kicker live-kicker">Live on today&apos;s board</p>
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
                {RAIL.map(([title, text]) => (
                    <p key={title}><span>{title}</span><strong>{text}</strong></p>
                ))}
            </section>
            <p className="rail-note wrap">The office page runs these checks. The crew page only receives the shift that passed.</p>

            <section className="doors" id="roles">
                <div className="wrap">
                    <div className="section-head">
                        <p className="kicker">Two different pages</p>
                        <h2>The business and the person do not share a screen.</h2>
                        <p className="lede">A company signs up on the office page. A traffic controller joins that company on the crew page. Each page shows the bot that does that job.</p>
                    </div>
                    <div className="door-grid">
                        <article className="door">
                            <p className="kicker">Super Admin · the business</p>
                            <h3>Your own company</h3>
                            <p>The desktop office. The roster bot refuses a bad name. The close-out bot turns a signed docket into an invoice.</p>
                            <StoryFigure kind="refuse" />
                            <Link to="/business" className="btn btn-primary">Open the office page</Link>
                        </article>
                        <article className="door">
                            <p className="kicker">Field · the person</p>
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
                        <p className="kicker">Take a look</p>
                        <h2>The same board, still live.</h2>
                        <p className="lede">The automations write onto this board. Drag another name. The rules have not relaxed.</p>
                    </div>
                    <RosterBoard compact />
                </div>
            </section>

            <section className="section wrap">
                <div className="section-head">
                    <p className="kicker">One database</p>
                    <h2>Every part of the yard reads the same jobs.</h2>
                    <p className="lede">The three bots sit on the lines between the office, the board, the phone and the accounts file. Click a bot and it runs on this yard.</p>
                </div>
                <Architecture playLinks />
            </section>

            <section className="closer">
                <img src="/photos/au-night.jpg" alt="" />
                <div className="closer-shade" />
                <div className="wrap closer-copy">
                    <p className="kicker kicker-on-dark">Sample yard</p>
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
