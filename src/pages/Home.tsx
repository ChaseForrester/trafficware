import { Link } from 'react-router-dom'
import { Architecture } from '../components/Architecture.tsx'
import { Guide } from '../components/Guide.tsx'
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

const BAND = [
    {
        src: '/photos/night-auckland.jpg',
        alt: 'Night roadworks on Nelson Street, Auckland, with lights over the closed lane. Photograph by Ingolfson.',
        caption: 'Night lane closure',
        credit: 'Ingolfson, public domain',
    },
    {
        src: '/photos/flagger-slow.jpg',
        alt: 'A traffic controller holds a slow paddle beside live traffic. Photograph by the Oregon Department of Transportation.',
        caption: 'Stop-slow on the shoulder',
        credit: 'Oregon DOT, CC BY 2.0',
    },
    {
        src: '/photos/night-resurface.jpg',
        alt: 'Crew and trucks resurfacing a road at night behind a closure. Photograph by OathOn.',
        caption: 'Resurfacing after dark',
        credit: 'OathOn, CC BY-SA 4.0',
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
                    src="/photos/flagger-stop.jpg"
                    alt="A traffic controller holds a stop paddle at a highway work zone. Photograph by the Oregon Department of Transportation."
                />
                <div className="billboard-shade" />
                <div className="billboard-grid">
                    <div className="billboard-copy">
                        <p className="kicker kicker-on-dark">Traffic operations</p>
                        <h1>Put the right crew on the <span className="mark">right job.</span></h1>
                        <p className="lede">
                            Trafficware is the booking board for traffic companies. Open a shift, drop a name,
                            and the yard rules answer before anyone leaves the depot.
                        </p>
                        <div className="hero-actions">
                            <a className="btn btn-amber" href="#how">Walk the six steps</a>
                            <Link className="btn btn-on-dark" to="/app/board">Open the board</Link>
                        </div>
                        <div className="billboard-stats">
                            <p><strong>{todayJobs.length}</strong><span>jobs today</span></p>
                            <p><strong>{openSlots}</strong><span>open slots</span></p>
                            <p><strong>{crew}</strong><span>active crew</span></p>
                        </div>
                    </div>
                    {featured ? (
                        <a className="live-card" href="#how">
                            <p className="kicker">Live on today&apos;s board</p>
                            <h2>{featured.title}</h2>
                            <p>{featured.start}–{featured.end} · {featured.depot}</p>
                            <p className="muted">{featuredClient?.name} · {featured.site}</p>
                            <ul>
                                {featured.slots.map((slot) => {
                                    const person = state.people.find((item) => item.id === slot.personId)
                                    return (
                                        <li key={slot.id}>
                                            <span>{slot.role}</span>
                                            <strong>{person ? person.name : 'Open'}</strong>
                                        </li>
                                    )
                                })}
                            </ul>
                            <span className="live-go">Run this shift</span>
                        </a>
                    ) : null}
                </div>
                <p className="photo-credit">Photograph by the Oregon Department of Transportation, CC BY 2.0.</p>
            </section>

            <section className="cap-rail" aria-label="What the board checks">
                {RAIL.map(([title, text]) => (
                    <p key={title}><span>{title}</span><strong>{text}</strong></p>
                ))}
            </section>

            <Guide />

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
                        <p className="lede">What the six steps wrote is already here. Drag another name. The rules have not relaxed.</p>
                    </div>
                    <RosterBoard compact />
                </div>
            </section>

            <section className="section wrap">
                <div className="section-head">
                    <p className="kicker">One database</p>
                    <h2>Every part of the yard reads the same jobs.</h2>
                    <p className="lede">Click any part of the platform. It opens the working screen.</p>
                </div>
                <Architecture />
            </section>

            <section className="closer">
                <img src="/photos/night-auckland.jpg" alt="" />
                <div className="closer-shade" />
                <div className="wrap closer-copy">
                    <p className="kicker kicker-on-dark">Sample yard</p>
                    <h2>West, Central and Geelong are already loaded.</h2>
                    <p>Try Ben Walsh, Priya Shah or Aisha Rahman on the board. It will tell you why the name stays off the job.</p>
                    <div className="hero-actions">
                        <Link to="/app" className="btn btn-amber">Enter the platform</Link>
                        <Link to="/demo" className="btn btn-on-dark">Book a demo</Link>
                    </div>
                </div>
            </section>

            <section className="credits wrap">
                <p className="kicker">Photographs</p>
                <ul>
                    <li>Oregon Department of Transportation. Flagger photographs. <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>, via Wikimedia Commons.</li>
                    <li>Ingolfson. Night roadworks, Nelson Street, and roadworks at Princes Street, Auckland. Public domain, via Wikimedia Commons.</li>
                    <li>OathOn. Night-time road resurfacing, Chatham. <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>, via Wikimedia Commons.</li>
                    <li>Sgroey. Road worker in Hokkaido. <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>, via Wikimedia Commons.</li>
                </ul>
                <p className="muted">These are working traffic controllers and road crews. They are not Trafficware staff, and the sample yard names are not theirs.</p>
            </section>
        </main>
    )
}
