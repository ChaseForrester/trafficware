import type { AppState } from '../types.ts'
import { loadPin, savePin } from './grok.ts'

export type CloudPull =
    | { mode: 'cloud'; state: AppState; detail: string }
    | { mode: 'empty' | 'locked' | 'off'; state?: undefined; detail: string }

function valid(state: AppState | null | undefined): state is AppState {
    return Boolean(
        state
        && state.version === 1
        && Array.isArray(state.people)
        && Array.isArray(state.bookings)
        && state.settings
        && Array.isArray(state.integrations),
    )
}

export async function pullYard(pin = loadPin()): Promise<CloudPull> {
    const response = await fetch('/api/yard', {
        headers: pin ? { 'x-trafficware-pin': pin } : {},
    })
    const data = await response.json().catch(() => ({})) as { mode?: string; state?: AppState; detail?: string; error?: string }
    if (response.status === 401) {
        savePin('')
        return { mode: 'locked', detail: data.detail || 'Enter the access code to open the shared yard.' }
    }
    if (data.mode === 'cloud' && valid(data.state)) {
        return { mode: 'cloud', state: data.state, detail: 'Shared yard loaded from Firestore.' }
    }
    if (data.mode === 'empty') return { mode: 'empty', detail: data.detail || 'Firestore has no yard yet.' }
    return { mode: 'off', detail: data.detail || data.error || 'This browser holds the yard.' }
}

export async function pushYard(state: AppState, pin = loadPin()) {
    if (!pin) return
    await fetch('/api/yard', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'x-trafficware-pin': pin,
        },
        body: JSON.stringify({ state }),
    })
}

export type XeroStatus = { configured: boolean; linked: boolean }

export async function xeroStatus(): Promise<XeroStatus> {
    const response = await fetch('/api/xero-status')
    if (!response.ok) return { configured: false, linked: false }
    const data = await response.json() as Partial<XeroStatus>
    return { configured: Boolean(data.configured), linked: Boolean(data.linked) }
}

export async function disconnectXero() {
    await fetch('/api/xero-disconnect', { method: 'POST' })
}

export type XeroInvoice = {
    number: string
    contact: string
    email: string
    hours: number
    amount: number
    description: string
}

export async function pushXero(invoices: XeroInvoice[]) {
    const response = await fetch('/api/xero-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices }),
    })
    const data = await response.json().catch(() => ({})) as { ok?: boolean; numbers?: string[]; error?: string }
    if (!response.ok || !data.ok) throw new Error(data.error || 'Xero did not accept the invoices.')
    return data.numbers ?? []
}
