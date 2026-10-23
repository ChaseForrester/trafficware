import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { rosterPlan } from '../lib/bots.ts'
import { addDays, cx, initials, money, prettyDate, shiftHours } from '../lib/format.ts'
import { findPerson, statusFor } from '../lib/rules.ts'
import { useStore } from '../lib/store.tsx'
import type { AppState, Booking, Person } from '../types.ts'
import type { Result } from '../lib/mutate.ts'

const TRAP_IDS = ['p-ben', 'p-priya', 'p-aisha']

const STEPS = [
    {
        title: 'Open the job',
        hint: 'Choose a shift',
        photo: '/photos/princes-auckland.jpg',
        alt: 'Roadworks on Princes Street, Auckland, with cones along the lane. Photograph by Ingolfson.',
        credit: 'Ingolfson, public domain',
    },
    {
        title: 'Watch it refuse',
        hint: 'Drop a name',
        photo: '/photos/flagger-stop.jpg',
        alt: 'A traffic controller holds a stop paddle at a highway work zone. Photograph by the Oregon Department of Transportation.',
        credit: 'Oregon DOT, CC BY 2.0',
    },
    {
        title: 'Run the roster bot',
        hint: 'Fill the slots',
        photo: '/photos/flagger-slow.jpg',
        alt: 'A traffic controller holds a slow paddle so traffic can pass the work. Photograph by the Oregon Department of Transportation.',
        credit: 'Oregon DOT, CC BY 2.0',
    },
    {
        title: 'Accept on the phone',
        hint: 'Crew replies',
        photo: '/photos/flagger-utility.jpg',
        alt: 'A traffic controller stops traffic for utility works. Photograph by the Oregon Department of Transportation.',
        credit: 'Oregon DOT, CC BY 2.0',
    },
    {
        title: 'Sign the docket',
        hint: 'Hours and a name',
        photo: '/photos/road-worker.jpg',
        alt: 'A road worker in high-visibility clothing stands at a work site in Hokkaido. Photograph by Sgroey.',
        credit: 'Sgroey, CC BY-SA 4.0',
    },
    {
        title: 'Send the invoice',
        hint: 'Close last night',
        photo: '/photos/night-resurface.jpg',
        alt: 'Night resurfacing with workers, trucks and a road closure. Photograph by OathOn.',
        credit: 'OathOn, CC BY-SA 4.0',
    },
]

const NEED = [
    'Open a job to continue.',
    'Drop Ben, Priya or Aisha on a slot.',
    'Run the roster bot.',
    'Accept the offer on the phone.',
    'Sign and submit the docket.',
    'Create the invoice.',
]

type Offer = { bookingId: string; slotId: string; personId: string }
type Landed = { id: string; name: string; role: string }

function trapHint(person: Person, today: string) {
    if (person.status === 'leave' || person.leaveDates.includes(today)) return 'On leave'
    const expired = person.skills.find((skill) => skill.expires < today)
    if (expired) return `${expired.name} expired`
    const prior = person.priorHours.reduce((sum, row) => sum + row.hours, 0)
    if (prior >= 50) return `${prior}h already this week`
    return person.title
}

function offersFor(state: AppState, today: string): Offer[] {
    const rows: Offer[] = []
    for (const booking of state.bookings) {
        if (booking.date < today || booking.invoiceId) continue
        for (const slot of booking.slots) {
            if (slot.personId && slot.response === 'pending') {
                rows.push({ bookingId: booking.id, slotId: slot.id, personId: slot.personId })
            }
        }
    }
    return rows
}

function changedPeople(before: AppState, after: AppState) {
    let count = 0
    for (const booking of after.bookings) {
        const prev = before.bookings.find((item) => item.id === booking.id)
        for (const slot of booking.slots) {
            const old = prev?.slots.find((item) => item.id === slot.id)
            if (slot.personId && slot.personId !== old?.personId) count += 1
        }
    }
    return count
}

function useReveal(count: number, token: number) {
    const [shown, setShown] = useState(count)
    useEffect(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduce || count === 0) {
            setShown(count)
            return
        }
        setShown(0)
        const timers = Array.from({ length: count }, (_, index) =>
            window.setTimeout(() => setShown(index + 1), 170 * (index + 1)),
        )
        return () => timers.forEach((timer) => window.clearTimeout(timer))
    }, [count, token])
    return shown
}

function useCount(value: number, play: boolean) {
    const [shown, setShown] = useState(play ? 0 : value)
    useEffect(() => {
        if (!play) {
            setShown(value)
            return
        }
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduce) {
            setShown(value)
            return
        }
        let frame = 0
        const start = performance.now()
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / 900)
            setShown(value * (1 - (1 - t) ** 3))
            if (t < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [value, play])
    return shown
}

export function Guide() {
    const store = useStore()
    const { state, today, resetDemo } = store
    const [step, setStep] = useState(0)
    const [jobId, setJobId] = useState<string | null>(null)
    const [blocked, setBlocked] = useState(false)
    const [blockText, setBlockText] = useState('')
    const [shake, setShake] = useState(0)
    const [pickedId, setPickedId] = useState<string | null>(null)
    const [botDone, setBotDone] = useState(false)
    const [botNote, setBotNote] = useState('')
    const [landed, setLanded] = useState<Landed[]>([])
    const [landedKey, setLandedKey] = useState(0)
    const [also, setAlso] = useState(0)
    const [accepted, setAccepted] = useState(false)
    const [offer, setOffer] = useState<Offer | null>(null)
    const [phoneNote, setPhoneNote] = useState('')
    const [signed, setSigned] = useState(false)
    const [freshId, setFreshId] = useState<string | null>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const firstFocus = useRef(true)

    const job = state.bookings.find((booking) => booking.id === jobId) ?? null
    const jobFull = Boolean(job && job.slots.every((slot) => slot.personId))
    const complete = [
        Boolean(job),
        blocked,
        botDone || jobFull,
        accepted,
        signed,
        state.invoices.length > 0,
    ]

    useEffect(() => {
        if (firstFocus.current) {
            firstFocus.current = false
            return
        }
        panelRef.current?.focus()
    }, [step])

    function openable(index: number) {
        return complete.slice(0, index).every(Boolean)
    }

    function restore() {
        resetDemo()
        setStep(0)
        setJobId(null)
        setBlocked(false)
        setBlockText('')
        setShake(0)
        setPickedId(null)
        setBotDone(false)
        setBotNote('')
        setLanded([])
        setAlso(0)
        setAccepted(false)
        setOffer(null)
        setPhoneNote('')
        setSigned(false)
        setFreshId(null)
    }

    function place(personId: string, slotId: string) {
        if (!jobId) return
        const result = store.assignPerson(jobId, slotId, personId)
        setShake(Date.now())
        setBlockText(result.notice)
        if (result.tone === 'bad') setBlocked(true)
    }

    function recordBot(before: AppState, result: Result) {
        if (!jobId) return
        const after = result.state.bookings.find((booking) => booking.id === jobId)
        const rows: Landed[] = []
        if (after) {
            const prev = before.bookings.find((booking) => booking.id === jobId)
            for (const slot of after.slots) {
                const old = prev?.slots.find((item) => item.id === slot.id)
                if (!slot.personId || slot.personId === old?.personId) continue
                rows.push({
                    id: slot.id,
                    name: findPerson(result.state, slot.personId)?.name ?? 'Crew',
                    role: slot.role,
                })
            }
        }
        const total = changedPeople(before, result.state)
        setLanded(rows)
        setLandedKey((value) => value + 1)
        setAlso(Math.max(0, total - rows.length))
        setBotNote(result.notice)
        const full = Boolean(after && after.slots.every((slot) => slot.personId))
        if (rows.length || total > 0 || full) setBotDone(true)
    }

    function runBot() {
        const before = state
        recordBot(before, store.applySuggestions(today, 'All'))
    }

    function replayBot() {
        if (!job) return
        const before = state
        for (const slot of job.slots) {
            if (slot.personId) store.unassignPerson(job.id, slot.id)
        }
        recordBot(before, store.applySuggestions(today, 'All'))
    }

    function acceptOffer(target: Offer) {
        const result = store.respond(target.bookingId, target.slotId, 'accepted')
        setPhoneNote(result.notice)
        if (result.tone === 'ok') {
            setAccepted(true)
            setOffer(target)
        }
    }

    function declineOffer(target: Offer) {
        const result = store.respond(target.bookingId, target.slotId, 'declined')
        setPhoneNote(result.notice)
    }

    function resend() {
        const pool = state.bookings.filter((booking) => booking.date >= today && !booking.invoiceId)
        const ordered = [...pool.filter((booking) => booking.id === jobId), ...pool.filter((booking) => booking.id !== jobId)]
        for (const booking of ordered) {
            const slot = booking.slots.find((item) => item.personId && item.response === 'accepted')
            if (!slot?.personId) continue
            const personId = slot.personId
            const removed = store.unassignPerson(booking.id, slot.id)
            if (removed.tone === 'bad') continue
            const sent = store.assignPerson(booking.id, slot.id, personId)
            setPhoneNote(sent.notice)
            return
        }
        setPhoneNote('No accepted shift can be offered again. Run the roster bot on an open job.')
    }

    const cleared = complete.filter(Boolean).length

    return (
        <section className="guide-section" id="how">
            <div className="guide-wrap">
                <div className="guide-intro">
                    <div>
                        <p className="kicker">Six moves</p>
                        <h2>Run a shift. The workspace keeps every click.</h2>
                        <p className="lede">
                            This is the sample yard, and it is the real board. Open a job, get refused, fill the crew,
                            accept on the phone, sign the docket, then invoice last night.
                        </p>
                    </div>
                    <div className="guide-intro-side">
                        <p className="write-pill">This writes to the workspace</p>
                        <p className="muted">{cleared} of 6 recorded</p>
                        <button type="button" className="text-btn" onClick={restore}>
                            Restore the sample yard
                        </button>
                    </div>
                </div>

                <div className="guide-shell">
                    <ol className="guide-rail">
                        {STEPS.map((item, index) => (
                            <li key={item.title}>
                                <button
                                    type="button"
                                    aria-current={index === step ? 'step' : undefined}
                                    disabled={!openable(index)}
                                    onClick={() => setStep(index)}
                                >
                                    <span className="num">{String(index + 1).padStart(2, '0')}</span>
                                    <strong>{item.title}</strong>
                                    <em>{complete[index] ? 'Recorded' : item.hint}</em>
                                </button>
                            </li>
                        ))}
                    </ol>

                    <div className="guide-stage">
                        {STEPS.map((item, index) => (
                            <img
                                key={item.photo}
                                className={cx('guide-photo', index === step && 'on')}
                                src={item.photo}
                                alt=""
                                aria-hidden="true"
                            />
                        ))}
                        <div className="guide-shade" />
                        <div className="guide-panel" ref={panelRef} tabIndex={-1} data-guide-step={step + 1}>
                            <p className="kicker">Step {String(step + 1).padStart(2, '0')} · {STEPS[step].title}</p>
                            {step === 0 ? <StepOpen state={state} today={today} jobId={jobId} onOpen={setJobId} /> : null}
                            {step === 1 && job ? (
                                <StepBlock
                                    state={state}
                                    today={today}
                                    job={job}
                                    pickedId={pickedId}
                                    onPick={setPickedId}
                                    onPlace={place}
                                    blockText={blockText}
                                    blocked={blocked}
                                    shake={shake}
                                />
                            ) : null}
                            {step === 2 && job ? (
                                <StepBot
                                    state={state}
                                    today={today}
                                    job={job}
                                    landed={landed}
                                    landedKey={landedKey}
                                    also={also}
                                    note={botNote}
                                    onRun={runBot}
                                    onReplay={replayBot}
                                />
                            ) : null}
                            {step === 3 ? (
                                <StepPhone
                                    state={state}
                                    today={today}
                                    jobId={jobId}
                                    accepted={accepted}
                                    offer={offer}
                                    note={phoneNote}
                                    onAccept={acceptOffer}
                                    onDecline={declineOffer}
                                    onResend={resend}
                                />
                            ) : null}
                            {step === 4 ? (
                                <StepDocket
                                    offer={offer}
                                    signed={signed}
                                    onSigned={(notice, ok) => {
                                        setPhoneNote(notice)
                                        if (ok) setSigned(true)
                                    }}
                                />
                            ) : null}
                            {step === 5 ? <StepInvoice freshId={freshId} onFresh={setFreshId} /> : null}

                            <div className="guide-bar">
                                <p role="status">{complete[step] ? 'Recorded in the workspace.' : NEED[step]}</p>
                                <div className="hero-actions">
                                    <button type="button" className="btn btn-ghost btn-small" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
                                        Back
                                    </button>
                                    {step < 5 ? (
                                        <button type="button" className="btn btn-primary btn-small" disabled={!complete[step]} onClick={() => setStep((value) => value + 1)}>
                                            Next
                                        </button>
                                    ) : (
                                        <Link to="/app/closeout" className="btn btn-primary btn-small">
                                            Open close-out
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                        <p className="guide-credit">{STEPS[step].credit}</p>
                    </div>
                </div>
            </div>
        </section>
    )
}

function StepOpen({
    state,
    today,
    jobId,
    onOpen,
}: {
    state: AppState
    today: string
    jobId: string | null
    onOpen: (id: string) => void
}) {
    const jobs = state.bookings.filter((booking) => booking.date === today)
    const open = jobs.find((booking) => booking.id === jobId) ?? null
    return (
        <div className="step-body">
            <h3>Which shift are you running?</h3>
            <p>Today&apos;s jobs are already on the board. Open one. The slots, the truck and the client come from the same record as the roster.</p>
            <div className="job-picks">
                {jobs.map((booking) => {
                    const client = state.clients.find((item) => item.id === booking.clientId)
                    const empty = booking.slots.filter((slot) => !slot.personId).length
                    return (
                        <button
                            key={booking.id}
                            type="button"
                            className={cx('job-pick', jobId === booking.id && 'on')}
                            aria-pressed={jobId === booking.id}
                            onClick={() => onOpen(booking.id)}
                        >
                            <span className="kicker">{booking.start}–{booking.end} · {booking.depot}</span>
                            <strong>{booking.title}</strong>
                            <em>{client?.name} · {empty === 0 ? 'Crew named' : `${empty} open`}</em>
                        </button>
                    )
                })}
            </div>
            {open ? <JobSheet state={state} job={open} /> : null}
        </div>
    )
}

function JobSheet({ state, job }: { state: AppState; job: Booking }) {
    const client = state.clients.find((item) => item.id === job.clientId)
    const vehicle = state.vehicles.find((item) => item.id === job.vehicleId)
    const status = statusFor(state, job)
    return (
        <div className="job-sheet">
            <div className="job-sheet-top">
                <p>
                    <span className={cx('badge', `badge-${status}`)}>{status}</span>
                </p>
                <p className="muted">{prettyDate(job.date)} · {job.site}</p>
            </div>
            <p>{client?.name ?? 'Client'} · {vehicle ? vehicle.name : 'No truck yet'}</p>
            <ul className="slot-read">
                {job.slots.map((slot, index) => {
                    const person = findPerson(state, slot.personId)
                    return (
                        <li key={slot.id} style={{ animationDelay: `${index * 70}ms` }}>
                            <span>{slot.role}</span>
                            <strong>{person ? person.name : 'Open'}</strong>
                            <em>{slot.response ?? 'empty'}</em>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

function StepBlock({
    state,
    today,
    job,
    pickedId,
    onPick,
    onPlace,
    blockText,
    blocked,
    shake,
}: {
    state: AppState
    today: string
    job: Booking
    pickedId: string | null
    onPick: (id: string) => void
    onPlace: (personId: string, slotId: string) => void
    blockText: string
    blocked: boolean
    shake: number
}) {
    const [over, setOver] = useState<string | null>(null)
    const traps = TRAP_IDS.map((id) => findPerson(state, id)).filter((person): person is Person => Boolean(person))

    function dragStart(event: DragEvent<HTMLButtonElement>, personId: string) {
        event.dataTransfer.setData('text/person-id', personId)
        event.dataTransfer.setData('text/plain', personId)
        event.dataTransfer.effectAllowed = 'copy'
        onPick(personId)
    }

    function drop(event: DragEvent<HTMLButtonElement>, slotId: string) {
        event.preventDefault()
        setOver(null)
        const personId = event.dataTransfer.getData('text/person-id') || event.dataTransfer.getData('text/plain')
        if (personId) onPlace(personId, slotId)
    }

    return (
        <div className="step-body">
            <h3>Put someone on {job.title} who cannot work it.</h3>
            <p>Select a name, then select a slot. Or drag. The board runs the same check it uses on the roster.</p>
            <div className="trap-row">
                {traps.map((person) => (
                    <button
                        key={person.id}
                        type="button"
                        className={cx('trap', pickedId === person.id && 'on')}
                        draggable
                        aria-pressed={pickedId === person.id}
                        onClick={() => onPick(person.id)}
                        onDragStart={(event) => dragStart(event, person.id)}
                    >
                        <span className="avatar" style={{ background: person.color }}>{initials(person.name)}</span>
                        <span>
                            <strong>{person.name}</strong>
                            <em>{trapHint(person, today)}</em>
                        </span>
                    </button>
                ))}
            </div>
            <div className="drop-row">
                {job.slots.map((slot) => {
                    const person = findPerson(state, slot.personId)
                    return (
                        <button
                            key={slot.id}
                            type="button"
                            className={cx('drop-slot', over === slot.id && 'over', !person && 'empty-slot')}
                            onDragOver={(event) => {
                                event.preventDefault()
                                setOver(slot.id)
                            }}
                            onDragLeave={() => setOver((current) => (current === slot.id ? null : current))}
                            onDrop={(event) => drop(event, slot.id)}
                            onClick={() => {
                                if (pickedId) onPlace(pickedId, slot.id)
                            }}
                        >
                            <span>{slot.role}</span>
                            <strong>{person ? person.name : 'Drop here'}</strong>
                        </button>
                    )
                })}
            </div>
            {blockText ? (
                <p key={shake} className={cx('block-result', blocked && 'is-block', shake > 0 && 'deny')} role="status">
                    {blockText}
                </p>
            ) : null}
        </div>
    )
}

function StepBot({
    state,
    today,
    job,
    landed,
    landedKey,
    also,
    note,
    onRun,
    onReplay,
}: {
    state: AppState
    today: string
    job: Booking
    landed: Landed[]
    landedKey: number
    also: number
    note: string
    onRun: () => void
    onReplay: () => void
}) {
    const plan = useMemo(() => rosterPlan(state, today, 'All'), [state, today])
    const mine = plan.suggestions.filter((suggestion) => suggestion.bookingId === job.id)
    const shown = useReveal(landed.length, landedKey)
    const empty = job.slots.some((slot) => !slot.personId)
    return (
        <div className="step-body">
            <h3>Let the roster bot offer the crew.</h3>
            <p>
                It walks today&apos;s open slots in order, scores depot and hours, and skips anyone the rules block.
                Warnings still go through. You can read the offers before you commit them.
            </p>
            {landed.length ? (
                <ul className="landed">
                    {landed.map((row, index) => (
                        <li key={row.id} className={index < shown ? 'in' : 'wait'}>
                            <strong>{row.name}</strong>
                            <span>{row.role}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <ul className="preview-list">
                    {mine.map((suggestion) => {
                        const person = findPerson(state, suggestion.personId)
                        const slot = job.slots.find((item) => item.id === suggestion.slotId)
                        return (
                            <li key={suggestion.slotId}>
                                <strong>{person?.name}</strong>
                                <span>{slot?.role}</span>
                                <em>{suggestion.reason}</em>
                            </li>
                        )
                    })}
                    {!mine.length ? <li className="muted">No open slot on this job is waiting for an offer.</li> : null}
                </ul>
            )}
            {also > 0 ? <p className="muted">Also offered {also} place{also === 1 ? '' : 's'} on the rest of today&apos;s board.</p> : null}
            {note ? <p className="bot-note" role="status">{note}</p> : null}
            <div className="hero-actions">
                {empty ? (
                    <button type="button" className="btn btn-primary" onClick={onRun}>
                        Run the roster bot
                    </button>
                ) : (
                    <button type="button" className="btn btn-primary" onClick={onReplay}>
                        Pull this crew off and run it
                    </button>
                )}
                <Link to="/app/board">See the board</Link>
            </div>
        </div>
    )
}

function StepPhone({
    state,
    today,
    jobId,
    accepted,
    offer,
    note,
    onAccept,
    onDecline,
    onResend,
}: {
    state: AppState
    today: string
    jobId: string | null
    accepted: boolean
    offer: Offer | null
    note: string
    onAccept: (offer: Offer) => void
    onDecline: (offer: Offer) => void
    onResend: () => void
}) {
    const pending = offersFor(state, today)
    const shown = pending.find((item) => item.bookingId === jobId) ?? pending[0] ?? null
    const acceptedBooking = offer ? state.bookings.find((booking) => booking.id === offer.bookingId) : null
    const acceptedSlot = acceptedBooking?.slots.find((slot) => slot.id === offer?.slotId)
    const acceptedPerson = findPerson(state, offer?.personId ?? null)
    const showDone = accepted && acceptedSlot?.response === 'accepted' && acceptedPerson && acceptedBooking

    return (
        <div className="step-body phone-step">
            <div>
                <h3>The offer is on the phone.</h3>
                <p>Accept writes the same response the field app writes. Decline clears the slot. Nothing here is a picture of a phone call.</p>
                {note ? <p className="bot-note" role="status">{note}</p> : null}
                <p><Link to="/field">Open the field app</Link></p>
            </div>
            <div className="handset">
                <div className="handset-screen">
                    <p className="handset-bar"><span>Field</span><span>{prettyDate(today)}</span></p>
                    {showDone ? (
                        <div className="accept-done">
                            <span className="tick" aria-hidden="true" />
                            <strong>{acceptedPerson.name} accepted</strong>
                            <p>{acceptedBooking.title}</p>
                            <p className="muted">{acceptedSlot.role} · {acceptedBooking.start}–{acceptedBooking.end}</p>
                        </div>
                    ) : shown ? (
                        <PhoneOffer state={state} offer={shown} onAccept={onAccept} onDecline={onDecline} />
                    ) : (
                        <div className="accept-done">
                            <strong>No offer is waiting.</strong>
                            <p>Send one back to the phone. That pulls an accepted name off the shift and offers it again.</p>
                            <button type="button" className="btn btn-amber" onClick={onResend}>
                                Send the offer again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function PhoneOffer({
    state,
    offer,
    onAccept,
    onDecline,
}: {
    state: AppState
    offer: Offer
    onAccept: (offer: Offer) => void
    onDecline: (offer: Offer) => void
}) {
    const booking = state.bookings.find((item) => item.id === offer.bookingId)
    const slot = booking?.slots.find((item) => item.id === offer.slotId)
    const person = findPerson(state, offer.personId)
    if (!booking || !slot || !person) return <p>That offer has gone.</p>
    return (
        <div className="offer-card">
            <p className="kicker">Job offer</p>
            <h3>{person.name}</h3>
            <p className="offer-title">{booking.title}</p>
            <p>{slot.role}</p>
            <p className="muted">{prettyDate(booking.date)} · {booking.start}–{booking.end}</p>
            <p className="muted">{booking.site}</p>
            <button type="button" className="btn btn-amber btn-block" onClick={() => onAccept(offer)}>
                Accept the shift
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => onDecline(offer)}>
                Decline
            </button>
        </div>
    )
}

function StepDocket({
    offer,
    signed,
    onSigned,
}: {
    offer: Offer | null
    signed: boolean
    onSigned: (notice: string, ok: boolean) => void
}) {
    const store = useStore()
    const { state } = store
    const booking = offer ? state.bookings.find((item) => item.id === offer.bookingId) ?? null : null
    const person = findPerson(state, offer?.personId ?? null)
    const existing = booking && person
        ? state.dockets.find((docket) => docket.bookingId === booking.id && docket.personId === person.id && docket.status !== 'queried')
        ?? state.outbox.find((docket) => docket.bookingId === booking.id && docket.personId === person.id)
        : null

    if (!booking || !person) {
        return (
            <div className="step-body">
                <h3>The docket needs an accepted name.</h3>
                <p>Accept a shift on the phone first. The signature is for that person, on that job.</p>
            </div>
        )
    }

    return (
        <DocketForm
            key={`${booking.id}-${person.id}`}
            booking={booking}
            person={person}
            offline={state.offline}
            queued={state.outbox.length}
            existingStatus={existing?.status ?? (signed ? 'submitted' : null)}
            onToggleOffline={() => store.setOffline(!state.offline)}
            onSync={() => {
                const result = store.syncField()
                onSigned(result.notice, result.tone !== 'bad')
                return result.notice
            }}
            onSubmit={(input) => {
                const result = store.submitDocket(input)
                const ok = result.tone !== 'bad'
                onSigned(result.notice, ok)
                return result.notice
            }}
        />
    )
}

function DocketForm({
    booking,
    person,
    offline,
    queued,
    existingStatus,
    onToggleOffline,
    onSync,
    onSubmit,
}: {
    booking: Booking
    person: Person
    offline: boolean
    queued: number
    existingStatus: string | null
    onToggleOffline: () => void
    onSync: () => string
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
    }) => string
}) {
    const [start, setStart] = useState(booking.start)
    const [end, setEnd] = useState(booking.end)
    const [breakMins, setBreakMins] = useState(30)
    const [notes, setNotes] = useState('')
    const [signature, setSignature] = useState('')
    const [nearMiss, setNearMiss] = useState('')
    const [formNote, setFormNote] = useState('')

    function send(event: FormEvent) {
        event.preventDefault()
        setFormNote(onSubmit({
            bookingId: booking.id,
            personId: person.id,
            start,
            end,
            breakMins,
            notes,
            signedBy: signature,
            nearMiss,
            photoName: nearMiss.trim() ? 'near-miss-phone.jpg' : '',
        }))
    }

    return (
        <form className="step-body" onSubmit={send}>
            <h3>Sign {person.name}&apos;s docket.</h3>
            <p>
                {booking.title}, rostered {booking.start}–{booking.end}. The signature has to be typed.
                Switch the phone offline and the docket waits in the outbox until Field Sync runs.
            </p>
            <div className="docket-grid">
                <label className="field">Start<input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
                <label className="field">Finish<input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
                <label className="field">Break, minutes<input type="number" min={0} max={180} value={breakMins} onChange={(event) => setBreakMins(Number(event.target.value) || 0)} /></label>
            </div>
            <label className="field">Notes<textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What the site actually did" /></label>
            <label className="field">Near miss, optional<input value={nearMiss} onChange={(event) => setNearMiss(event.target.value)} placeholder="Leave blank if the shift was clean" /></label>
            <label className="field">Signature
                <input value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="Type the name to sign" autoComplete="off" />
            </label>
            <p className={cx('sign-line', signature && 'has-ink')} aria-hidden="true">
                <span>{signature || 'Sign here'}</span>
            </p>
            <div className="hero-actions">
                <button type="submit" className="btn btn-primary" disabled={!signature.trim()}>Submit the docket</button>
                <button type="button" className="btn btn-ghost" onClick={onToggleOffline}>{offline ? 'Go back online' : 'Go offline'}</button>
                {queued > 0 ? (
                    <button type="button" className="btn btn-ghost" onClick={() => setFormNote(onSync())}>
                        Sync the outbox
                    </button>
                ) : null}
            </div>
            <p className="muted">{offline ? 'Phone is offline. A submit will queue.' : 'Phone is online. A submit goes straight in.'}</p>
            {existingStatus ? <p className="bot-note" role="status">Docket is {existingStatus}.</p> : null}
            {formNote ? <p className="bot-note" role="status">{formNote}</p> : null}
        </form>
    )
}

function StepInvoice({ freshId, onFresh }: { freshId: string | null; onFresh: (id: string) => void }) {
    const store = useStore()
    const { state, today } = store
    const yesterday = addDays(today, -1)
    const jobs = state.bookings.filter((booking) => booking.date === yesterday)
    const [note, setNote] = useState('')

    function approve() {
        const result = store.approveClean(yesterday)
        setNote(result.notice)
    }

    function invoice() {
        const before = new Set(state.invoices.map((item) => item.id))
        const result = store.createInvoices()
        setNote(result.notice)
        const fresh = result.state.invoices.find((item) => !before.has(item.id))
        if (fresh) onFresh(fresh.id)
    }

    return (
        <div className="step-body">
            <h3>Close last night, then raise the invoice.</h3>
            <p>
                Clean, signed dockets whose hours match the roster can be approved. A mismatch stays submitted.
                Ballarat Road is already approved, so the first invoice can be raised before Footscray is.
            </p>
            {jobs.map((booking) => (
                <div key={booking.id} className="close-job">
                    <strong>{booking.title}</strong>
                    <span className="muted">Roster {booking.start}–{booking.end} · {shiftHours(booking.start, booking.end)}h</span>
                    <ul>
                        {state.dockets.filter((docket) => docket.bookingId === booking.id).map((docket) => {
                            const person = findPerson(state, docket.personId)
                            const actual = shiftHours(docket.start, docket.end)
                            const rostered = shiftHours(booking.start, booking.end)
                            const held = Math.abs(actual - rostered) > 0.5
                            return (
                                <li key={docket.id}>
                                    <span>{person?.name}</span>
                                    <span>{docket.start}–{docket.end}</span>
                                    <span className={cx('badge', held ? 'badge-offered' : `badge-${docket.status}`)}>
                                        {held && docket.status === 'submitted' ? 'Held' : docket.status}
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ))}
            <div className="hero-actions">
                <button type="button" className="btn btn-ghost" onClick={approve}>Approve the clean dockets</button>
                <button type="button" className="btn btn-primary" onClick={invoice}>Create the invoice</button>
            </div>
            {note ? <p className="bot-note" role="status">{note}</p> : null}
            <div className="invoice-stack">
                {state.invoices.map((invoice) => {
                    const client = state.clients.find((item) => item.id === invoice.clientId)
                    return <InvoiceCard key={invoice.id} number={invoice.number} client={client?.name ?? 'Client'} hours={invoice.hours} amount={invoice.amount} wages={invoice.wages} play={invoice.id === freshId} />
                })}
            </div>
            <p><Link to="/app/closeout">Review it in close-out</Link></p>
        </div>
    )
}

function InvoiceCard({
    number,
    client,
    hours,
    amount,
    wages,
    play,
}: {
    number: string
    client: string
    hours: number
    amount: number
    wages: number
    play: boolean
}) {
    const shown = useCount(amount, play)
    return (
        <article className={cx('invoice-card', play && 'fresh')}>
            <p className="kicker">{number}</p>
            <h3>{client}</h3>
            <p className="invoice-figure">{money(shown)}</p>
            <p className="muted">{hours}h charged · wages {money(wages)} · margin {money(amount - wages)}</p>
        </article>
    )
}
