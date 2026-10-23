import { Link } from 'react-router-dom'
import { BotMark } from './BotMark.tsx'
import type { BotId } from './botPlays.ts'
import { IntegrationMark } from './Marks.tsx'

type FigureKind = 'refuse' | 'fatigue' | 'closeout' | 'offer' | 'offline' | 'private'

export type RoleStory = {
    bot: string
    pain: string
    fix: string
    figure: FigureKind
}

type Row = {
    who: string
    detail: string
    state: string
    tone: 'bad' | 'good'
}

export function RoleStories({ stories }: { stories: RoleStory[] }) {
    return (
        <div className="story-grid">
            {stories.map((story) => {
                const bot = botFor(story.bot)
                const href = PLAY_FOR[story.figure]
                return (
                    <article key={story.pain} className="story-card">
                        <StoryFigure kind={story.figure} />
                        <div className="story-bot">
                            {bot ? <BotMark bot={bot.id} size={44} /> : null}
                            <p className="kicker">{story.bot}</p>
                        </div>
                        <h3>{story.pain}</h3>
                        <p>{story.fix}</p>
                        {href ? <Link to={href}>Watch this bot</Link> : null}
                    </article>
                )
            })}
        </div>
    )
}

export function StoryFigure({ kind }: { kind: FigureKind }) {
    if (kind === 'refuse') {
        return (
            <FigureFrame
                label="Roster bot · booking board"
                rows={[
                    { who: 'Ben Walsh', detail: 'Traffic controller · ticket expired', state: 'Blocked', tone: 'bad' },
                    { who: 'Maya Chen', detail: 'Traffic controller · ticket current', state: 'Offered', tone: 'good' },
                ]}
            />
        )
    }
    if (kind === 'fatigue') {
        return (
            <FigureFrame
                label="Roster bot · hours"
                rows={[
                    { who: 'Priya Shah', detail: '52 hours this week · close to the 60 hour cap', state: 'Amber', tone: 'bad' },
                    { who: 'Same person', detail: 'Already on Geelong 06:00–14:00', state: 'Clash', tone: 'bad' },
                    { who: 'Aisha Rahman', detail: '31 hours · no other job today', state: 'Offered', tone: 'good' },
                ]}
            />
        )
    }
    if (kind === 'closeout') {
        return (
            <FigureFrame
                label="Close-out bot"
                rows={[
                    { who: 'Notebook', detail: 'Hours still on paper the next morning', state: 'Missing', tone: 'bad' },
                    { who: 'Docket', detail: 'Geelong · 06:00–14:00 · signed on the phone', state: 'Signed', tone: 'good' },
                    { who: 'Xero file', detail: 'City of Maribyrnong · priced in Trafficware', state: 'Ready', tone: 'good' },
                ]}
            />
        )
    }
    if (kind === 'offer') {
        return (
            <div className="fig fig-phone">
                <p className="fig-label">Field sync bot · your phone</p>
                <div className="fig-phone-card">
                    <p className="fig-client">City of Maribyrnong</p>
                    <p className="fig-job">Geelong line marking</p>
                    <p className="fig-when">06:00–14:00 · Traffic controller</p>
                    <div className="fig-actions">
                        <span>Decline</span>
                        <span className="fig-yes">Accept</span>
                    </div>
                </div>
            </div>
        )
    }
    if (kind === 'offline') {
        return (
            <FigureFrame
                label="Field sync bot · on site"
                rows={[
                    { who: 'Signal', detail: 'The shoulder often has none', state: 'None', tone: 'bad' },
                    { who: 'Docket', detail: 'Times, photo and near miss stay on the phone', state: 'Queued', tone: 'good' },
                    { who: 'Office', detail: 'Close-out bot reads it when the signal returns', state: 'Sent', tone: 'good' },
                ]}
            />
        )
    }
    return (
        <FigureFrame
            label="Your login"
            rows={[
                { who: 'Pay rates', detail: 'Other people’s money', state: 'Hidden', tone: 'bad' },
                { who: 'Booking board', detail: 'The rest of the yard', state: 'Hidden', tone: 'bad' },
                { who: 'My shift', detail: 'This job, my tickets, my docket', state: 'Shown', tone: 'good' },
            ]}
        />
    )
}

const PLAY_FOR: Record<FigureKind, string | null> = {
    refuse: '/#roster-alerts',
    fatigue: '/#board-checks',
    closeout: '/#closeout',
    offer: '/#field-push',
    offline: '/#field-docket',
    private: null,
}

function botFor(label: string): { id: BotId } | null {
    const name = label.toLowerCase()
    if (name.includes('roster')) return { id: 'roster' }
    if (name.includes('close')) return { id: 'closeout' }
    if (name.includes('field')) return { id: 'field' }
    return null
}

function FigureFrame({ label, rows }: { label: string; rows: Row[] }) {
    return (
        <div className="fig">
            <p className="fig-label">{label}</p>
            {rows.map((row) => (
                <div key={row.who + row.state} className={`fig-row fig-${row.tone}`}>
                    <span>
                        <b>{row.who}</b>
                        <em>{row.detail}</em>
                    </span>
                    <strong>{row.state}</strong>
                </div>
            ))}
        </div>
    )
}

export const CHECKS = [
    ['Ticket', 'An expired ticket never gets an offer.'],
    ['Fatigue', 'The week’s hours are checked before the call.'],
    ['Rest', 'A night needs a gap before the next start.'],
    ['Clash', 'One person, one job, at the same time.'],
    ['Docket', 'Hours are signed on the phone, then approved in the office.'],
    ['Invoice', 'Only those clean hours go to the client.'],
] as const

export function CheckRow() {
    return (
        <ul className="check-row">
            {CHECKS.map(([title, text]) => (
                <li key={title}>
                    <strong>{title}</strong>
                    <span>{text}</span>
                </li>
            ))}
        </ul>
    )
}

export const AUTHORITIES = [
    ['NSW', 'Transport for NSW', 'TCAWS'],
    ['VIC', 'Transport Victoria', 'Worksite code'],
    ['QLD', 'TMR', 'Queensland guide'],
    ['SA', 'DIT', 'Workzone standard'],
    ['WA', 'Main Roads', 'Code of practice'],
    ['TAS', 'State Growth', 'Works guide'],
    ['ACT', 'Transport Canberra', 'Plan approval'],
    ['NT', 'Logistics & Infrastructure', 'Roadworks spec'],
] as const

export function AuthorityRow() {
    return (
        <ul className="authority-row">
            {AUTHORITIES.map(([id, name, rule]) => (
                <li key={id}>
                    <b aria-hidden="true">{id}</b>
                    <strong>{name}</strong>
                    <em>{rule}</em>
                </li>
            ))}
        </ul>
    )
}

export const CLIENTS = [
    ['MM', 'City of Maribyrnong', 'Council on the sample Geelong job'],
    ['HC', 'Hart & Co Civil', 'Civil client, billed from the docket'],
    ['MP', 'Metro Projects', 'Same booking as the roster'],
    ['VO', 'Venue Ops', 'Event shift, crew and truck together'],
] as const

export function ClientRow() {
    return (
        <ul className="client-row">
            {CLIENTS.map(([mark, name, text]) => (
                <li key={name}>
                    <b aria-hidden="true">{mark}</b>
                    <strong>{name}</strong>
                    <span>{text}</span>
                </li>
            ))}
        </ul>
    )
}

const TILES = [
    ['Xero', 'Xe', 'Invoices leave as a file the accounts desk can import. Pay is calculated in Trafficware first.'],
    ['Payroll file', 'Pf', 'Ordinary, night and weekend rates stay in this app. The office export is the file a payroll desk already knows.'],
    ['GPS', 'Gp', 'A truck ping can confirm the crew arrived. In this demo the ping stays on this device.'],
    ['Tickets', 'Tc', 'White card, traffic controller, implement TCP, TMA. Expiry is a date on the person, and the roster bot reads it.'],
    ['HR onboarding', 'Hr', 'A new starter stays off the board until the checks are done.'],
    ['Stripe', 'St', 'Client payment can sit on the invoice later. The docket does not wait for it.'],
] as const

export function IntegrationRow() {
    return (
        <div className="integrate-row">
            {TILES.map(([name, , text]) => (
                <article key={name}>
                    <IntegrationMark name={name} />
                    <p className="kicker">{name}</p>
                    <p>{text}</p>
                </article>
            ))}
        </div>
    )
}
