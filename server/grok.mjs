import { verifyIdToken } from './auth.mjs'

const MODEL = 'grok-4.7'
const ENDPOINT = 'https://api.x.ai/v1/responses'

const SYSTEM = `You are the yard assistant inside Trafficware, a shared app for two people who run a traffic crew.
Speak in short plain sentences. Use only the yard snapshot and the message. Do not invent people, tickets, jobs, or hours.
The rules engine blocks illegal roster moves. When a tool result is a block, report it and stop. Never tell them to override a block.
Use names, job titles, and roles exactly as they appear in the snapshot. Skip email addresses, phone numbers, and pay rates.
Keep a brief under 120 words. After you change the yard, say what changed in one or two sentences.`

const OFFICE_TOOLS = [
    tool(
        'place_crew',
        'Place a person on an open slot. Use this when the Super Admin asks to add or roster someone. The rules engine may refuse.',
        {
            person: { type: 'string', description: 'Person name from the snapshot.' },
            job: { type: 'string', description: 'Job title from the snapshot.' },
            role: { type: 'string', description: 'Slot role, such as Traffic Controller. Omit if the job has only one kind of open slot.' },
            date: { type: 'string', description: 'YYYY-MM-DD when more than one job shares the title. Omit for today.' },
        },
        ['person', 'job'],
    ),
    tool(
        'take_off_crew',
        'Take a person off a job when the Super Admin asks to remove them.',
        {
            person: { type: 'string', description: 'Person name from the snapshot.' },
            job: { type: 'string', description: 'Job title from the snapshot.' },
            role: { type: 'string', description: 'Slot role, if they hold more than one on that job.' },
            date: { type: 'string', description: 'YYYY-MM-DD when more than one job shares the title.' },
        },
        ['person', 'job'],
    ),
    tool(
        'fill_open_slots',
        'Run the roster bot on empty slots for a date. It only places people the rules accept.',
        {
            date: { type: 'string', description: 'YYYY-MM-DD. Omit for today.' },
            depot: { type: 'string', description: 'Depot name, or All. Omit for All.' },
        },
        [],
    ),
    tool(
        'approve_clean_dockets',
        'Approve submitted dockets whose hours match the roster and that already have a signature.',
        {
            date: { type: 'string', description: 'YYYY-MM-DD. Omit for today.' },
        },
        [],
    ),
    tool('raise_invoices', 'Raise invoices for approved jobs that are not invoiced yet.', {}, []),
    tool(
        'open_job',
        'Open a new job on the board when the Super Admin asks for a new booking.',
        {
            title: { type: 'string', description: 'Job name.' },
            client: { type: 'string', description: 'Client name from the snapshot.' },
            site: { type: 'string', description: 'Site address.' },
            depot: { type: 'string', description: 'Depot name from the snapshot.' },
            date: { type: 'string', description: 'YYYY-MM-DD.' },
            start: { type: 'string', description: 'Start time HH:MM.' },
            end: { type: 'string', description: 'End time HH:MM.' },
            roles: { type: 'array', items: { type: 'string' }, description: 'One role name per slot, such as Traffic Controller.' },
            notes: { type: 'string', description: 'Short site note.' },
        },
        ['title', 'client', 'date', 'start', 'end', 'roles'],
    ),
]

const FIELD_TOOLS = [
    tool(
        'accept_my_shift',
        'Accept the signed-in crew member\'s own pending shift. Never accept a shift for someone else.',
        {
            job: { type: 'string', description: 'Job title. Omit when they have only one pending shift.' },
            date: { type: 'string', description: 'YYYY-MM-DD when more than one job shares the title.' },
        },
        [],
    ),
    tool(
        'decline_my_shift',
        'Decline the signed-in crew member\'s own shift and open the slot again.',
        {
            job: { type: 'string', description: 'Job title. Omit when they are on only one shift.' },
            date: { type: 'string', description: 'YYYY-MM-DD when more than one job shares the title.' },
        },
        [],
    ),
    tool(
        'sign_my_docket',
        'Sign and submit the signed-in crew member\'s own docket. The signature is their name.',
        {
            job: { type: 'string', description: 'Job title. Omit when only one of their shifts needs a signature.' },
            date: { type: 'string', description: 'YYYY-MM-DD when more than one job shares the title.' },
            signedBy: { type: 'string', description: 'Their own name.' },
            start: { type: 'string', description: 'Actual start HH:MM. Omit to use the rostered start.' },
            end: { type: 'string', description: 'Actual end HH:MM. Omit to use the rostered end.' },
            breakMins: { type: 'number', description: 'Unpaid break in minutes. Omit for 30.' },
            notes: { type: 'string', description: 'Short note about the shift.' },
            nearMiss: { type: 'string', description: 'Near miss, or leave empty.' },
        },
        [],
    ),
]

function tool(name, description, properties, required) {
    return {
        type: 'function',
        name,
        description,
        parameters: {
            type: 'object',
            properties,
            required,
            additionalProperties: false,
        },
    }
}

export function toolsForActor(actor) {
    if (actor?.role === 'super-admin') return OFFICE_TOOLS
    if (actor?.role === 'field') return FIELD_TOOLS
    return []
}

export class GrokError extends Error {
    constructor(message, status = 500) {
        super(message)
        this.status = status
    }
}

export function grokStatus(apiKey, pin) {
    return { configured: Boolean(apiKey), locked: Boolean(pin) }
}

function clip(value, max) {
    const textValue = typeof value === 'string' ? value : ''
    return textValue.slice(0, max)
}

function cleanId(value) {
    const id = String(value || '').slice(0, 80)
    return /^[\w-]+$/.test(id) ? id : ''
}

function systemFor(actor) {
    if (!actor) {
        return `${SYSTEM}\n\nNo one is signed in. You cannot change the yard. If they ask you to change it, tell them to sign in at /start for the office or /join for the crew.`
    }
    if (actor.role === 'super-admin') {
        return `${SYSTEM}\n\nThe signed-in person is a Super Admin named ${actor.name}. Call a tool only when they ask you to change the yard. You can place crew, take crew off, fill open slots, approve clean dockets, raise invoices, and open a job.`
    }
    return `${SYSTEM}\n\nThe signed-in person is ${actor.name}, on the crew. You may only accept, decline, or sign their own shift. Do not place other people, approve other dockets, or raise invoices.`
}

async function actorFrom(token) {
    if (!token || typeof token !== 'string') return null
    try {
        const session = await verifyIdToken(token)
        return {
            role: session.role,
            name: session.personName,
            personId: session.personId,
        }
    } catch {
        return null
    }
}

function snapshotFor(body, actor) {
    const raw = body?.snapshot && typeof body.snapshot === 'object' && !Array.isArray(body.snapshot) ? body.snapshot : {}
    const rest = { ...raw }
    delete rest.actor
    return {
        actor: actor ? { role: actor.role, name: actor.name } : null,
        ...rest,
    }
}

function followUpItems(body, allowed) {
    const rawCalls = Array.isArray(body?.followUp?.calls) ? body.followUp.calls.slice(0, 6) : []
    const rawResults = Array.isArray(body?.followUp?.results) ? body.followUp.results.slice(0, 6) : []
    const results = new Map()
    for (const item of rawResults) {
        const id = cleanId(item?.call_id)
        if (!id) continue
        const output = typeof item?.output === 'string' ? item.output : ''
        results.set(id, clip(output, 2000) || 'No result.')
    }
    const items = []
    for (const item of rawCalls) {
        const id = cleanId(item?.call_id)
        const name = typeof item?.name === 'string' ? item.name : ''
        if (!id || !allowed.has(name)) continue
        const args = clip(typeof item.arguments === 'string' ? item.arguments : JSON.stringify(item?.arguments ?? {}), 4000)
        items.push({ type: 'function_call', call_id: id, name, arguments: args || '{}' })
        items.push({ type: 'function_call_output', call_id: id, output: results.get(id) || 'No result.' })
    }
    return items
}

function readCalls(data, allowed) {
    const calls = []
    for (const item of data?.output ?? []) {
        if (item?.type !== 'function_call') continue
        const id = cleanId(item.call_id || item.id)
        const name = typeof item.name === 'string' ? item.name : ''
        if (!id || !allowed.has(name)) continue
        const args = typeof item.arguments === 'string' ? item.arguments : JSON.stringify(item.arguments ?? {})
        calls.push({ call_id: id, name, arguments: clip(args, 4000) || '{}' })
    }
    return calls
}

function readText(data) {
    if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim()
    const parts = []
    for (const item of data?.output ?? []) {
        for (const block of item?.content ?? []) {
            if (block?.type === 'output_text' && block.text) parts.push(block.text)
            else if (item?.type === 'message' && typeof block?.text === 'string' && block.text) parts.push(block.text)
        }
    }
    return parts.join('\n').trim()
}

export async function handleGrok(body, apiKey, pin, givenPin) {
    if (!apiKey) {
        throw new GrokError('Grok is not configured on the server.', 503)
    }
    if (pin && givenPin !== pin) {
        throw new GrokError('That access code is not right.', 401)
    }
    if (!body || typeof body !== 'object') {
        throw new GrokError('Missing request.', 400)
    }

    const message = clip(body.message, 4000).trim()
    if (!message) throw new GrokError('Ask something first.', 400)

    const actor = await actorFrom(body.idToken)
    const tools = toolsForActor(actor)
    const allowed = new Set(tools.map((item) => item.name))
    const history = Array.isArray(body.history) ? body.history.slice(-8) : []
    const snapshot = clip(JSON.stringify(snapshotFor(body, actor)), 14000)
    const turns = history
        .map((turn) => {
            const role = turn?.role === 'assistant' ? 'assistant' : turn?.role === 'user' ? 'user' : null
            const content = clip(turn?.content, 2000).trim()
            if (!role || !content) return null
            return { role, content }
        })
        .filter(Boolean)

    const input = [
        { role: 'system', content: `${systemFor(actor)}\n\nYard snapshot:\n${snapshot}` },
        ...turns,
        { role: 'user', content: message },
        ...followUpItems(body, allowed),
    ]

    const payload = {
        model: MODEL,
        store: false,
        input,
    }
    if (tools.length) payload.tools = tools

    const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(55000),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
        const detail = data?.error?.message || data?.error || response.statusText || 'Grok request failed'
        throw new GrokError(typeof detail === 'string' ? detail : 'Grok request failed', response.status)
    }

    const calls = readCalls(data, allowed)
    const text = readText(data)
    if (!text && !calls.length) throw new GrokError('Grok returned an empty answer.', 502)
    return { text, calls, actor }
}
