import { useEffect, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { buildAlerts, closeoutReview, invoiceDrafts, payrollRows, rosterPlan } from '../lib/bots.ts'
import { addDays, cx, downloadCsv, money, prettyDate, round1, shiftHours } from '../lib/format.ts'
import { findPerson, projectedWeekHours, validateAssignment } from '../lib/rules.ts'
import { useStore } from '../lib/store.tsx'
import type { AppState, Booking, Docket, Person, Slot } from '../types.ts'
import { Avatar } from './Avatar.tsx'
import { BotMark } from './BotMark.tsx'
import { Icon, IconKicker } from './Icons.tsx'
import type { IconName } from './Icons.tsx'
import { PLAYS, isPlayId } from './botPlays.ts'
import type { Play } from './botPlays.ts'

type Tone = 'run' | 'ok' | 'warn' | 'bad'

type TraceLine = {
    id: string
    tone: Tone
    text: string
}

type Report = (lines: TraceLine[]) => void

function line(id: string, tone: Tone, text: string): TraceLine {
    return { id, tone, text }
}

function prefersStill() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useTrace(lines: TraceLine[]) {
    const [shown, setShown] = useState(() => (prefersStill() ? lines.length : 0))
    const [seen, setSeen] = useState(lines)
    if (seen !== lines) {
        setSeen(lines)
        setShown(prefersStill() ? lines.length : 0)
    }
    useEffect(() => {
        if (prefersStill() || lines.length === 0) return
        const timers = lines.map((_, index) => window.setTimeout(() => setShown(index + 1), 280 * (index + 1)))
        return () => {
            for (const timer of timers) window.clearTimeout(timer)
        }
    }, [lines])
    return { visible: lines.slice(0, shown), working: shown < lines.length && lines.length > 0 }
}

function jobsOn(state: AppState, today: string) {
    return state.bookings.filter((booking) => booking.date === today)
}

function targetFor(state: AppState, today: string, person: Person) {
    const todayJobs = jobsOn(state, today).filter((booking) => !booking.invoiceId)
    const pool = todayJobs.length ? todayJobs : state.bookings.filter((booking) => !booking.invoiceId)
    for (const booking of pool) {
        const skilled = booking.slots.find((slot) => !slot.personId && person.skills.some((skill) => skill.name === slot.role))
        const open = skilled ?? booking.slots.find((slot) => !slot.personId)
        if (open) return { booking, slot: open }
    }
    const booking = pool[0]
    if (!booking?.slots[0]) return null
    return { booking, slot: booking.slots[0] }
}

function assignmentTrace(state: AppState, booking: Booking, slot: Slot, person: Person): TraceLine[] {
    const issues = validateAssignment(state, booking, slot, person)
    const hit = (code: string) => issues.find((issue) => issue.code === code)
    const lines: TraceLine[] = [
        line('read', 'run', `Roster bot read ${person.name} for ${slot.role} on ${booking.title}.`),
    ]
    const status = hit('status') ?? hit('leave')
    lines.push(line('status', status ? 'bad' : 'ok', status ? status.message : `Employment status is ${person.status}.`))
    const skillIssue = hit('skill') ?? hit('expired') ?? hit('expiring')
    const skill = person.skills.find((item) => item.name === slot.role)
    lines.push(
        line(
            'skill',
            skillIssue?.level === 'block' ? 'bad' : skillIssue ? 'warn' : 'ok',
            skillIssue ? skillIssue.message : `${slot.role} ticket is current until ${skill?.expires ?? 'the file'}.`,
        ),
    )
    for (const item of person.skills) {
        if (item.name === slot.role || item.expires >= booking.date) continue
        lines.push(line(`exp-${item.id}`, 'bad', `${item.name} ticket expired ${item.expires}.`))
    }
    const fatigue = hit('fatigue')
    const hours = projectedWeekHours(state, person.id, booking)
    lines.push(
        line(
            'fatigue',
            fatigue?.level === 'block' ? 'bad' : fatigue ? 'warn' : 'ok',
            fatigue ? fatigue.message : `${round1(hours)}h in 7 days, under the ${state.settings.maxWeekHours}h cap.`,
        ),
    )
    const clash = hit('clash') ?? hit('rest') ?? hit('duplicate') ?? hit('shift')
    lines.push(line('clash', clash ? 'bad' : 'ok', clash ? clash.message : 'No clash, and the rest gap is clear.'))
    const blocked = issues.some((issue) => issue.level === 'block')
    lines.push(
        line(
            'out',
            blocked ? 'bad' : issues.some((issue) => issue.level === 'warn') ? 'warn' : 'ok',
            blocked ? 'Roster bot will not send this offer.' : 'Roster bot can offer this shift. The phone still has to accept.',
        ),
    )
    return lines
}

function alertTrace(state: AppState, today: string): TraceLine[] {
    const alerts = buildAlerts(state, today)
    const lines: TraceLine[] = [
        line('scan', 'run', 'Roster bot walked people, tickets, leave, trucks and tomorrow’s open slots.'),
    ]
    if (!alerts.length) {
        lines.push(line('clear', 'ok', 'Nothing is expired, expiring, or blocking the next day.'))
        return lines
    }
    for (const alert of alerts.slice(0, 6)) {
        lines.push(line(alert.id, alert.tone === 'ok' ? 'ok' : alert.tone, `${alert.title}. ${alert.detail}`))
    }
    if (alerts.length > 6) {
        lines.push(line('more', 'warn', `${alerts.length - 6} more alerts are on the office dashboard.`))
    }
    return lines
}

function suggestTrace(state: AppState, today: string, committed: string | null): TraceLine[] {
    const plan = rosterPlan(state, today, 'All')
    const lines: TraceLine[] = [line('walk', 'run', 'Roster bot walked today’s open slots in start order.')]
    if (!plan.suggestions.length && !plan.gaps.length) {
        lines.push(line('empty', 'ok', committed ?? 'No open slot is waiting.'))
        return lines
    }
    for (const suggestion of plan.suggestions) {
        const person = findPerson(state, suggestion.personId)
        const booking = state.bookings.find((item) => item.id === suggestion.bookingId)
        const slot = booking?.slots.find((item) => item.id === suggestion.slotId)
        lines.push(
            line(
                suggestion.slotId,
                'ok',
                `${person?.name ?? 'Crew'} → ${slot?.role ?? 'slot'} on ${booking?.title ?? 'the job'}. ${suggestion.reason}`,
            ),
        )
    }
    for (const gap of plan.gaps) {
        lines.push(line(gap.slotId, 'warn', `${gap.bookingTitle}, ${gap.role} left open. ${gap.reason}`))
    }
    if (committed) lines.push(line('did', plan.gaps.length ? 'warn' : 'ok', committed))
    else lines.push(line('wait', 'run', 'These are offers, not placements. Run the bot to write them on the board.'))
    return lines
}

function pendingOffers(state: AppState, today: string) {
    const rows: { booking: Booking; slot: Slot; person: Person }[] = []
    for (const booking of state.bookings) {
        if (booking.date < today || booking.invoiceId) continue
        for (const slot of booking.slots) {
            const person = findPerson(state, slot.personId)
            if (person && slot.response === 'pending') rows.push({ booking, slot, person })
        }
    }
    return rows
}

function pushTrace(state: AppState, today: string): TraceLine[] {
    const offers = pendingOffers(state, today)
    const lines: TraceLine[] = [line('watch', 'run', 'Field sync bot is watching offers the roster bot has cleared.')]
    if (!offers.length) {
        lines.push(line('none', 'warn', 'No offer is waiting on a phone. Run auto-suggest, or drop a name the rules accept.'))
        return lines
    }
    for (const offer of offers.slice(0, 5)) {
        lines.push(
            line(
                offer.slot.id,
                'ok',
                `Pushed ${offer.booking.title} to ${offer.person.name}. ${offer.slot.role}, ${offer.booking.start}–${offer.booking.end}. Waiting for accept or decline.`,
            ),
        )
    }
    if (offers.length > 5) lines.push(line('more', 'warn', `${offers.length - 5} more offers are on the field app.`))
    return lines
}

function docketFacts(state: AppState, docket: Docket): TraceLine[] {
    const booking = state.bookings.find((item) => item.id === docket.bookingId)
    const person = findPerson(state, docket.personId)
    const name = person?.name ?? 'Crew'
    const title = booking?.title ?? 'the job'
    const lines: TraceLine[] = [line(`go-${docket.id}`, 'run', `Field sync bot read ${name}'s docket for ${title}.`)]
    lines.push(
        line(
            `sign-${docket.id}`,
            docket.signedBy ? 'ok' : 'bad',
            docket.signedBy ? `Signed by ${docket.signedBy}.` : 'No signature on the docket.',
        ),
    )
    if (booking) {
        const rostered = shiftHours(booking.start, booking.end)
        const actual = shiftHours(docket.start, docket.end)
        const held = Math.abs(actual - rostered) > 0.5
        lines.push(
            line(
                `hrs-${docket.id}`,
                held ? 'warn' : 'ok',
                held
                    ? `Docketed ${round1(actual)}h against a ${round1(rostered)}h roster.`
                    : `Hours match the roster, ${round1(actual)}h.`,
            ),
        )
    }
    lines.push(
        line(
            `miss-${docket.id}`,
            docket.nearMiss ? 'warn' : 'ok',
            docket.nearMiss ? `Near miss: ${docket.nearMiss}` : 'No near miss on this docket.',
        ),
    )
    lines.push(
        line(
            `photo-${docket.id}`,
            docket.nearMiss && !docket.photoName ? 'warn' : 'ok',
            docket.photoName ? `Photo attached, ${docket.photoName}.` : 'No photo attached.',
        ),
    )
    const queued = docket.status === 'queued'
    lines.push(
        line(
            `box-${docket.id}`,
            queued || docket.status === 'queried' ? 'warn' : 'ok',
            queued ? 'Still in the offline outbox. It has not reached payroll.' : `Status is ${docket.status}. The office can read it.`,
        ),
    )
    return lines
}

function docketTrace(state: AppState): TraceLine[] {
    const docs = [...state.outbox, ...state.dockets]
    const lines: TraceLine[] = [line('watch', 'run', 'Field sync bot is validating dockets, photos and the outbox.')]
    if (!docs.length) {
        lines.push(line('none', 'warn', 'No docket has come in. Accept a shift, then sign it.'))
        return lines
    }
    for (const docket of docs.slice(0, 4)) {
        const booking = state.bookings.find((item) => item.id === docket.bookingId)
        const person = findPerson(state, docket.personId)
        const held = booking ? Math.abs(shiftHours(docket.start, docket.end) - shiftHours(booking.start, booking.end)) > 0.5 : false
        const problems = [
            docket.signedBy ? '' : 'unsigned',
            held ? 'hours differ' : '',
            docket.nearMiss ? 'near miss' : '',
            docket.status === 'queued' ? 'offline' : '',
        ].filter(Boolean)
        lines.push(
            line(
                docket.id,
                problems.length ? 'warn' : 'ok',
                `${person?.name ?? 'Crew'} · ${booking?.title ?? 'Job'} · ${problems.length ? problems.join(', ') : 'clean'} · ${docket.status}`,
            ),
        )
    }
    if (docs.length > 4) lines.push(line('more', 'warn', `${docs.length - 4} more dockets are in close-out.`))
    return lines
}

function closeTrace(state: AppState, date: string, note: TraceLine | null): TraceLine[] {
    const review = closeoutReview(state, date)
    const rows = payrollRows(state, date)
    const drafts = invoiceDrafts(state)
    const gross = rows.reduce((sum, row) => sum + row.gross, 0)
    const lines: TraceLine[] = [line('read', 'run', `Close-out bot reviewed timesheets for ${prettyDate(date)}.`)]
    for (const [index, item] of review.slice(0, 5).entries()) {
        lines.push(line(`rev-${index}`, item.level === 'ok' ? 'ok' : item.level, item.message))
    }
    if (review.length > 5) lines.push(line('more', 'warn', `${review.length - 5} more lines are in the close-out queue.`))
    lines.push(
        line(
            'pay',
            rows.length ? 'ok' : 'warn',
            rows.length
                ? `${rows.length} payroll line${rows.length === 1 ? '' : 's'} ready for Employment Hero, ${money(gross)}.`
                : 'No approved hours to export for this day.',
        ),
    )
    lines.push(
        line(
            'inv',
            drafts.length ? 'ok' : 'warn',
            drafts.length
                ? `${drafts.length} invoice draft${drafts.length === 1 ? '' : 's'} ready for Xero.`
                : 'No approved job is waiting for an invoice.',
        ),
    )
    if (note) lines.push(note)
    return lines
}

function readPlay(play: string, state: AppState, today: string): TraceLine[] {
    if (play === 'roster-alerts') return alertTrace(state, today)
    if (play === 'roster-suggest') return suggestTrace(state, today, null)
    if (play === 'board-checks') {
        const jobs = jobsOn(state, today)
        const open = jobs.reduce((sum, booking) => sum + booking.slots.filter((slot) => !slot.personId).length, 0)
        return [
            line('watch', 'run', `Roster bot is watching ${jobs.length} job${jobs.length === 1 ? '' : 's'} today, ${open} open slot${open === 1 ? '' : 's'}.`),
            line('how', 'ok', 'Drop a name on a slot. Ticket, fatigue, rest, clash and availability run before the offer exists.'),
        ]
    }
    if (play === 'field-push') return pushTrace(state, today)
    if (play === 'field-docket') return docketTrace(state)
    return closeTrace(state, addDays(today, -1), null)
}

export function Interactions() {
    const { state, today } = useStore()
    const location = useLocation()
    const navigate = useNavigate()
    const hash = location.hash.replace('#', '')
    const routed = isPlayId(hash) ? hash : PLAYS[0].id
    const [play, setPlay] = useState(routed)
    const [lines, setLines] = useState<TraceLine[]>(() => readPlay(routed, state, today))
    const [seenHash, setSeenHash] = useState(hash)
    if (hash !== seenHash) {
        setSeenHash(hash)
        setPlay(routed)
        setLines(readPlay(routed, state, today))
    }

    const PLAY_ICONS: Record<string, IconName> = {
        'roster-alerts': 'alert',
        'roster-suggest': 'people',
        'board-checks': 'fatigue',
        'field-push': 'field',
        'field-docket': 'dockets',
        closeout: 'payroll',
    }

    const current = PLAYS.find((item) => item.id === play) ?? PLAYS[0]
    const { visible, working } = useTrace(lines)
    const latest = visible[visible.length - 1]

    function choose(id: string) {
        if (`#${id}` === location.hash) {
            setPlay(id)
            setLines(readPlay(id, state, today))
            return
        }
        navigate({ hash: id }, { replace: true })
    }

    return (
        <section className="ix" id="how">
            {PLAYS.map((item) => (
                <span key={item.id} id={item.id} className="ix-anchor" />
            ))}
            <div className="ix-wrap">
                <div className="ix-intro">
                    <div>
                        <IconKicker name="bot">Six automations</IconKicker>
                        <h2>Watch the bot do the job.</h2>
                        <p className="lede">Pick one. It runs on this yard, and the mark on the right loops while it works.</p>
                    </div>
                    <p className="write-pill">This writes to the workspace</p>
                </div>
                <div className="ix-shell">
                    <ol className="ix-rail">
                        {PLAYS.map((item, index) => (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    aria-current={item.id === play ? 'true' : undefined}
                                    onClick={() => choose(item.id)}
                                >
                                    <span className={`play-ico play-ico-${item.bot}`}><Icon name={PLAY_ICONS[item.id]} /></span>
                                    <span>
                                        <em>0{index + 1} · {item.botName}</em>
                                        <strong>{item.title}</strong>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ol>
                    <div className="ix-stage">
                        <header className="ix-bot">
                            <BotMark bot={current.bot} size={92} working={working} />
                            <div>
                                <p className="kicker">{current.botName}</p>
                                <h3>{current.title}</h3>
                                <p>{current.blurb}</p>
                                <p className="ix-reads">{current.reads}</p>
                            </div>
                        </header>
                        <p className="ix-live" role="status">{latest?.text ?? ''}</p>
                        <ol className="ix-trace">
                            {visible.map((item) => (
                                <li key={item.id} className={`ix-tone-${item.tone}`}>
                                    <span className="ix-dot" aria-hidden="true" />
                                    <span>{item.text}</span>
                                </li>
                            ))}
                        </ol>
                        <PlayPanel play={current} report={setLines} />
                    </div>
                </div>
            </div>
        </section>
    )
}

function PlayPanel({ play, report }: { play: Play; report: Report }) {
    if (play.id === 'roster-alerts') return <AlertsPlay report={report} />
    if (play.id === 'roster-suggest') return <SuggestPlay report={report} />
    if (play.id === 'board-checks') return <BoardPlay report={report} />
    if (play.id === 'field-push') return <PushPlay report={report} />
    if (play.id === 'field-docket') return <DocketPlay report={report} />
    return <ClosePlay report={report} />
}

function AlertsPlay({ report }: { report: Report }) {
    const { state, today } = useStore()
    const [personId, setPersonId] = useState('p-ben')
    const person = findPerson(state, personId)

    function check(nextId: string) {
        setPersonId(nextId)
        const next = findPerson(state, nextId)
        if (!next) return
        const target = targetFor(state, today, next)
        if (!target) {
            report([line('none', 'warn', 'No job is on the board to check against.')])
            return
        }
        report(assignmentTrace(state, target.booking, target.slot, next))
    }

    return (
        <div className="ix-controls">
            <p className="ix-label">Check one person, or scan the whole yard</p>
            <div className="ix-chips">
                {state.people.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={cx('ix-chip', personId === item.id && 'on')}
                        aria-pressed={personId === item.id}
                        onClick={() => check(item.id)}
                    >
                        <Avatar person={item} />
                        <span>
                            <strong>{item.name}</strong>
                            <em>{item.status === 'active' ? item.title : item.status}</em>
                        </span>
                    </button>
                ))}
            </div>
            <div className="ix-actions">
                <button type="button" className="btn btn-primary btn-small" onClick={() => person && check(person.id)}>
                    Check {person?.name ?? 'this person'}
                </button>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => report(alertTrace(state, today))}>
                    Scan the yard
                </button>
            </div>
        </div>
    )
}

function SuggestPlay({ report }: { report: Report }) {
    const store = useStore()
    const { state, today } = store

    function run() {
        const preview = suggestTrace(state, today, null).filter((item) => item.id !== 'wait' && item.id !== 'empty')
        const result = store.applySuggestions(today, 'All')
        report([...preview, line('did', result.tone, result.notice)])
    }

    return (
        <div className="ix-actions">
            <button type="button" className="btn btn-primary btn-small" onClick={run}>
                Run the roster bot
            </button>
            <Link to="/app/board">Open the booking board</Link>
        </div>
    )
}

function BoardPlay({ report }: { report: Report }) {
    const store = useStore()
    const { state, today } = store
    const jobs = jobsOn(state, today)
    const [jobId, setJobId] = useState<string | null>(null)
    const [personId, setPersonId] = useState<string | null>(null)
    const [over, setOver] = useState<string | null>(null)
    const job = jobs.find((item) => item.id === jobId) ?? jobs.find((item) => item.slots.some((slot) => !slot.personId)) ?? jobs[0] ?? null

    function place(nextPersonId: string, slotId: string) {
        if (!job) return
        const person = findPerson(state, nextPersonId)
        const slot = job.slots.find((item) => item.id === slotId)
        if (!person || !slot) return
        const trace = assignmentTrace(state, job, slot, person)
        const result = store.assignPerson(job.id, slot.id, person.id)
        trace.push(line('did', result.tone, result.notice))
        report(trace)
    }

    function dragStart(event: DragEvent<HTMLButtonElement>, id: string) {
        event.dataTransfer.setData('text/plain', id)
        event.dataTransfer.effectAllowed = 'copy'
        setPersonId(id)
    }

    return (
        <div className="ix-controls">
            <div className="ix-chips">
                {jobs.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={cx('ix-job', job?.id === item.id && 'on')}
                        aria-pressed={job?.id === item.id}
                        onClick={() => setJobId(item.id)}
                    >
                        <strong>{item.title}</strong>
                        <em>{item.start}–{item.end}</em>
                    </button>
                ))}
            </div>
            <p className="ix-label">Drag a name onto a slot, or select both</p>
            <div className="ix-chips">
                {state.people.map((person) => (
                    <button
                        key={person.id}
                        type="button"
                        className={cx('ix-chip', personId === person.id && 'on')}
                        draggable
                        aria-pressed={personId === person.id}
                        onClick={() => setPersonId(person.id)}
                        onDragStart={(event) => dragStart(event, person.id)}
                    >
                        <Avatar person={person} />
                        <span>
                            <strong>{person.name}</strong>
                            <em>{person.title}</em>
                        </span>
                    </button>
                ))}
            </div>
            {job ? (
                <div className="ix-slots">
                    {job.slots.map((slot) => {
                        const named = findPerson(state, slot.personId)
                        return (
                            <button
                                key={slot.id}
                                type="button"
                                className={cx('ix-slot', over === slot.id && 'over', !named && 'empty')}
                                onDragOver={(event) => {
                                    event.preventDefault()
                                    setOver(slot.id)
                                }}
                                onDragLeave={() => setOver((current) => (current === slot.id ? null : current))}
                                onDrop={(event) => {
                                    event.preventDefault()
                                    setOver(null)
                                    const id = event.dataTransfer.getData('text/plain')
                                    if (id) place(id, slot.id)
                                }}
                                onClick={() => {
                                    if (personId) place(personId, slot.id)
                                }}
                            >
                                <span>{slot.role}</span>
                                <strong>{named ? named.name : 'Drop here'}</strong>
                                <em>{slot.response ?? 'empty'}</em>
                            </button>
                        )
                    })}
                </div>
            ) : (
                <p className="ix-note">No job is on today’s board.</p>
            )}
        </div>
    )
}

function PushPlay({ report }: { report: Report }) {
    const store = useStore()
    const { state, today } = store
    const offers = pendingOffers(state, today)

    function answer(bookingId: string, slotId: string, response: 'accepted' | 'declined') {
        const offer = offers.find((item) => item.slot.id === slotId)
        const result = store.respond(bookingId, slotId, response)
        if (!offer) {
            report([line('gone', result.tone, result.notice)])
            return
        }
        report([
            line('push', 'run', `Field sync bot pushed ${offer.booking.title} to ${offer.person.name}'s phone.`),
            line(
                'reply',
                response === 'accepted' ? 'ok' : 'warn',
                response === 'accepted'
                    ? `${offer.person.name} accepted ${offer.slot.role}, ${offer.booking.start}–${offer.booking.end}.`
                    : `${offer.person.name} declined. The slot is open on the board again.`,
            ),
            line('board', result.tone, result.notice),
        ])
    }

    return (
        <div className="ix-controls">
            {offers.length === 0 ? (
                <div className="ix-actions">
                    <button
                        type="button"
                        className="btn btn-primary btn-small"
                        onClick={() => {
                            const result = store.applySuggestions(today, 'All')
                            report([
                                line('fill', 'run', 'No phone was waiting, so the roster bot filled today’s open slots first.'),
                                line('did', result.tone, result.notice),
                                line('next', 'ok', 'Those offers are on the phone below. Accept or decline one.'),
                            ])
                        }}
                    >
                        Fill open slots, then push
                    </button>
                    <Link to="/field">Open the field app</Link>
                </div>
            ) : (
                <div className="ix-offers">
                    {offers.slice(0, 3).map((offer) => (
                        <article key={offer.slot.id}>
                            <p className="person-id"><Avatar person={offer.person} size="sm" /><span className="kicker">{offer.person.name}</span></p>
                            <strong>{offer.booking.title}</strong>
                            <p>{offer.slot.role} · {offer.booking.start}–{offer.booking.end}</p>
                            <div className="ix-actions">
                                <button type="button" className="btn btn-amber btn-small" onClick={() => answer(offer.booking.id, offer.slot.id, 'accepted')}>
                                    Accept
                                </button>
                                <button type="button" className="btn btn-ghost btn-small" onClick={() => answer(offer.booking.id, offer.slot.id, 'declined')}>
                                    Decline
                                </button>
                            </div>
                        </article>
                    ))}
                    <Link to="/field">Open the field app</Link>
                </div>
            )}
        </div>
    )
}

function unsignedAccepted(state: AppState) {
    const rows: { booking: Booking; slot: Slot; person: Person }[] = []
    for (const booking of state.bookings) {
        for (const slot of booking.slots) {
            if (slot.response !== 'accepted' || !slot.personId) continue
            const person = findPerson(state, slot.personId)
            if (!person) continue
            const filed =
                state.dockets.some((docket) => docket.bookingId === booking.id && docket.personId === person.id && docket.status !== 'queried')
                || state.outbox.some((docket) => docket.bookingId === booking.id && docket.personId === person.id)
            if (!filed) rows.push({ booking, slot, person })
        }
    }
    return rows
}

function DocketPlay({ report }: { report: Report }) {
    const store = useStore()
    const { state } = store
    const waiting = unsignedAccepted(state)
    const first = waiting[0] ?? null
    const docs = [...state.outbox, ...state.dockets]

    return (
        <div className="ix-controls">
            {docs.length > 0 ? (
                <div className="ix-actions">
                    {docs.slice(0, 4).map((docket) => {
                        const person = findPerson(state, docket.personId)
                        return (
                            <button key={docket.id} type="button" className="btn btn-ghost btn-small" onClick={() => report(docketFacts(state, docket))}>
                                Validate {person?.name ?? 'docket'}
                            </button>
                        )
                    })}
                    {state.outbox.length > 0 ? (
                        <button
                            type="button"
                            className="btn btn-primary btn-small"
                            onClick={() => {
                                const result = store.syncField()
                                report([
                                    line('sync', 'run', 'Field sync bot pushed the outbox into the yard.'),
                                    line('did', result.tone, result.notice),
                                ])
                            }}
                        >
                            Sync the outbox
                        </button>
                    ) : null}
                </div>
            ) : null}
            {first ? (
                <SignForm
                    booking={first.booking}
                    person={first.person}
                    offline={state.offline}
                    onToggle={() => {
                        const result = store.setOffline(!state.offline)
                        report([line('net', result.tone === 'bad' ? 'bad' : 'warn', result.notice)])
                    }}
                    onSubmit={(input) => {
                        const result = store.submitDocket(input)
                        const docket = result.state.outbox.find((item) => item.personId === input.personId && item.bookingId === input.bookingId)
                            ?? result.state.dockets.find((item) => item.personId === input.personId && item.bookingId === input.bookingId)
                        report(docket ? [...docketFacts(result.state, docket), line('did', result.tone, result.notice)] : [line('did', result.tone, result.notice)])
                    }}
                />
            ) : (
                <p className="ix-note">Accept a shift on the phone before a new docket can be signed. Dockets already in the yard can still be validated.</p>
            )}
        </div>
    )
}

function SignForm({
    booking,
    person,
    offline,
    onToggle,
    onSubmit,
}: {
    booking: Booking
    person: Person
    offline: boolean
    onToggle: () => void
    onSubmit: (input: {
        bookingId: string
        personId: string
        start: string
        end: string
        breakMins: number
        notes: string
        signedBy: string
        nearMiss: string
        photoName: string
    }) => void
}) {
    const [start, setStart] = useState(booking.start)
    const [end, setEnd] = useState(booking.end)
    const [signature, setSignature] = useState(person.name)
    const [nearMiss, setNearMiss] = useState('')

    function send(event: FormEvent) {
        event.preventDefault()
        onSubmit({
            bookingId: booking.id,
            personId: person.id,
            start,
            end,
            breakMins: 30,
            notes: '',
            signedBy: signature,
            nearMiss,
            photoName: nearMiss.trim() ? 'near-miss-phone.jpg' : '',
        })
    }

    return (
        <form className="ix-form" onSubmit={send}>
            <p className="ix-label">Sign {person.name} on {booking.title}</p>
            <div className="ix-times">
                <label className="field">Start<input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
                <label className="field">Finish<input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
                <label className="field">Signature<input value={signature} onChange={(event) => setSignature(event.target.value)} autoComplete="off" /></label>
            </div>
            <label className="field">Near miss, optional<input value={nearMiss} onChange={(event) => setNearMiss(event.target.value)} placeholder="Leave blank if the shift was clean" /></label>
            <div className="ix-actions">
                <button type="submit" className="btn btn-primary btn-small">Submit the docket</button>
                <button type="button" className="btn btn-ghost btn-small" onClick={onToggle}>{offline ? 'Go back online' : 'Go offline'}</button>
            </div>
            <p className="ix-note">{offline ? 'Phone is offline. Submit queues the docket until Field Sync runs.' : 'Phone is online. Submit goes straight into the yard.'}</p>
        </form>
    )
}

function ClosePlay({ report }: { report: Report }) {
    const store = useStore()
    const { state, today } = store
    const [date, setDate] = useState(addDays(today, -1))

    function payrollFile() {
        const rows = payrollRows(state, date)
        if (!rows.length) {
            report(closeTrace(state, date, line('file', 'warn', 'No approved hours to put in the payroll file.')))
            return
        }
        downloadCsv('trafficware-payroll.csv', [
            ['Employee', 'Email', 'Date', 'Site', 'Start', 'End', 'Break mins', 'Hours', 'Rate type', 'Rate', 'Gross'],
            ...rows.map((row) => [
                row.name, row.email, row.date, row.site, row.start, row.end, String(row.breakMins),
                String(row.hours), row.rateType, String(row.rate), String(row.gross),
            ]),
        ])
        const gross = rows.reduce((sum, row) => sum + row.gross, 0)
        report(closeTrace(state, date, line('file', 'ok', `Payroll file downloaded. ${rows.length} lines, ${money(gross)}, ready for Employment Hero.`)))
    }

    function invoiceFile() {
        const result = store.createInvoices()
        const fresh = result.state.invoices.filter((invoice) => !state.invoices.some((item) => item.id === invoice.id))
        if (fresh.length) {
            downloadCsv('trafficware-invoices.csv', [
                ['Number', 'Client', 'Hours', 'Wages', 'Amount'],
                ...fresh.map((invoice) => {
                    const client = result.state.clients.find((item) => item.id === invoice.clientId)
                    return [invoice.number, client?.name ?? '', String(invoice.hours), String(invoice.wages), String(invoice.amount)]
                }),
            ])
        }
        report(closeTrace(result.state, date, line('file', result.tone, result.notice)))
    }

    return (
        <div className="ix-controls">
            <label className="field ix-date">
                Day
                <input type="date" value={date} onChange={(event) => {
                    setDate(event.target.value)
                    report(closeTrace(state, event.target.value, null))
                }} />
            </label>
            <div className="ix-actions">
                <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => {
                        const review = closeoutReview(state, date)
                        const bad = review.filter((item) => item.level === 'bad').length
                        const warn = review.filter((item) => item.level === 'warn').length
                        const result = store.recordCloseout(date, `Close-out review for ${date}: ${bad} blockers, ${warn} warnings.`)
                        report(closeTrace(state, date, line('did', result.tone, result.notice)))
                    }}
                >
                    Review timesheets
                </button>
                <button
                    type="button"
                    className="btn btn-amber btn-small"
                    onClick={() => {
                        const result = store.approveClean(date)
                        report(closeTrace(result.state, date, line('did', result.tone, result.notice)))
                    }}
                >
                    Approve clean dockets
                </button>
                <button type="button" className="btn btn-ghost btn-small" onClick={payrollFile}>
                    Export payroll
                </button>
                <button type="button" className="btn btn-primary btn-small" onClick={invoiceFile}>
                    Create the invoice
                </button>
                <Link to="/app/closeout">Open close-out</Link>
            </div>
        </div>
    )
}
