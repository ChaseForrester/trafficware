import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { AppState } from '../types.ts'
import { IconKicker } from './Icons.tsx'
import { currentIdToken, hasStoredAuth } from '../lib/auth.ts'
import { askGrok, grokHealth, loadPin, savePin } from '../lib/grok.ts'
import type { GrokActor, GrokCall, GrokTurn } from '../lib/grok.ts'
import type { GrokAction } from '../lib/grokTools.ts'
import { planGrokTool } from '../lib/grokTools.ts'
import { usePair } from '../lib/pair.tsx'
import { useSession } from '../lib/session.tsx'
import { useStore } from '../lib/store.tsx'
import { yardSnapshot } from '../lib/yardSnapshot.ts'

type GrokValue = {
    configured: boolean | null
    openWith: (message: string) => void
}

const GrokContext = createContext<GrokValue | null>(null)

export function useGrok() {
    const value = useContext(GrokContext)
    if (!value) throw new Error('useGrok must be used inside GrokProvider')
    return value
}

const READ_PROMPTS = [
    { label: 'Brief today', message: 'Give the two of us a morning brief. Start with our own jobs, then open slots, then anything that blocks the day.' },
    { label: 'Who can fill?', message: 'Who can fill the open slots today? Use only the suggestions. List the gaps and why they are blocked.' },
    { label: 'Write close-out', message: 'Write a short close-out note for today from the review. Name blockers first, then what is ready to approve.' },
]

const OFFICE_PROMPTS = [
    ...READ_PROMPTS.slice(0, 2),
    { label: 'Fill open slots', message: "Fill today's open slots with people the rules accept." },
    READ_PROMPTS[2],
]

const FIELD_PROMPTS = [
    { label: 'What am I on?', message: 'What jobs am I on? Say which ones I still need to accept or sign.' },
    { label: 'Accept my shift', message: 'Accept my next shift.' },
    { label: 'Sign my docket', message: 'Sign my docket in my own name.' },
]

function runCall(
    store: ReturnType<typeof useStore>,
    working: AppState,
    today: string,
    actor: GrokActor | null,
    call: GrokCall,
) {
    let args: Record<string, unknown> = {}
    try {
        const parsed = JSON.parse(call.arguments || '{}') as unknown
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { output: 'Those details were not valid.', state: working }
        }
        args = parsed as Record<string, unknown>
    } catch {
        return { output: 'Those details were not valid.', state: working }
    }
    const plan = planGrokTool(working, today, actor, call.name, args)
    if ('error' in plan) return { output: plan.error, state: working }
    const result = runGrokAction(store, plan.action)
    return { output: result.notice, state: result.state }
}

function runGrokAction(store: ReturnType<typeof useStore>, action: GrokAction) {
    switch (action.kind) {
        case 'assign':
            return store.assignPerson(action.bookingId, action.slotId, action.personId)
        case 'unassign':
            return store.unassignPerson(action.bookingId, action.slotId)
        case 'fill':
            return store.applySuggestions(action.date, action.depot)
        case 'approve':
            return store.approveClean(action.date)
        case 'invoice':
            return store.createInvoices()
        case 'open':
            return store.createBooking(action.input)
        case 'respond':
            return store.respond(action.bookingId, action.slotId, action.response)
        case 'sign':
            return store.submitDocket(action.input)
    }
}

export function GrokProvider({ children }: { children: ReactNode }) {
    const store = useStore()
    const { state, today } = store
    const { session } = useSession()
    const pair = usePair()
    const location = useLocation()
    const [open, setOpen] = useState(false)
    const [configured, setConfigured] = useState<boolean | null>(null)
    const [locked, setLocked] = useState(false)
    const [pin, setPin] = useState(loadPin)
    const [draftPin, setDraftPin] = useState('')
    const [turns, setTurns] = useState<GrokTurn[]>([])
    const [draft, setDraft] = useState('')
    const [pending, setPending] = useState(false)
    const [acting, setActing] = useState(false)
    const [error, setError] = useState('')
    const scroller = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let gone = false
        grokHealth()
            .then((health) => {
                if (gone) return
                setConfigured(health.configured)
                setLocked(health.locked)
            })
            .catch(() => {
                if (!gone) setConfigured(false)
            })
        return () => {
            gone = true
        }
    }, [])

    useEffect(() => {
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
    }, [turns, pending, open])

    async function send(message: string) {
        const text = message.trim()
        if (!text || pending) return
        const history = turns
        setTurns((current) => [...current, { role: 'user', content: text }])
        setDraft('')
        setError('')
        setPending(true)
        setOpen(true)
        try {
            const idToken = await currentIdToken()
            const snapshot = yardSnapshot(
                state,
                today,
                {
                    primary: pair.primary?.name,
                    partner: pair.partner?.name,
                    holder: pair.holder?.name,
                },
                session ? { role: session.role, name: session.personName } : null,
            )
            let reply = await askGrok({ message: text, history, pin, snapshot, idToken })
            let working = state
            let rounds = 0
            let answer = ''
            while (reply.calls.length && rounds < 3) {
                rounds += 1
                setActing(true)
                const results: { call_id: string; output: string }[] = []
                for (const call of reply.calls) {
                    const step = runCall(store, working, today, reply.actor, call)
                    working = step.state
                    results.push({ call_id: call.call_id, output: step.output })
                }
                const notes = results.map((item) => item.output).filter(Boolean).join(' ')
                if (rounds >= 3) {
                    answer = [reply.text, notes].filter(Boolean).join(' ')
                    break
                }
                try {
                    reply = await askGrok({
                        message: text,
                        history,
                        pin,
                        snapshot,
                        idToken,
                        followUp: { calls: reply.calls, results },
                    })
                } catch (err) {
                    const detail = err instanceof Error ? err.message : 'Grok did not answer.'
                    answer = [notes, detail].filter(Boolean).join(' ')
                    break
                }
            }
            setTurns((current) => [...current, { role: 'assistant', content: answer || reply.text || 'Done.' }])
        } catch (err) {
            const messageText = err instanceof Error ? err.message : 'Grok did not answer.'
            setError(messageText)
            if (messageText.toLowerCase().includes('access code')) setPin('')
        } finally {
            setPending(false)
            setActing(false)
        }
    }

    const inApp = location.pathname.startsWith('/app') || location.pathname.startsWith('/field') || location.pathname.startsWith('/docket')
    const needsPin = locked && !pin
    const armed = Boolean(session?.email) && hasStoredAuth()
    const prompts = session?.role === 'field' && armed
        ? FIELD_PROMPTS
        : session?.role === 'super-admin' && armed
            ? OFFICE_PROMPTS
            : READ_PROMPTS
    const status = configured === null
        ? 'Checking Grok…'
        : configured === false
            ? 'Grok is not configured on the server yet.'
            : armed && session?.role === 'super-admin'
                ? 'Super Admin. Grok can place crew, fill open slots, approve clean dockets, raise invoices, and open a job when you ask.'
                : armed && session?.role === 'field'
                    ? `${session.personName}. Grok can accept, decline, or sign only your shifts.`
                    : session?.email
                        ? 'Signed in on this browser. Sign in again before Grok can change the board.'
                        : 'Live on this yard. Sign in at Start or Join before Grok can change the board.'

    const value: GrokValue = {
        configured,
        openWith: (message) => {
            setOpen(true)
            if (!needsPin) void send(message)
        },
    }

    return (
        <GrokContext.Provider value={value}>
            {children}
            {inApp && (
                <button type="button" className="grok-fab" onClick={() => setOpen(true)}>
                    Ask Grok
                </button>
            )}
            {open && (
                <div className="sheet-back" onClick={() => setOpen(false)}>
                    <section
                        className="grok-sheet"
                        role="dialog"
                        aria-labelledby="grok-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <header className="grok-head">
                            <div>
                                <IconKicker name="xai">Grok</IconKicker>
                                <h2 id="grok-title">Ask the yard</h2>
                            </div>
                            <button type="button" className="btn btn-ghost btn-small" onClick={() => setOpen(false)}>Close</button>
                        </header>
                        <p className="muted grok-status">{status}</p>
                        {needsPin ? (
                            <form
                                className="form"
                                onSubmit={(event: FormEvent) => {
                                    event.preventDefault()
                                    savePin(draftPin.trim())
                                    setPin(draftPin.trim())
                                }}
                            >
                                <label className="field">
                                    Access code
                                    <input value={draftPin} onChange={(event) => setDraftPin(event.target.value)} autoComplete="off" />
                                </label>
                                <button type="submit" className="btn btn-primary">Unlock Grok</button>
                            </form>
                        ) : (
                            <>
                                <div className="grok-prompts">
                                    {prompts.map((prompt) => (
                                        <button key={prompt.label} type="button" className="chip-btn" disabled={pending || configured === false} onClick={() => void send(prompt.message)}>
                                            {prompt.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="grok-log" ref={scroller}>
                                    {turns.map((turn, index) => (
                                        <p key={`${turn.role}-${index}`} className={turn.role === 'user' ? 'grok-you' : 'grok-them'}>
                                            {turn.content}
                                        </p>
                                    ))}
                                    {pending && <p className="grok-them">{acting ? 'Changing the yard…' : 'Looking at the yard…'}</p>}
                                    {!turns.length && !pending && <p className="muted">Ask who is on, who can fill a slot, or for the close-out note. A signed-in account can also ask Grok to change the board.</p>}
                                </div>
                                {error && <p className="grok-error">{error}</p>}
                                <form
                                    className="grok-compose"
                                    onSubmit={(event: FormEvent) => {
                                        event.preventDefault()
                                        void send(draft)
                                    }}
                                >
                                    <label className="field">
                                        <span className="sr">Message</span>
                                        <input
                                            value={draft}
                                            onChange={(event) => setDraft(event.target.value)}
                                            placeholder="Ask about today"
                                            disabled={configured === false}
                                        />
                                    </label>
                                    <button type="submit" className="btn btn-primary" disabled={pending || configured === false || !draft.trim()}>
                                        Send
                                    </button>
                                </form>
                            </>
                        )}
                    </section>
                </div>
            )}
        </GrokContext.Provider>
    )
}
