import type { AppState } from '../types.ts'
import { buildAlerts, closeoutReview, rosterPlan } from './bots.ts'
import { addDays } from './format.ts'
import { statusFor } from './rules.ts'

export function yardSnapshot(
    state: AppState,
    today: string,
    pair: { primary?: string; partner?: string; holder?: string },
    actor?: { role: 'super-admin' | 'field'; name: string } | null,
) {
    const from = addDays(today, -1)
    const to = addDays(today, 6)
    const nameOf = (id: string | null) => state.people.find((person) => person.id === id)?.name ?? null
    const plan = rosterPlan(state, today, 'All')

    return {
        today,
        actor: actor ?? null,
        company: state.settings.companyName,
        operators: pair,
        limits: {
            maxShiftHours: state.settings.maxShiftHours,
            maxWeekHours: state.settings.maxWeekHours,
            minRestHours: state.settings.minRestHours,
        },
        people: state.people.map((person) => ({
            name: person.name,
            title: person.title,
            depot: person.depot,
            status: person.status,
            skills: person.skills.map((skill) => ({ name: skill.name, expires: skill.expires })),
            leave: person.leaveDates.filter((date) => date >= from && date <= to),
        })),
        jobs: state.bookings
            .filter((booking) => booking.date >= from && booking.date <= to)
            .map((booking) => ({
                title: booking.title,
                site: booking.site,
                depot: booking.depot,
                date: booking.date,
                start: booking.start,
                end: booking.end,
                status: statusFor(state, booking),
                notes: booking.notes,
                slots: booking.slots.map((slot) => ({
                    role: slot.role,
                    person: nameOf(slot.personId),
                    response: slot.response,
                })),
            })),
        suggestions: plan.suggestions.map((item) => ({
            person: nameOf(item.personId),
            reason: item.reason,
            job: state.bookings.find((booking) => booking.id === item.bookingId)?.title ?? '',
            role: state.bookings.find((booking) => booking.id === item.bookingId)?.slots.find((slot) => slot.id === item.slotId)?.role ?? '',
        })),
        gaps: plan.gaps.map((gap) => ({ role: gap.role, job: gap.bookingTitle, reason: gap.reason })),
        closeout: closeoutReview(state, today).slice(0, 12).map((item) => ({ level: item.level, message: item.message })),
        alerts: buildAlerts(state, today).slice(0, 8).map((alert) => ({ tone: alert.tone, title: alert.title, detail: alert.detail })),
        queuedDockets: state.outbox.length,
    }
}
