export type GrokTurn = { role: 'user' | 'assistant'; content: string }

export type GrokCall = { call_id: string; name: string; arguments: string }

export type GrokActor = {
    role: 'super-admin' | 'field'
    name: string
    personId: string | null
}

export type GrokReply = {
    text: string
    calls: GrokCall[]
    actor: GrokActor | null
}

const PIN_KEY = 'trafficware.pin'

export function loadPin() {
    return sessionStorage.getItem(PIN_KEY) ?? ''
}

export function savePin(pin: string) {
    if (pin) sessionStorage.setItem(PIN_KEY, pin)
    else sessionStorage.removeItem(PIN_KEY)
}

export type GrokHealth = { configured: boolean; locked: boolean }

export async function grokHealth(): Promise<GrokHealth> {
    const response = await fetch('/api/grok')
    if (!response.ok) return { configured: false, locked: false }
    const data = (await response.json()) as Partial<GrokHealth>
    return { configured: Boolean(data.configured), locked: Boolean(data.locked) }
}

function readActor(value: unknown): GrokActor | null {
    if (!value || typeof value !== 'object') return null
    const actor = value as Partial<GrokActor>
    if (actor.role !== 'super-admin' && actor.role !== 'field') return null
    if (typeof actor.name !== 'string' || !actor.name) return null
    const personId = actor.role === 'field' && typeof actor.personId === 'string' ? actor.personId : null
    if (actor.role === 'field' && !personId) return null
    return { role: actor.role, name: actor.name, personId }
}

export async function askGrok(input: {
    message: string
    history: GrokTurn[]
    snapshot: unknown
    pin: string
    idToken?: string
    followUp?: { calls: GrokCall[]; results: { call_id: string; output: string }[] }
}): Promise<GrokReply> {
    const response = await fetch('/api/grok', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(input.pin ? { 'x-trafficware-pin': input.pin } : {}),
        },
        body: JSON.stringify({
            message: input.message,
            history: input.history,
            snapshot: input.snapshot,
            idToken: input.idToken || undefined,
            followUp: input.followUp,
        }),
    })
    const data = (await response.json().catch(() => ({}))) as {
        text?: string
        calls?: GrokCall[]
        actor?: unknown
        error?: string
    }
    if (response.status === 401) {
        savePin('')
        throw new Error(data.error || 'That access code is not right.')
    }
    const calls = Array.isArray(data.calls)
        ? data.calls.filter((call) => call && typeof call.call_id === 'string' && typeof call.name === 'string')
        : []
    const text = typeof data.text === 'string' ? data.text : ''
    if (!response.ok || (!text && !calls.length)) throw new Error(data.error || 'Grok did not answer.')
    return { text, calls, actor: readActor(data.actor) }
}
