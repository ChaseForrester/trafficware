import type { AppState, Booking, Issue, Person, Slot, Vehicle } from '../types.ts'
import { addDays, intervalMs, rangesOverlap, round1, shiftHours } from './format.ts'

export function findPerson(state: AppState, id: string | null) {
    return state.people.find((person) => person.id === id) ?? null
}

export function findBooking(state: AppState, id: string) {
    return state.bookings.find((booking) => booking.id === id) ?? null
}

export function findClient(state: AppState, id: string) {
    return state.clients.find((client) => client.id === id) ?? null
}

export function findVehicle(state: AppState, id: string | null) {
    return state.vehicles.find((vehicle) => vehicle.id === id) ?? null
}

export function weekHours(state: AppState, personId: string, focusDate: string) {
    const person = findPerson(state, personId)
    if (!person) return 0
    const start = addDays(focusDate, -6)
    const prior = person.priorHours
        .filter((entry) => entry.date >= start && entry.date <= focusDate)
        .reduce((sum, entry) => sum + entry.hours, 0)
    const rostered = state.bookings.reduce((sum, booking) => {
        if (booking.date < start || booking.date > focusDate) return sum
        if (!booking.slots.some((slot) => slot.personId === personId)) return sum
        return sum + shiftHours(booking.start, booking.end)
    }, 0)
    return prior + rostered
}

export function projectedWeekHours(state: AppState, personId: string, booking: Booking) {
    const base = weekHours(state, personId, booking.date)
    const already = booking.slots.some((slot) => slot.personId === personId)
    if (already) return base
    return base + shiftHours(booking.start, booking.end)
}

export function rateKind(date: string, start: string, end: string): 'ordinary' | 'night' | 'weekend' {
    const day = new Date(`${date}T12:00:00`).getDay()
    if (day === 0 || day === 6) return 'weekend'
    if (start >= '18:00' || end <= '06:00' || end <= start) return 'night'
    return 'ordinary'
}

export function personRate(person: Person, kind: 'ordinary' | 'night' | 'weekend') {
    if (kind === 'night') return person.nightRate
    if (kind === 'weekend') return person.weekendRate
    return person.ordinaryRate
}

export function validateAssignment(state: AppState, booking: Booking, slot: Slot, person: Person): Issue[] {
    const issues: Issue[] = []
    const { settings } = state

    if (person.status === 'onboarding') {
        issues.push({ level: 'block', code: 'status', message: `${person.name} is still in onboarding.` })
    } else if (person.status === 'inactive') {
        issues.push({ level: 'block', code: 'status', message: `${person.name} is inactive.` })
    } else if (person.status === 'leave') {
        issues.push({ level: 'block', code: 'status', message: `${person.name} is on leave.` })
    }

    if (person.leaveDates.includes(booking.date)) {
        issues.push({ level: 'block', code: 'leave', message: `${person.name} has leave on ${booking.date}.` })
    }

    const duplicate = booking.slots.some((other) => other.id !== slot.id && other.personId === person.id)
    if (duplicate) {
        issues.push({ level: 'block', code: 'duplicate', message: `${person.name} is already on this job.` })
    }

    const skill = person.skills.find((item) => item.name === slot.role)
    if (!skill) {
        issues.push({ level: 'block', code: 'skill', message: `${person.name} has no ${slot.role} ticket.` })
    } else if (skill.expires < booking.date) {
        issues.push({
            level: 'block',
            code: 'expired',
            message: `${person.name}'s ${slot.role} ticket expired ${skill.expires}.`,
        })
    } else if (skill.expires <= addDays(booking.date, settings.expiryWarningDays)) {
        issues.push({
            level: 'warn',
            code: 'expiring',
            message: `${slot.role} ticket expires ${skill.expires}.`,
        })
    }

    const span = shiftHours(booking.start, booking.end)
    if (span > settings.maxShiftHours) {
        issues.push({
            level: 'block',
            code: 'shift',
            message: `This shift is ${round1(span)}h. The limit is ${settings.maxShiftHours}h.`,
        })
    }

    const hours = projectedWeekHours(state, person.id, booking)
    if (hours > settings.maxWeekHours) {
        issues.push({
            level: 'block',
            code: 'fatigue',
            message: `${person.name} would be on ${round1(hours)}h in 7 days. Limit is ${settings.maxWeekHours}h.`,
        })
    } else if (hours > settings.maxWeekHours - 8) {
        issues.push({
            level: 'warn',
            code: 'fatigue',
            message: `${person.name} would be on ${round1(hours)}h in 7 days, close to the ${settings.maxWeekHours}h limit.`,
        })
    }

    const proposed = intervalMs(booking.date, booking.start, booking.end)
    for (const other of state.bookings) {
        if (other.id === booking.id) continue
        if (!other.slots.some((item) => item.personId === person.id)) continue
        const otherRange = intervalMs(other.date, other.start, other.end)
        if (rangesOverlap(proposed, otherRange)) {
            issues.push({
                level: 'block',
                code: 'clash',
                message: `${person.name} is already on ${other.title} at that time.`,
            })
            continue
        }
        if (otherRange[1] <= proposed[0]) {
            const gap = (proposed[0] - otherRange[1]) / 36e5
            if (gap < settings.minRestHours) {
                issues.push({
                    level: 'block',
                    code: 'rest',
                    message: `${round1(gap)}h rest after ${other.title}. Minimum is ${settings.minRestHours}h.`,
                })
            }
        } else if (proposed[1] <= otherRange[0]) {
            const gap = (otherRange[0] - proposed[1]) / 36e5
            if (gap < settings.minRestHours) {
                issues.push({
                    level: 'block',
                    code: 'rest',
                    message: `${round1(gap)}h rest before ${other.title}. Minimum is ${settings.minRestHours}h.`,
                })
            }
        }
    }

    return issues
}

export function slotIssues(state: AppState, booking: Booking, slot: Slot) {
    const person = findPerson(state, slot.personId)
    if (!person) return []
    return validateAssignment(state, booking, slot, person)
}

export function vehicleIssues(state: AppState, booking: Booking, vehicle: Vehicle): Issue[] {
    const issues: Issue[] = []
    if (vehicle.status === 'maintenance') {
        issues.push({ level: 'block', code: 'workshop', message: `${vehicle.name} is in the workshop.` })
    }
    if (vehicle.regoExpires < booking.date) {
        issues.push({ level: 'block', code: 'rego', message: `${vehicle.name} rego expired ${vehicle.regoExpires}.` })
    } else if (vehicle.regoExpires <= addDays(booking.date, state.settings.expiryWarningDays)) {
        issues.push({ level: 'warn', code: 'rego', message: `${vehicle.name} rego expires ${vehicle.regoExpires}.` })
    }
    if (vehicle.nextService <= booking.date) {
        issues.push({ level: 'warn', code: 'service', message: `${vehicle.name} is due for service.` })
    }
    if (vehicle.depot !== booking.depot) {
        issues.push({
            level: 'warn',
            code: 'depot',
            message: `${vehicle.name} is garaged at ${vehicle.depot}, not ${booking.depot}.`,
        })
    }
    const proposed = intervalMs(booking.date, booking.start, booking.end)
    for (const other of state.bookings) {
        if (other.id === booking.id || other.vehicleId !== vehicle.id) continue
        if (rangesOverlap(proposed, intervalMs(other.date, other.start, other.end))) {
            issues.push({
                level: 'block',
                code: 'clash',
                message: `${vehicle.name} is already booked on ${other.title}.`,
            })
        }
    }
    return issues
}

export function statusFor(state: AppState, booking: Booking) {
    if (booking.invoiceId) return 'invoiced' as const
    const assigned = booking.slots.filter((slot) => slot.personId)
    const dockets = state.dockets.filter((docket) => docket.bookingId === booking.id)
    const approved =
        assigned.length > 0 &&
        assigned.every((slot) =>
            dockets.some((docket) => docket.personId === slot.personId && docket.status === 'approved'),
        )
    if (approved) return 'approved' as const
    const submitted =
        assigned.length > 0 &&
        assigned.every((slot) =>
            dockets.some(
                (docket) =>
                    docket.personId === slot.personId &&
                    (docket.status === 'submitted' || docket.status === 'approved'),
            ),
        )
    if (submitted) return 'submitted' as const
    if (booking.slots.length > 0 && booking.slots.every((slot) => slot.personId && slot.response === 'accepted')) {
        return 'confirmed' as const
    }
    if (booking.slots.length > 0 && booking.slots.every((slot) => slot.personId)) return 'offered' as const
    return 'planning' as const
}

export function payHours(start: string, end: string, breakMins: number) {
    return Math.max(0, shiftHours(start, end) - breakMins / 60)
}
