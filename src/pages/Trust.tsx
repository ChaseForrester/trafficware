import { Link } from 'react-router-dom'
import { IconKicker } from '../components/Icons.tsx'
import { useTitle } from '../components/useTitle.ts'
import { AU_STATES, conductFor } from '../lib/conduct.ts'
import { prettyDate } from '../lib/format.ts'
import { findClient, statusFor } from '../lib/rules.ts'
import { useStore } from '../lib/store.tsx'

const STATUS_LABEL = {
    planning: 'Open',
    offered: 'Offered',
    confirmed: 'Confirmed',
    submitted: 'Dockets in',
    approved: 'Approved',
    invoiced: 'Invoiced',
} as const

export function Privacy() {
    useTitle('Privacy · Trafficware')
    return (
        <main className="wrap page">
            <header className="page-hero">
                <IconKicker name="rules">Privacy</IconKicker>
                <h1 className="display">Location is for the shift in front of you.</h1>
                <p className="lede">
                    The field phone can read a location when a crew member asks it to, compare that point with the circle on the job, and keep the result with the docket.
                </p>
            </header>
            <article className="card">
                <h2>Purpose</h2>
                <p>The check is for site verification, timesheet accuracy and safety. It answers whether the person who signed was inside the boundary the office drew for that job.</p>
            </article>
            <article className="card page-gap">
                <h2>When it runs</h2>
                <p>The reading happens after the crew member allows location, and again only when they tap “Check I'm on site”, or when they open a docket after that allowance. The page has to be open. Closing it stops the check. This web app does not request background location, and a service worker cannot read the Geolocation API.</p>
                <p>An obvious line on the phone says when a reading is in progress. “Turn location off” clears the allowance stored on that device.</p>
            </article>
            <article className="card page-gap">
                <h2>What is kept</h2>
                <p>Each check stores the time, the point, the accuracy, the distance from the pin, and inside or outside. The job keeps the latest 12 checks. Signing a docket copies the latest check for that person onto the docket: inside or outside, distance, accuracy and time. Older checks drop off the job. The copy on the docket stays with the docket.</p>
                <p>A reading outside the fence flags the docket. It does not block the signature, because a desk demo and a rough GPS fix still need a way to file the hours. The office sees the flag.</p>
            </article>
            <article className="card page-gap">
                <h2>Where the yard lives</h2>
                <p>
                    Until you open the shared yard, the sample week stays in this browser under the local storage key <code>trafficware.v1</code>.
                    The shared yard is Firestore project trafficware-yard. The Integrations page records that project as Sydney, on the Blaze plan, and the access code is the lock.
                </p>
                <p>The allowance to use location is a separate key on this device, <code>trafficware.location-consent</code>. It is not the yard database.</p>
            </article>
            <article className="card page-gap">
                <h2>This demo</h2>
                <p>
                    Sample yard names are not a customer list. Trafficware does not put an organisation on the site without that organisation’s logo.
                    A company ABN is typed by that company when it starts a workspace, and it prints on that company’s dockets. This page does not invent a registered office.
                </p>
                <p>Questions about the demo go through <Link to="/demo">Book a demo</Link>.</p>
            </article>
        </main>
    )
}

export function Guides() {
    useTitle('Guides · Trafficware')
    const { state } = useStore()
    const { maxWeekHours, minRestHours, homeState } = state.settings
    const conduct = conductFor(homeState)

    return (
        <main className="wrap page">
            <header className="page-hero">
                <IconKicker name="product">Guides</IconKicker>
                <h1 className="display">How this yard decides.</h1>
                <p className="lede">
                    The hour limits below are the company settings on this sample yard. They are the numbers the board enforces. They are not a quote from a statute.
                </p>
            </header>
            <article className="card" id="week">
                <h2>A {maxWeekHours}-hour week</h2>
                <p>
                    Fatigue counts rostered start to finish, before meal breaks, across the seven days up to the shift.
                    A person already at the limit stays off the next job. The sample yard is set to {maxWeekHours} hours. Office settings can raise or lower it, and the board uses the new number immediately.
                </p>
            </article>
            <article className="card page-gap" id="rest">
                <h2>Rest after a night</h2>
                <p>
                    The sample yard wants {minRestHours} hours between the end of one shift and the start of the next.
                    A night that finishes at 05:00 and a day shift that starts at 07:00 fails that gap, and the name stays off the second job.
                </p>
            </article>
            <article className="card page-gap" id="states">
                <h2>State paperwork</h2>
                <p>
                    This yard is set to {conduct.name}. Dockets use {conduct.instrument} The hour checks do not change when you change state.
                    Ticket names on the board are the role the slot asks for: Traffic Controller, TMA Operator, Team Leader.
                </p>
                <ul className="feed">
                    {AU_STATES.map((id) => (
                        <li key={id}><span><strong>{conductFor(id).name}</strong><small>{conductFor(id).authority}</small></span></li>
                    ))}
                </ul>
                <p><Link to="/app/board">Change the state on the board</Link> · <Link to="/dockets/codes">Read the state codes</Link></p>
            </article>
            <article className="card page-gap" id="dockets">
                <h2>Dockets</h2>
                <p>
                    The crew member types their name to sign. A near miss can ride with the docket, and the file name of a photo is kept beside it.
                    The office approves, queries, or rolls the hours into payroll and an invoice. State wording on the printed sheet follows the state selected on the docket desk.
                </p>
            </article>
            <article className="card page-gap" id="site">
                <h2>The site check</h2>
                <p>
                    Each sample job has a circle about 250 metres across a public place near the site address. Edit job on the board moves the pin or the radius.
                    On the phone, the crew member allows location and taps the check. The browser returns one point. The page compares it with the circle and stores inside or outside.
                    Outside flags the docket and still lets the signature through.
                </p>
                <p><Link to="/field">Open the field phone</Link> · <Link to="/privacy">What is stored</Link></p>
            </article>
            <article className="card page-gap" id="confirm">
                <h2>Accept and decline</h2>
                <p>
                    A shift offer sits on the phone until the crew member accepts or declines. That response is stored on the slot, and the office sees it on the board.
                    The trail is the response, the time it was written, and the docket that follows. SMS and voice confirmation are not in this build.
                </p>
            </article>
            <article className="card page-gap" id="offline">
                <h2>No signal</h2>
                <p>
                    Go offline on the field page. A signed docket and a near miss wait in the outbox on the phone and go up when Field Sync runs.
                    Tickets already stored on the person stay readable. A site check needs a location from the phone, so it waits until the browser can read one. The outbox itself does not need a signal to hold the docket.
                </p>
            </article>
        </main>
    )
}

export function Compare() {
    useTitle('Compare · Trafficware')
    const { maxWeekHours, minRestHours } = useStore().state.settings
    return (
        <main className="wrap page">
            <header className="page-hero">
                <IconKicker name="product">Compare</IconKicker>
                <h1 className="display">What Trafficware checks.</h1>
                <p className="lede">
                    Traffic companies also look at Traffio, Assignar and CrewCard. Those companies publish their own lists.
                    This page describes the checks in this yard.
                </p>
            </header>
            <article className="card">
                <h2>Before the name lands</h2>
                <ul className="feed">
                    <li><span><strong>Ticket</strong><small>The slot asks for a role. An expired ticket for that role keeps the name off.</small></span></li>
                    <li><span><strong>Week hours</strong><small>The yard’s weekly limit, {maxWeekHours} hours on this sample, counts rostered start to finish.</small></span></li>
                    <li><span><strong>Rest</strong><small>The yard’s gap after a shift, {minRestHours} hours on this sample, blocks a start that comes too soon.</small></span></li>
                    <li><span><strong>Clash</strong><small>One person, one job at the same time.</small></span></li>
                    <li><span><strong>Onboarding</strong><small>A starter with open checks stays off the board.</small></span></li>
                    <li><span><strong>Vehicle</strong><small>A truck in the workshop, or with a rego or service problem, stays off the job.</small></span></li>
                </ul>
            </article>
            <article className="card page-gap">
                <h2>On the phone and at close-out</h2>
                <p>The crew page is a different screen. It shows that person’s offers, tickets, docket and site check. Pay rates, the full board and invoices stay in the office.</p>
                <p>Accept and decline are the confirmation on the slot. Approved hours leave as a payroll file, and the invoice can leave as a Xero draft when that connection is on.</p>
                <p>The site check is evidence on the docket. It is a circle on the job and one reading while the page is open.</p>
            </article>
            <article className="card page-gap">
                <h2>Ask the other vendor for their list</h2>
                <p>
                    Traffio, Assignar and CrewCard each sell into this industry. Trafficware does not keep a scoreboard of their features, because that list would go stale the week it was written.
                    Use this page to see the refusal rules, the separated crew page, and the docket that becomes the payroll line. Then ask each vendor what they do today.
                </p>
                <p><Link to="/app/board">Watch a name get refused</Link> · <Link to="/pricing">Demo pricing</Link></p>
            </article>
        </main>
    )
}

export function ClientView() {
    useTitle('Client view · Trafficware')
    const { state } = useStore()
    const jobs = [...state.bookings].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))

    return (
        <main className="wrap page">
            <header className="page-hero">
                <IconKicker name="office">Client view</IconKicker>
                <h1 className="display">Job status for the sample yard.</h1>
                <p className="lede">
                    Read only. Rates, phone numbers and invoices stay off this page. A company workspace would show the client who signed in. This demo lists every sample job on this device.
                </p>
            </header>
            <div className="stack">
                {jobs.map((booking) => {
                    const client = findClient(state, booking.clientId)
                    const status = statusFor(state, booking)
                    const signed = [...state.dockets, ...state.outbox].filter((docket) => docket.bookingId === booking.id && docket.signedBy)
                    const check = booking.siteChecks[0]
                    return (
                        <article key={booking.id} className="card">
                            <p className="kicker">{prettyDate(booking.date)} · {client?.name}</p>
                            <h2>{booking.title}</h2>
                            <p>{booking.site}</p>
                            <p className="tag">{STATUS_LABEL[status]} · {signed.length} signed {signed.length === 1 ? 'docket' : 'dockets'}</p>
                            <p className="muted">
                                {check
                                    ? `Latest site check ${check.inside ? 'inside' : 'outside'} the fence.`
                                    : 'No site check yet.'}
                            </p>
                        </article>
                    )
                })}
            </div>
        </main>
    )
}
