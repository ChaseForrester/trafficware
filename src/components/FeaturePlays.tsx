import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IntegrationMark } from './Marks.tsx'

type Play = {
    title: string
    summary: string
    to: string
    link: string
    steps: string[]
    stage: (step: number) => ReactNode
}

function usePlayStep() {
    const [step, setStep] = useState(0)
    const [still, setStill] = useState(false)

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)')
        const apply = () => setStill(media.matches)
        apply()
        media.addEventListener('change', apply)
        return () => media.removeEventListener('change', apply)
    }, [])

    useEffect(() => {
        if (still) return
        const timer = window.setInterval(() => setStep((current) => (current + 1) % 3), 2400)
        return () => window.clearInterval(timer)
    }, [still])

    return { step: still ? 2 : step, setStep, still }
}

function Dots({ step, steps, onStep }: { step: number; steps: string[]; onStep: (index: number) => void }) {
    return (
        <div className="play-dots" role="tablist" aria-label="Steps">
            {steps.map((label, index) => (
                <button
                    key={label}
                    type="button"
                    role="tab"
                    aria-selected={step === index}
                    className={step === index ? 'on' : undefined}
                    onClick={() => onStep(index)}
                >
                    {index + 1}
                </button>
            ))}
        </div>
    )
}

function BoardStage({ step }: { step: number }) {
    return (
        <div className="crm crm-board" data-step={step}>
            <p className="crm-kicker">Booking board</p>
            <div className="crm-cols">
                <span>Mon</span>
                <span>Tue</span>
                <span className={step > 0 ? 'on' : undefined}>Wed</span>
            </div>
            <div className="crm-track">
                <b className="crm-job">M80 night</b>
            </div>
            <div className="crm-slot-row">
                <div className="crm-slot">
                    <span>Slot</span>
                    <em className="crm-open">Open</em>
                    <em className="crm-name">Maya</em>
                </div>
            </div>
        </div>
    )
}

function PeopleStage({ step }: { step: number }) {
    const rows = [
        { name: 'Ben Walsh', detail: 'Traffic controller ticket expired', state: 'Blocked', tone: 'bad' },
        { name: 'Ben Walsh', detail: '63 hours this week, over the cap', state: 'Blocked', tone: 'bad' },
        { name: 'Maya Chen', detail: 'Ticket current, week is clear', state: 'Offered', tone: 'good' },
    ]
    const row = rows[step] ?? rows[0]
    return (
        <div className="crm crm-people" data-step={step}>
            <p className="crm-kicker">People</p>
            <div key={step} className={`crm-person crm-${row.tone}`}>
                <span>
                    <b>{row.name}</b>
                    <em>{row.detail}</em>
                </span>
                <strong>{row.state}</strong>
            </div>
        </div>
    )
}

function PhoneStage({ step }: { step: number }) {
    return (
        <div className="crm crm-phone" data-step={step}>
            <div className="crm-handset">
                {step === 0 && (
                    <div className="crm-screen">
                        <p>Geelong line marking</p>
                        <small>06:00–14:00 · Traffic controller</small>
                        <span className="crm-accept">Accept</span>
                    </div>
                )}
                {step === 1 && (
                    <div className="crm-screen">
                        <p>Docket</p>
                        <small>20:00–04:00 · break 30 min</small>
                        <em className="crm-sign">Signed, Maya Chen</em>
                    </div>
                )}
                {step === 2 && (
                    <div className="crm-screen">
                        <p>No signal</p>
                        <small>Near miss stays on the phone</small>
                        <em className="crm-queue">Queued</em>
                    </div>
                )}
            </div>
        </div>
    )
}

function PayrollStage({ step }: { step: number }) {
    return (
        <div className="crm crm-pay" data-step={step}>
            <p className="crm-kicker">Close-out</p>
            {step === 0 && (
                <div className="crm-file">
                    <b>Hours approved</b>
                    <span>7.5h · Geelong line marking</span>
                </div>
            )}
            {step === 1 && (
                <div className="crm-file">
                    <b>payroll.csv</b>
                    <span>Ordinary and night hours, ready to download</span>
                </div>
            )}
            {step === 2 && (
                <div className="crm-file crm-xero">
                    <IntegrationMark name="Xero" />
                    <span>
                        <b>Draft invoice</b>
                        <em>Approved hours only</em>
                    </span>
                </div>
            )}
        </div>
    )
}

const PLAYS: Play[] = [
    {
        title: 'Drag-and-drop rostering',
        summary: 'Drag a job to another day, or a name onto a slot.',
        to: '/app/board',
        link: 'Open the board',
        steps: ['The job sits on Monday.', 'Drag it across to Wednesday.', 'Drop Maya onto the open slot.'],
        stage: (step) => <BoardStage step={step} />,
    },
    {
        title: 'Skill and ticket checks',
        summary: 'An expired ticket, a long week, or two jobs at once keeps the name off the shift.',
        to: '/app/people',
        link: 'Open people',
        steps: ['An expired ticket is blocked.', 'A long week is blocked too.', 'A clear person can be offered.'],
        stage: (step) => <PeopleStage step={step} />,
    },
    {
        title: 'Field phone',
        summary: 'Accept the shift, sign the docket, and queue a near miss offline.',
        to: '/field',
        link: 'Open the phone',
        steps: ['Accept the shift.', 'Sign the docket.', 'Queue the near miss offline.'],
        stage: (step) => <PhoneStage step={step} />,
    },
    {
        title: 'Payroll and Xero',
        summary: 'Approved hours leave as a payroll file and a Xero draft.',
        to: '/app/integrations',
        link: 'Open integrations',
        steps: ['The office approves the hours.', 'Those hours become a payroll file.', 'Xero receives a draft invoice.'],
        stage: (step) => <PayrollStage step={step} />,
    },
]

function FeaturePlay({ play }: { play: Play }) {
    const { step, setStep, still } = usePlayStep()
    return (
        <article className="card feature-play">
            <div className="play-stage">{play.stage(step)}</div>
            <Dots step={step} steps={play.steps} onStep={setStep} />
            {still ? (
                <ol className="play-still">
                    {play.steps.map((label) => <li key={label}>{label}</li>)}
                </ol>
            ) : (
                <p className="play-caption">{play.steps[step]}</p>
            )}
            <h3>{play.title}</h3>
            <p>{play.summary}</p>
            <Link to={play.to}>{play.link}</Link>
        </article>
    )
}

export function FeaturePlays() {
    return (
        <div className="feature-band">
            {PLAYS.map((play) => <FeaturePlay key={play.title} play={play} />)}
        </div>
    )
}
