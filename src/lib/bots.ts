import type { AppState, Gap, Suggestion } from '../types.ts'
import { round1, shiftHours } from './format.ts'
import {
    findPerson,
    projectedWeekHours,
    slotIssues,
    statusFor,
    validateAssignment,
    vehicleIssues,
    findVehicle,
} from './rules.ts'

export type CloseoutItem = {
    level: 'ok' | 'warn' | 'bad'
    bookingId: string
    message: string
}

const ROLE_ORDER: Record<string, number> = {
    'Team Leader': 0,
    'TMA Operator': 1,
    'Traffic Controller': 2,
}

function scorePerson(state: AppState, personId: string, bookingId: string, warns: number) {
    const booking = state.bookings.find((item) => item.id === bookingId)
    const person = findPerson(state, personId)
    if (!booking || !person) return 0
    let score = 0
    if (person.depot === booking.depot) score += 40
    const hours = projectedWeekHours(state, person.id, booking)
    score += Math.max(0, 28 - hours / 2)
    if (warns) score -= 12
    const title = person.title.toLowerCase()
    if (title.includes('leader') && booking.slots.some((slot) => slot.role === 'Team Leader')) score += 4
    return score
}

export function rosterPlan(state: AppState, date: string, depot: string) {
    const working: AppState = {
        ...state,
        bookings: state.bookings.map((booking) => ({
            ...booking,
            slots: booking.slots.map((slot) => ({ ...slot })),
        })),
    }
    const suggestions: Suggestion[] = []
    const gaps: Gap[] = []
    const bookings = working.bookings
        .filter((booking) => booking.date === date && (depot === 'All' || booking.depot === depot))
        .filter((booking) => !booking.invoiceId && statusFor(working, booking) !== 'approved' && statusFor(working, booking) !== 'submitted')
        .sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title))

    for (const booking of bookings) {
        const slots = [...booking.slots].sort(
            (a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9),
        )
        for (const slot of slots) {
            if (slot.personId) continue
            let best: { personId: string; score: number; reason: string } | null = null
            let closest: { name: string; message: string; score: number } | null = null
            for (const person of working.people) {
                const issues = validateAssignment(working, booking, slot, person)
                const blocks = issues.filter((issue) => issue.level === 'block')
                const warns = issues.filter((issue) => issue.level === 'warn')
                const score = scorePerson(working, person.id, booking.id, warns.length)
                if (blocks.length) {
                    const closeness = score - blocks.length * 5
                    if (!closest || closeness > closest.score) {
                        closest = { name: person.name, message: blocks[0].message, score: closeness }
                    }
                    continue
                }
                const reasonParts = [
                    person.depot === booking.depot ? `${person.depot} depot` : `${person.depot} depot, sent across`,
                    warns[0]?.message ?? 'tickets current',
                    `${round1(projectedWeekHours(working, person.id, booking))}h in the last 7 days`,
                ]
                if (!best || score > best.score) {
                    best = { personId: person.id, score, reason: reasonParts.join(' · ') }
                }
            }
            if (best) {
                suggestions.push({
                    bookingId: booking.id,
                    slotId: slot.id,
                    personId: best.personId,
                    score: best.score,
                    reason: best.reason,
                })
                const target = working.bookings.find((item) => item.id === booking.id)
                const targetSlot = target?.slots.find((item) => item.id === slot.id)
                if (targetSlot) {
                    targetSlot.personId = best.personId
                    targetSlot.response = 'pending'
                }
            } else {
                gaps.push({
                    bookingId: booking.id,
                    slotId: slot.id,
                    role: slot.role,
                    bookingTitle: booking.title,
                    reason: closest
                        ? `${closest.name} is the closest fit. ${closest.message}`
                        : 'No one in the company holds this ticket.',
                })
            }
        }
    }

    return { suggestions, gaps }
}

export function closeoutReview(state: AppState, date: string): CloseoutItem[] {
    const items: CloseoutItem[] = []
    const bookings = state.bookings.filter((booking) => booking.date === date)
    if (!bookings.length) {
        return [{ level: 'ok', bookingId: '', message: 'No jobs on this day.' }]
    }
    for (const booking of bookings) {
        for (const slot of booking.slots) {
            if (!slot.personId) {
                items.push({
                    level: 'warn',
                    bookingId: booking.id,
                    message: `${booking.title} still has an empty ${slot.role} slot.`,
                })
                continue
            }
            const person = findPerson(state, slot.personId)
            const name = person?.name ?? 'Crew'
            const issues = slotIssues(state, booking, slot)
            for (const issue of issues) {
                items.push({
                    level: issue.level === 'block' ? 'bad' : 'warn',
                    bookingId: booking.id,
                    message: `${booking.title}: ${issue.message}`,
                })
            }
            if (slot.response === 'pending') {
                items.push({
                    level: 'warn',
                    bookingId: booking.id,
                    message: `${name} has not accepted ${booking.title}.`,
                })
            }
            if (slot.response === 'declined') {
                items.push({
                    level: 'bad',
                    bookingId: booking.id,
                    message: `${name} declined ${booking.title}.`,
                })
            }
            const docket =
                state.dockets.find((item) => item.bookingId === booking.id && item.personId === slot.personId) ??
                state.outbox.find((item) => item.bookingId === booking.id && item.personId === slot.personId)
            if (!docket) {
                items.push({
                    level: 'warn',
                    bookingId: booking.id,
                    message: `${name} has no docket for ${booking.title}.`,
                })
                continue
            }
            if (docket.status === 'queued') {
                items.push({
                    level: 'warn',
                    bookingId: booking.id,
                    message: `${name}'s docket is still in the field outbox.`,
                })
            }
            if (!docket.signedBy) {
                items.push({
                    level: 'bad',
                    bookingId: booking.id,
                    message: `${name}'s docket has no signature.`,
                })
            }
            const rostered = shiftHours(booking.start, booking.end)
            const actual = shiftHours(docket.start, docket.end)
            if (Math.abs(actual - rostered) > 0.5) {
                items.push({
                    level: 'warn',
                    bookingId: booking.id,
                    message: `${name} docketed ${round1(actual)}h against a ${round1(rostered)}h roster on ${booking.title}.`,
                })
            }
            if (docket.nearMiss) {
                items.push({
                    level: 'warn',
                    bookingId: booking.id,
                    message: `Near miss from ${name} on ${booking.title}: ${docket.nearMiss}`,
                })
            }
            if (docket.status === 'queried') {
                items.push({
                    level: 'bad',
                    bookingId: booking.id,
                    message: `${name}'s docket was queried. ${docket.queryNote}`,
                })
            }
            if (docket.status === 'approved') {
                items.push({
                    level: 'ok',
                    bookingId: booking.id,
                    message: `${name}'s docket on ${booking.title} is approved.`,
                })
            }
        }
        if (booking.vehicleId) {
            const vehicle = findVehicle(state, booking.vehicleId)
            if (vehicle) {
                for (const issue of vehicleIssues(state, booking, vehicle)) {
                    items.push({
                        level: issue.level === 'block' ? 'bad' : 'warn',
                        bookingId: booking.id,
                        message: issue.message,
                    })
                }
            }
        }
    }
    if (!items.length) {
        items.push({ level: 'ok', bookingId: '', message: 'Nothing to review.' })
    }
    return items
}

export type PayrollRow = {
    personId: string
    name: string
    email: string
    date: string
    site: string
    start: string
    end: string
    breakMins: number
    hours: number
    rateType: string
    rate: number
    gross: number
    docketId: string
}

export function payrollRows(state: AppState, date?: string): PayrollRow[] {
    const rows: PayrollRow[] = []
    for (const docket of state.dockets) {
        if (docket.status !== 'approved') continue
        const booking = state.bookings.find((item) => item.id === docket.bookingId)
        const person = findPerson(state, docket.personId)
        if (!booking || !person) continue
        if (date && booking.date !== date) continue
        const rateType = rateKindSafe(booking.date, docket.start, docket.end)
        const rate =
            rateType === 'night' ? person.nightRate : rateType === 'weekend' ? person.weekendRate : person.ordinaryRate
        const hours = Math.max(0, shiftHours(docket.start, docket.end) - docket.breakMins / 60)
        rows.push({
            personId: person.id,
            name: person.name,
            email: person.email,
            date: booking.date,
            site: booking.site,
            start: docket.start,
            end: docket.end,
            breakMins: docket.breakMins,
            hours: round1(hours),
            rateType,
            rate,
            gross: round1(hours * rate),
            docketId: docket.id,
        })
    }
    return rows.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
}

function rateKindSafe(date: string, start: string, end: string) {
    const day = new Date(`${date}T12:00:00`).getDay()
    if (day === 0 || day === 6) return 'weekend'
    if (start >= '18:00' || end <= '06:00' || end <= start) return 'night'
    return 'ordinary'
}

export type InvoiceDraft = {
    clientId: string
    clientName: string
    email: string
    bookingIds: string[]
    hours: number
    wages: number
    amount: number
    lines: string[]
}

export function invoiceDrafts(state: AppState): InvoiceDraft[] {
    const grouped = new Map<string, InvoiceDraft>()
    for (const booking of state.bookings) {
        if (booking.invoiceId) continue
        if (statusFor(state, booking) !== 'approved') continue
        const client = state.clients.find((item) => item.id === booking.clientId)
        if (!client) continue
        const dockets = state.dockets.filter(
            (docket) => docket.bookingId === booking.id && docket.status === 'approved',
        )
        const hours = dockets.reduce(
            (sum, docket) => sum + Math.max(0, shiftHours(docket.start, docket.end) - docket.breakMins / 60),
            0,
        )
        const wages = dockets.reduce((sum, docket) => {
            const person = findPerson(state, docket.personId)
            if (!person) return sum
            const kind = rateKindSafe(booking.date, docket.start, docket.end)
            const rate = kind === 'night' ? person.nightRate : kind === 'weekend' ? person.weekendRate : person.ordinaryRate
            const paid = Math.max(0, shiftHours(docket.start, docket.end) - docket.breakMins / 60)
            return sum + paid * rate
        }, 0)
        const current = grouped.get(client.id) ?? {
            clientId: client.id,
            clientName: client.name,
            email: client.email,
            bookingIds: [],
            hours: 0,
            wages: 0,
            amount: 0,
            lines: [],
        }
        current.bookingIds.push(booking.id)
        current.hours += hours
        current.wages += wages
        current.amount += hours * client.billingRate
        current.lines.push(`${booking.date} ${booking.title} · ${booking.site}`)
        grouped.set(client.id, current)
    }
    return [...grouped.values()].map((draft) => ({
        ...draft,
        hours: round1(draft.hours),
        wages: round1(draft.wages),
        amount: round1(draft.amount),
    }))
}

export type AlertItem = {
    id: string
    tone: 'ok' | 'warn' | 'bad'
    title: string
    detail: string
    href: string
}

export function buildAlerts(state: AppState, today: string): AlertItem[] {
    const alerts: AlertItem[] = []
    const horizon = addDaysSafe(today, state.settings.expiryWarningDays)
    for (const person of state.people) {
        for (const skill of person.skills) {
            if (skill.expires < today) {
                alerts.push({
                    id: `exp-${person.id}-${skill.id}`,
                    tone: 'bad',
                    title: `${person.name} · ${skill.name} expired`,
                    detail: `Expired ${skill.expires}. They cannot be rostered on this ticket.`,
                    href: `/app/people/${person.id}`,
                })
            } else if (skill.expires <= horizon) {
                alerts.push({
                    id: `soon-${person.id}-${skill.id}`,
                    tone: 'warn',
                    title: `${person.name} · ${skill.name} expiring`,
                    detail: `Expires ${skill.expires}.`,
                    href: `/app/people/${person.id}`,
                })
            }
        }
        if (person.status === 'onboarding') {
            const done = person.onboarding.filter((item) => item.done).length
            alerts.push({
                id: `onb-${person.id}`,
                tone: 'warn',
                title: `${person.name} is onboarding`,
                detail: `${done} of ${person.onboarding.length} checks done.`,
                href: `/app/people/${person.id}`,
            })
        }
    }
    for (const booking of state.bookings) {
        if (booking.date < today || booking.date > addDaysSafe(today, 1)) continue
        for (const slot of booking.slots) {
            if (!slot.personId) {
                alerts.push({
                    id: `open-${slot.id}`,
                    tone: 'warn',
                    title: `${booking.title} needs a ${slot.role}`,
                    detail: `${booking.date} · ${booking.start}–${booking.end}`,
                    href: '/app/board',
                })
                continue
            }
            for (const issue of slotIssues(state, booking, slot)) {
                alerts.push({
                    id: `slot-${slot.id}-${issue.code}`,
                    tone: issue.level === 'block' ? 'bad' : 'warn',
                    title: booking.title,
                    detail: issue.message,
                    href: '/app/board',
                })
            }
        }
    }
    for (const vehicle of state.vehicles) {
        if (vehicle.regoExpires <= horizon) {
            alerts.push({
                id: `rego-${vehicle.id}`,
                tone: vehicle.regoExpires < today ? 'bad' : 'warn',
                title: `${vehicle.name} rego`,
                detail: `Expires ${vehicle.regoExpires}.`,
                href: '/app/fleet',
            })
        }
        if (vehicle.nextService <= addDaysSafe(today, 21)) {
            alerts.push({
                id: `svc-${vehicle.id}`,
                tone: 'warn',
                title: `${vehicle.name} service`,
                detail: `Due ${vehicle.nextService}.`,
                href: '/app/fleet',
            })
        }
    }
    if (state.outbox.length) {
        alerts.push({
            id: 'outbox',
            tone: 'warn',
            title: `${state.outbox.length} field docket${state.outbox.length === 1 ? '' : 's'} waiting`,
            detail: state.offline ? 'The field app is offline.' : 'Field Sync can push them now.',
            href: '/field',
        })
    }
    const queuedNotes = state.safetyNotes.filter((note) => note.status === 'queued').length
    if (queuedNotes) {
        alerts.push({
            id: 'safety-queue',
            tone: 'warn',
            title: `${queuedNotes} near miss${queuedNotes === 1 ? '' : 'es'} not synced`,
            detail: 'They stay on the phone until Field Sync runs.',
            href: '/field',
        })
    }
    return alerts
}

function addDaysSafe(iso: string, days: number) {
    const date = new Date(`${iso}T12:00:00`)
    date.setDate(date.getDate() + days)
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 10)
}
