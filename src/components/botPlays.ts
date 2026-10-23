export type BotId = 'roster' | 'closeout' | 'field'

export type Play = {
    id: string
    bot: BotId
    botName: string
    title: string
    blurb: string
    reads: string
}

export const PLAYS: Play[] = [
    {
        id: 'roster-alerts',
        bot: 'roster',
        botName: 'Roster bot',
        title: 'Expiry alerts and status',
        blurb: 'Reads people, tickets and employment status. An expired ticket, a person on leave, or someone still onboarding never becomes an offer.',
        reads: 'People profiles · skills and documents · employment status',
    },
    {
        id: 'roster-suggest',
        bot: 'roster',
        botName: 'Roster bot',
        title: 'Auto-suggest assignments',
        blurb: 'Walks today’s open slots, scores depot and hours, and offers only crew the rules accept. The crew still accept on the phone.',
        reads: 'Booking board · real-time availability · the same rules as a manual drop',
    },
    {
        id: 'board-checks',
        bot: 'roster',
        botName: 'Roster bot',
        title: 'Conflict, fatigue and skill',
        blurb: 'A name dropped on the board is checked for the ticket, the week’s hours, rest, a clash, and whether that person is free.',
        reads: 'Drag-and-drop scheduling · skill validation · fatigue · availability',
    },
    {
        id: 'field-push',
        bot: 'field',
        botName: 'Field sync bot',
        title: 'Push jobs, accept or decline',
        blurb: 'Takes an offer the roster bot already cleared and puts that one shift on the phone. Accept or decline writes straight back to the board.',
        reads: 'Job requests · the booking board · one crew login',
    },
    {
        id: 'field-docket',
        bot: 'field',
        botName: 'Field sync bot',
        title: 'Docket validation',
        blurb: 'Checks the signature, the hours against the roster, a near miss and its photo. Offline, the docket stays in the outbox until the phone is back.',
        reads: 'Digital dockets · photos and near misses · offline documents',
    },
    {
        id: 'closeout',
        bot: 'closeout',
        botName: 'Close-out bot',
        title: 'Timesheets, payroll, invoices',
        blurb: 'Reviews signed dockets, approves the ones that match the roster, prices payroll, and prepares the client invoice for Xero.',
        reads: 'Timesheet review · Employment Hero payroll file · Xero invoice',
    },
]

const IDS = new Set(PLAYS.map((play) => play.id))

export function isPlayId(value: string): value is Play['id'] {
    return IDS.has(value)
}
