import type { AppState, Booking, Slot } from '../types.ts'
import { addDays } from './format.ts'
import type { DocketInput, NewBooking } from './mutate.ts'

export type GrokActor = {
    role: 'super-admin' | 'field'
    name: string
    personId: string | null
}

export type GrokAction =
    | { kind: 'assign'; bookingId: string; slotId: string; personId: string }
    | { kind: 'unassign'; bookingId: string; slotId: string }
    | { kind: 'fill'; date: string; depot: string }
    | { kind: 'approve'; date: string }
    | { kind: 'invoice' }
    | { kind: 'open'; input: NewBooking }
    | { kind: 'respond'; bookingId: string; slotId: string; response: 'accepted' | 'declined' }
    | { kind: 'sign'; input: DocketInput }

const OFFICE = new Set(['place_crew', 'take_off_crew', 'fill_open_slots', 'approve_clean_dockets', 'raise_invoices', 'open_job'])
const FIELD = new Set(['accept_my_shift', 'decline_my_shift', 'sign_my_docket'])

function norm(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function text(args: Record<string, unknown>, key: string) {
    const value = args[key]
    return typeof value === 'string' ? value.trim() : ''
}

function asDate(value: string, today: string) {
    const raw = value.trim()
    const lower = raw.toLowerCase()
    if (!lower || lower === 'today') return today
    if (lower === 'tomorrow') return addDays(today, 1)
    if (lower === 'yesterday') return addDays(today, -1)
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
    return ''
}

function matchOne<T>(items: T[], label: (item: T) => string, query: string, noun: string): T | { error: string } {
    const q = norm(query.replace(/\(.*\)/, ''))
    if (!q) return { error: `Name the ${noun}.` }
    const exact = items.filter((item) => norm(label(item)) === q)
    if (exact.length === 1) return exact[0]
    if (exact.length > 1) {
        return { error: `More than one ${noun} matches "${query}": ${exact.slice(0, 5).map(label).join(', ')}.` }
    }
    const partial = items.filter((item) => norm(label(item)).includes(q))
    if (partial.length === 1) return partial[0]
    if (!partial.length) return { error: `No ${noun} matches "${query}".` }
    return { error: `More than one ${noun} matches "${query}": ${partial.slice(0, 5).map(label).join(', ')}.` }
}

function matchJob(state: AppState, today: string, title: string, date: string): Booking | { error: string } {
    const pool = date ? state.bookings.filter((job) => job.date === date) : state.bookings
    const found = matchOne(pool, (job) => job.title, title, 'job')
    if (!('error' in found) || date) return found
    const todayOnly = matchOne(
        state.bookings.filter((job) => job.date === today),
        (job) => job.title,
        title,
        'job',
    )
    return 'error' in todayOnly ? found : todayOnly
}

function roleMatches(slotRole: string, wanted: string) {
    if (!wanted) return true
    const left = norm(slotRole)
    const right = norm(wanted)
    return left === right || left.includes(right) || right.includes(left)
}

function pickOpenSlot(job: Booking, role: string): Slot | { error: string } {
    const open = job.slots.filter((slot) => !slot.personId)
    if (!open.length) return { error: `${job.title} has no open slot.` }
    const matching = role ? open.filter((slot) => roleMatches(slot.role, role)) : open
    if (!matching.length) return { error: `${job.title} has no open ${role} slot.` }
    const roles = [...new Set(matching.map((slot) => slot.role))]
    if (!role && roles.length > 1) return { error: `Which role on ${job.title}? Open roles: ${roles.join(', ')}.` }
    return matching[0]
}

function mySlots(state: AppState, personId: string) {
    return state.bookings.flatMap((booking) =>
        booking.slots
            .filter((slot) => slot.personId === personId)
            .map((slot) => ({ booking, slot })),
    )
}

function describe(items: { booking: Booking; slot: Slot }[]) {
    return items.slice(0, 5).map((item) => `${item.booking.title} (${item.booking.date}, ${item.slot.role})`).join(', ')
}

function hasDocket(state: AppState, bookingId: string, personId: string) {
    return [...state.dockets, ...state.outbox].some(
        (docket) => docket.bookingId === bookingId && docket.personId === personId && docket.status !== 'queried',
    )
}

function officePlan(state: AppState, today: string, name: string, args: Record<string, unknown>): { action: GrokAction } | { error: string } {
    if (name === 'fill_open_slots') {
        const date = asDate(text(args, 'date'), today)
        if (!date) return { error: 'Use a date like 2026-10-24.' }
        const depotRaw = text(args, 'depot')
        if (!depotRaw || norm(depotRaw) === 'all') return { action: { kind: 'fill', date, depot: 'All' } }
        const depot = state.settings.depots.find((item) => norm(item) === norm(depotRaw))
        if (!depot) return { error: `No depot matches "${depotRaw}". Depots: ${state.settings.depots.join(', ')}.` }
        return { action: { kind: 'fill', date, depot } }
    }
    if (name === 'approve_clean_dockets') {
        const date = asDate(text(args, 'date'), today)
        if (!date) return { error: 'Use a date like 2026-10-24.' }
        return { action: { kind: 'approve', date } }
    }
    if (name === 'raise_invoices') return { action: { kind: 'invoice' } }
    if (name === 'open_job') {
        const title = text(args, 'title')
        const clientName = text(args, 'client')
        const date = asDate(text(args, 'date'), today)
        const start = text(args, 'start')
        const end = text(args, 'end')
        const roles = Array.isArray(args.roles)
            ? args.roles.map((role) => String(role).trim()).filter(Boolean)
            : text(args, 'roles').split(',').map((role) => role.trim()).filter(Boolean)
        if (!title) return { error: 'A job needs a name.' }
        if (!date) return { error: 'Use a date like 2026-10-24.' }
        if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return { error: 'Start and end need times like 07:00 and 15:30.' }
        if (!roles.length) return { error: 'Name at least one role, such as Traffic Controller.' }
        const client = matchOne(state.clients, (item) => item.name, clientName, 'client')
        if ('error' in client) return client
        const depotRaw = text(args, 'depot')
        const depot = depotRaw
            ? state.settings.depots.find((item) => norm(item) === norm(depotRaw))
            : state.settings.depots[0]
        if (!depot) return { error: `No depot matches "${depotRaw}". Depots: ${state.settings.depots.join(', ')}.` }
        return {
            action: {
                kind: 'open',
                input: {
                    title,
                    clientId: client.id,
                    site: text(args, 'site'),
                    depot,
                    date,
                    start,
                    end,
                    notes: text(args, 'notes'),
                    roles,
                    vehicleId: null,
                },
            },
        }
    }

    const person = matchOne(state.people, (item) => item.name, text(args, 'person'), 'person')
    if ('error' in person) return person
    const date = text(args, 'date') ? asDate(text(args, 'date'), today) : ''
    if (text(args, 'date') && !date) return { error: 'Use a date like 2026-10-24.' }
    const job = matchJob(state, today, text(args, 'job'), date)
    if ('error' in job) return job
    const role = text(args, 'role')

    if (name === 'take_off_crew') {
        const mine = job.slots.filter((slot) => slot.personId === person.id)
        const matching = role ? mine.filter((slot) => roleMatches(slot.role, role)) : mine
        if (!mine.length) return { error: `${person.name} is not on ${job.title}.` }
        if (!matching.length) return { error: `${person.name} is not on ${job.title} as ${role}.` }
        if (matching.length > 1) return { error: `Which role should come off ${job.title}? ${matching.map((slot) => slot.role).join(', ')}.` }
        return { action: { kind: 'unassign', bookingId: job.id, slotId: matching[0].id } }
    }

    if (job.slots.some((slot) => slot.personId === person.id)) return { error: `${person.name} is already on ${job.title}.` }
    const slot = pickOpenSlot(job, role)
    if ('error' in slot) return slot
    return { action: { kind: 'assign', bookingId: job.id, slotId: slot.id, personId: person.id } }
}

function fieldPlan(state: AppState, today: string, actor: GrokActor, name: string, args: Record<string, unknown>): { action: GrokAction } | { error: string } {
    if (!actor.personId) return { error: 'This crew account is not linked to a person.' }
    const personId = actor.personId
    let mine = mySlots(state, personId)
    const jobName = text(args, 'job')
    const rawDate = text(args, 'date')
    const date = rawDate ? asDate(rawDate, today) : ''
    if (rawDate && !date) return { error: 'Use a date like 2026-10-24.' }
    if (jobName) {
        const job = matchJob(state, today, jobName, date)
        if ('error' in job) return job
        mine = mine.filter((item) => item.booking.id === job.id)
        if (!mine.length) return { error: `You are not on ${job.title}.` }
    }

    if (name === 'sign_my_docket') {
        const ready = mine.filter((item) => item.slot.response === 'accepted' && !hasDocket(state, item.booking.id, personId))
        if (ready.length !== 1) {
            if (!ready.length) return { error: mine.length ? 'Nothing of yours is waiting for a signature. Accept the shift first, or the docket is already in.' : 'You are not on a shift to sign.' }
            return { error: `Which job should be signed? ${describe(ready)}.` }
        }
        const { booking } = ready[0]
        const start = text(args, 'start') || booking.start
        const end = text(args, 'end') || booking.end
        if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return { error: 'Start and end need times like 07:00 and 15:30.' }
        const breakRaw = args.breakMins
        const breakNumber = typeof breakRaw === 'number' ? breakRaw : typeof breakRaw === 'string' ? Number(breakRaw) : NaN
        const breakMins = Number.isFinite(breakNumber) && breakNumber >= 0 && breakNumber <= 240 ? Math.round(breakNumber) : 30
        return {
            action: {
                kind: 'sign',
                input: {
                    bookingId: booking.id,
                    personId,
                    start,
                    end,
                    breakMins,
                    notes: text(args, 'notes'),
                    signedBy: text(args, 'signedBy') || actor.name,
                    nearMiss: text(args, 'nearMiss'),
                    photoName: '',
                },
            },
        }
    }

    const pending = mine.filter((item) => item.slot.response === 'pending')
    if (name === 'accept_my_shift') {
        if (pending.length === 1) {
            return { action: { kind: 'respond', bookingId: pending[0].booking.id, slotId: pending[0].slot.id, response: 'accepted' } }
        }
        if (pending.length > 1) return { error: `Which shift should be accepted? ${describe(pending)}.` }
        if (mine.length) return { error: `Nothing is waiting for an accept. You are already on ${describe(mine)}.` }
        return { error: 'You have no shift waiting to accept.' }
    }

    if (mine.length === 1) {
        return { action: { kind: 'respond', bookingId: mine[0].booking.id, slotId: mine[0].slot.id, response: 'declined' } }
    }
    if (mine.length > 1) return { error: `Which shift should be declined? ${describe(mine)}.` }
    return { error: 'You are not on a shift to decline.' }
}

export function planGrokTool(
    state: AppState,
    today: string,
    actor: GrokActor | null,
    name: string,
    args: Record<string, unknown>,
): { action: GrokAction } | { error: string } {
    if (!actor) return { error: 'Sign in at /start or /join before Grok can change the yard.' }
    if (OFFICE.has(name)) {
        if (actor.role !== 'super-admin') return { error: 'Only a Super Admin can change the board. Sign in at /start.' }
        return officePlan(state, today, name, args)
    }
    if (FIELD.has(name)) {
        if (actor.role !== 'field') return { error: 'Only the signed-in crew member can accept, decline, or sign their own shift.' }
        return fieldPlan(state, today, actor, name, args)
    }
    return { error: `That action is not available for this sign-in.` }
}
