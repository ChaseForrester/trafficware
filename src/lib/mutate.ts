import type {
    Activity,
    ActivitySource,
    AppState,
    Booking,
    Docket,
    IntegrationId,
    NoticeTone,
    Person,
} from '../types.ts'
import { invoiceDrafts, payrollRows, rosterPlan } from './bots.ts'
import { addDays, round1, shiftHours, todayIso, uid } from './format.ts'
import { findPerson, findVehicle, slotIssues, validateAssignment, vehicleIssues } from './rules.ts'

export type Result = {
    state: AppState
    notice: string
    tone: NoticeTone
    download?: 'payroll' | 'invoices'
}

function ok(state: AppState, notice: string, tone: NoticeTone = 'ok', download?: Result['download']): Result {
    return { state, notice, tone, download }
}

function log(state: AppState, source: ActivitySource, message: string): AppState {
    const event: Activity = { id: uid('evt'), at: new Date().toISOString(), source, message }
    return { ...state, activity: [event, ...state.activity].slice(0, 40) }
}

function replaceBooking(state: AppState, booking: Booking): AppState {
    return { ...state, bookings: state.bookings.map((item) => (item.id === booking.id ? booking : item)) }
}

function issueKey(issue: { level: string; code: string; message: string }) {
    return `${issue.level}:${issue.code}:${issue.message}`
}

function crewIssues(state: AppState, booking: Booking) {
    const vehicle = booking.vehicleId ? findVehicle(state, booking.vehicleId) : null
    return [
        ...booking.slots.flatMap((slot) => slotIssues(state, booking, slot)),
        ...(vehicle ? vehicleIssues(state, booking, vehicle) : []),
    ]
}

function locked(state: AppState, booking: Booking) {
    const hasDocket = state.dockets.some((docket) => docket.bookingId === booking.id && docket.status !== 'queried')
    if (booking.invoiceId || hasDocket) {
        return 'This job has dockets or an invoice. Query the docket before changing the crew.'
    }
    return null
}

export function assignPerson(state: AppState, bookingId: string, slotId: string, personId: string): Result {
    const booking = state.bookings.find((item) => item.id === bookingId)
    const person = findPerson(state, personId)
    const slot = booking?.slots.find((item) => item.id === slotId)
    if (!booking || !person || !slot) return ok(state, 'That slot is no longer on the board.', 'bad')
    const lock = locked(state, booking)
    if (lock) return ok(state, lock, 'bad')
    const issues = validateAssignment(state, booking, slot, person)
    const blocks = issues.filter((issue) => issue.level === 'block')
    if (blocks.length) return ok(state, blocks.map((issue) => issue.message).join(' '), 'bad')
    const next: Booking = {
        ...booking,
        slots: booking.slots.map((item) =>
            item.id === slotId ? { ...item, personId, response: 'pending' as const } : item,
        ),
    }
    let updated = log(
        replaceBooking(state, next),
        'system',
        `${person.name} offered ${booking.title} as ${slot.role}.`,
    )
    const warns = issues.filter((issue) => issue.level === 'warn')
    if (warns.length) return ok(updated, `${person.name} assigned. ${warns.map((issue) => issue.message).join(' ')}`, 'warn')
    return ok(updated, `${person.name} assigned to ${booking.title}. Waiting for them to accept.`)
}

export function unassignPerson(state: AppState, bookingId: string, slotId: string): Result {
    const booking = state.bookings.find((item) => item.id === bookingId)
    const slot = booking?.slots.find((item) => item.id === slotId)
    if (!booking || !slot?.personId) return ok(state, 'That slot is already empty.', 'warn')
    const lock = locked(state, booking)
    if (lock) return ok(state, lock, 'bad')
    const person = findPerson(state, slot.personId)
    const next: Booking = {
        ...booking,
        slots: booking.slots.map((item) =>
            item.id === slotId ? { ...item, personId: null, response: null } : item,
        ),
    }
    return ok(
        log(replaceBooking(state, next), 'system', `${person?.name ?? 'Crew'} removed from ${booking.title}.`),
        `${person?.name ?? 'Crew'} removed from ${booking.title}.`,
    )
}

export function respond(
    state: AppState,
    bookingId: string,
    slotId: string,
    response: 'accepted' | 'declined',
): Result {
    const booking = state.bookings.find((item) => item.id === bookingId)
    const slot = booking?.slots.find((item) => item.id === slotId)
    if (!booking || !slot?.personId) return ok(state, 'That offer is gone.', 'bad')
    const person = findPerson(state, slot.personId)
    if (response === 'declined') {
        const next: Booking = {
            ...booking,
            slots: booking.slots.map((item) =>
                item.id === slotId ? { ...item, personId: null, response: null } : item,
            ),
        }
        return ok(
            log(replaceBooking(state, next), 'field-sync', `${person?.name} declined ${booking.title}.`),
            `${person?.name} declined ${booking.title}. The slot is open again.`,
            'warn',
        )
    }
    const next: Booking = {
        ...booking,
        slots: booking.slots.map((item) => (item.id === slotId ? { ...item, response: 'accepted' as const } : item)),
    }
    return ok(
        log(replaceBooking(state, next), 'field-sync', `${person?.name} accepted ${booking.title}.`),
        `${person?.name} accepted ${booking.title}.`,
    )
}

export function setVehicle(state: AppState, bookingId: string, vehicleId: string | null): Result {
    const booking = state.bookings.find((item) => item.id === bookingId)
    if (!booking) return ok(state, 'Job not found.', 'bad')
    if (booking.invoiceId) return ok(state, 'This job is already on an invoice.', 'bad')
    if (!vehicleId) {
        return ok(replaceBooking(state, { ...booking, vehicleId: null }), 'Vehicle cleared.')
    }
    const vehicle = findVehicle(state, vehicleId)
    if (!vehicle) return ok(state, 'Vehicle not found.', 'bad')
    const issues = vehicleIssues(state, booking, vehicle)
    const blocks = issues.filter((issue) => issue.level === 'block')
    if (blocks.length) return ok(state, blocks.map((issue) => issue.message).join(' '), 'bad')
    const warns = issues.filter((issue) => issue.level === 'warn')
    const next = replaceBooking(state, { ...booking, vehicleId })
    if (warns.length) return ok(log(next, 'system', warns[0].message), warns.map((issue) => issue.message).join(' '), 'warn')
    return ok(log(next, 'system', `${vehicle.name} booked on ${booking.title}.`), `${vehicle.name} booked on ${booking.title}.`)
}

export type NewBooking = {
    title: string
    clientId: string
    site: string
    depot: string
    date: string
    start: string
    end: string
    notes: string
    roles: string[]
    vehicleId: string | null
}

export function createBooking(state: AppState, input: NewBooking): Result {
    if (!input.title.trim() || !input.clientId || !input.roles.length) {
        return ok(state, 'A job needs a name, a client and at least one role.', 'bad')
    }
    const booking: Booking = {
        id: uid('job'),
        clientId: input.clientId,
        title: input.title.trim(),
        site: input.site.trim(),
        depot: input.depot,
        date: input.date,
        start: input.start,
        end: input.end,
        notes: input.notes.trim(),
        slots: input.roles.map((role) => ({ id: uid('slot'), role, personId: null, response: null })),
        vehicleId: null,
        equipment: [],
        invoiceId: null,
    }
    let next = log({ ...state, bookings: [...state.bookings, booking] }, 'system', `Job opened: ${booking.title}.`)
    if (input.vehicleId) {
        const withVehicle = setVehicle(next, booking.id, input.vehicleId)
        next = withVehicle.state
        if (withVehicle.tone === 'bad') {
            return ok(next, `Job opened. ${withVehicle.notice}`, 'warn')
        }
    }
    return ok(next, `${booking.title} is on the board.`)
}

export function moveBooking(state: AppState, bookingId: string, date: string): Result {
    const booking = state.bookings.find((item) => item.id === bookingId)
    if (!booking) return ok(state, 'That job is not on the board.', 'bad')
    if (booking.date === date) return ok(state, `${booking.title} is already on that day.`)
    const block = locked(state, booking)
    if (block) return ok(state, block, 'bad')
    const moved: Booking = { ...booking, date }
    const trial = replaceBooking(state, moved)
    const issues = moved.slots.flatMap((slot) => slotIssues(trial, moved, slot))
    const stopped = issues.find((issue) => issue.level === 'block')
    if (stopped) return ok(state, stopped.message, 'bad')
    const next = log(trial, 'system', `Moved ${booking.title} to ${date}.`)
    const warning = issues.find((issue) => issue.level === 'warn')
    if (warning) return ok(next, `${booking.title} moved. ${warning.message}`, 'warn')
    return ok(next, `${booking.title} is on ${date}.`)
}

export type BookingPatch = {
    title: string
    clientId: string
    site: string
    depot: string
    date: string
    start: string
    end: string
    notes: string
}

export function updateBooking(state: AppState, id: string, patch: BookingPatch): Result {
    const booking = state.bookings.find((item) => item.id === id)
    if (!booking) return ok(state, 'That job is not on the board.', 'bad')
    const block = locked(state, booking)
    if (block) return ok(state, block, 'bad')
    if (!patch.title.trim() || !patch.clientId || !patch.date || !patch.start || !patch.end) {
        return ok(state, 'A job needs a name, a client, a day and hours.', 'bad')
    }
    const nextBooking: Booking = {
        ...booking,
        title: patch.title.trim(),
        clientId: patch.clientId,
        site: patch.site.trim(),
        depot: patch.depot,
        date: patch.date,
        start: patch.start,
        end: patch.end,
        notes: patch.notes.trim(),
    }
    const trial = replaceBooking(state, nextBooking)
    const before = crewIssues(state, booking)
    const after = crewIssues(trial, nextBooking)
    const already = new Set(before.filter((issue) => issue.level === 'block').map(issueKey))
    const freshBlocks = after.filter((issue) => issue.level === 'block' && !already.has(issueKey(issue)))
    if (freshBlocks.length) return ok(state, freshBlocks.map((issue) => issue.message).join(' '), 'bad')
    const saved = log(trial, 'system', `Updated ${nextBooking.title}.`)
    const alreadyWarn = new Set(before.filter((issue) => issue.level === 'warn').map(issueKey))
    const freshWarns = after.filter((issue) => issue.level === 'warn' && !alreadyWarn.has(issueKey(issue)))
    if (freshWarns.length) return ok(saved, `${nextBooking.title} saved. ${freshWarns.map((issue) => issue.message).join(' ')}`, 'warn')
    return ok(saved, `${nextBooking.title} saved.`)
}

export function addSlot(state: AppState, id: string, role: string): Result {
    const booking = state.bookings.find((item) => item.id === id)
    if (!booking) return ok(state, 'That job is not on the board.', 'bad')
    const block = locked(state, booking)
    if (block) return ok(state, block, 'bad')
    const slotRole = role.trim() || 'Traffic Controller'
    const nextBooking: Booking = {
        ...booking,
        slots: [...booking.slots, { id: uid('slot'), role: slotRole, personId: null, response: null }],
    }
    return ok(
        log(replaceBooking(state, nextBooking), 'system', `Added a ${slotRole} slot on ${booking.title}.`),
        `${slotRole} slot added to ${booking.title}.`,
    )
}

export function removeSlot(state: AppState, id: string, slotId: string): Result {
    const booking = state.bookings.find((item) => item.id === id)
    const slot = booking?.slots.find((item) => item.id === slotId)
    if (!booking || !slot) return ok(state, 'That slot is gone.', 'bad')
    const block = locked(state, booking)
    if (block) return ok(state, block, 'bad')
    if (booking.slots.length <= 1) return ok(state, 'A job needs at least one slot.', 'bad')
    if (slot.personId) return ok(state, 'Take the person off this slot first.', 'bad')
    const nextBooking: Booking = { ...booking, slots: booking.slots.filter((item) => item.id !== slotId) }
    return ok(
        log(replaceBooking(state, nextBooking), 'system', `Removed a ${slot.role} slot from ${booking.title}.`),
        `${slot.role} slot removed.`,
    )
}

export function setSlotRole(state: AppState, id: string, slotId: string, role: string): Result {
    const booking = state.bookings.find((item) => item.id === id)
    const slot = booking?.slots.find((item) => item.id === slotId)
    if (!booking || !slot) return ok(state, 'That slot is gone.', 'bad')
    const block = locked(state, booking)
    if (block) return ok(state, block, 'bad')
    if (slot.role === role) return ok(state, `${role} is already on this slot.`)
    const person = slot.personId ? findPerson(state, slot.personId) : null
    const trialSlot = { ...slot, role }
    const issues = person ? validateAssignment(state, booking, trialSlot, person) : []
    const stopped = issues.filter((issue) => issue.level === 'block')
    if (stopped.length) return ok(state, stopped.map((issue) => issue.message).join(' '), 'bad')
    const nextBooking: Booking = {
        ...booking,
        slots: booking.slots.map((item) => (item.id === slotId ? trialSlot : item)),
    }
    const saved = log(replaceBooking(state, nextBooking), 'system', `${booking.title} slot is now ${role}.`)
    const warnings = issues.filter((issue) => issue.level === 'warn')
    if (warnings.length) return ok(saved, `Slot is now ${role}. ${warnings.map((issue) => issue.message).join(' ')}`, 'warn')
    return ok(saved, `Slot is now ${role}.`)
}

export function deleteBooking(state: AppState, id: string): Result {
    const booking = state.bookings.find((item) => item.id === id)
    if (!booking) return ok(state, 'That job is already off the board.', 'warn')
    const block = locked(state, booking)
    if (block) return ok(state, block, 'bad')
    const next = { ...state, bookings: state.bookings.filter((item) => item.id !== id) }
    return ok(log(next, 'system', `${booking.title} taken off the board.`), `${booking.title} is off the board.`)
}

export type NewPerson = {
    name: string
    title: string
    depot: string
    phone: string
    email: string
    ordinaryRate: number
    nightRate: number
    weekendRate: number
}

export function addPerson(state: AppState, input: NewPerson): Result {
    if (!input.name.trim()) return ok(state, 'A person needs a name.', 'bad')
    const person: Person = {
        id: uid('p'),
        name: input.name.trim(),
        title: input.title.trim() || 'Traffic Controller',
        depot: input.depot,
        status: 'active',
        phone: input.phone.trim(),
        email: input.email.trim(),
        ordinaryRate: input.ordinaryRate,
        nightRate: input.nightRate,
        weekendRate: input.weekendRate,
        skills: [],
        leaveDates: [],
        priorHours: [],
        onboarding: [],
        color: '#1a4f86',
    }
    return ok(
        log({ ...state, people: [...state.people, person] }, 'system', `${person.name} added to people.`),
        `${person.name} added. Give them tickets before rostering.`,
    )
}

export function updatePerson(state: AppState, id: string, patch: Partial<Person>): Result {
    const person = findPerson(state, id)
    if (!person) return ok(state, 'Person not found.', 'bad')
    const next = { ...person, ...patch, id: person.id, skills: patch.skills ?? person.skills }
    return ok(
        { ...state, people: state.people.map((item) => (item.id === id ? next : item)) },
        `${next.name} updated.`,
    )
}

export function addSkill(state: AppState, personId: string, name: string, expires: string): Result {
    const person = findPerson(state, personId)
    if (!person || !name.trim() || !expires) return ok(state, 'Ticket name and expiry are required.', 'bad')
    const skill = { id: uid('sk'), name: name.trim(), expires, document: `${name.trim().replaceAll(' ', '-')}.pdf` }
    const next = { ...person, skills: [...person.skills, skill] }
    return ok(
        log(
            { ...state, people: state.people.map((item) => (item.id === personId ? next : item)) },
            'system',
            `${person.name} ticket added: ${skill.name}, expires ${expires}.`,
        ),
        `${skill.name} added for ${person.name}.`,
    )
}

export function removeSkill(state: AppState, personId: string, skillId: string): Result {
    const person = findPerson(state, personId)
    if (!person) return ok(state, 'Person not found.', 'bad')
    const skill = person.skills.find((item) => item.id === skillId)
    const next = { ...person, skills: person.skills.filter((item) => item.id !== skillId) }
    return ok(
        { ...state, people: state.people.map((item) => (item.id === personId ? next : item)) },
        skill ? `${skill.name} removed from ${person.name}.` : 'Ticket removed.',
    )
}

export function setLeave(state: AppState, personId: string, date: string, on: boolean): Result {
    const person = findPerson(state, personId)
    if (!person) return ok(state, 'Person not found.', 'bad')
    const leaveDates = on
        ? [...new Set([...person.leaveDates, date])]
        : person.leaveDates.filter((item) => item !== date)
    return ok(
        { ...state, people: state.people.map((item) => (item.id === personId ? { ...person, leaveDates } : item)) },
        on ? `${person.name} marked on leave ${date}.` : `${person.name} is available ${date}.`,
    )
}

export function setVehicleStatus(state: AppState, id: string, status: 'available' | 'maintenance'): Result {
    const vehicle = findVehicle(state, id)
    if (!vehicle) return ok(state, 'Vehicle not found.', 'bad')
    return ok(
        log(
            {
                ...state,
                vehicles: state.vehicles.map((item) => (item.id === id ? { ...item, status } : item)),
            },
            'system',
            `${vehicle.name} marked ${status === 'maintenance' ? 'in the workshop' : 'available'}.`,
        ),
        `${vehicle.name} is ${status === 'maintenance' ? 'in the workshop' : 'available'}.`,
    )
}

const GPS_LABELS = [
    'Western Ring Rd, northbound',
    'Princes Hwy, Braybrook',
    'Dynon Rd depot',
    'Footscray Rd overpass',
    'Geelong yard',
    'Docklands, Wurundjeri Way',
]

export function pingVehicle(state: AppState, id: string): Result {
    const gps = state.integrations.find((item) => item.id === 'gps')
    if (!gps?.connected) return ok(state, 'Connect GPS telematics before pinging a truck.', 'bad')
    const vehicle = findVehicle(state, id)
    if (!vehicle) return ok(state, 'Vehicle not found.', 'bad')
    const label = GPS_LABELS[(GPS_LABELS.indexOf(vehicle.gps.label) + 1) % GPS_LABELS.length]
    const speed = vehicle.status === 'maintenance' ? 0 : 18 + Math.floor(Math.random() * 40)
    const next = {
        ...vehicle,
        gps: { label, updated: new Date().toISOString(), speed },
    }
    const integrations = state.integrations.map((item) =>
        item.id === 'gps' ? { ...item, lastSync: new Date().toISOString() } : item,
    )
    return ok(
        {
            ...state,
            integrations,
            vehicles: state.vehicles.map((item) => (item.id === id ? next : item)),
        },
        `${vehicle.name} pinged at ${label}.`,
    )
}

export type NewClient = {
    name: string
    contact: string
    email: string
    phone: string
    billingRate: number
}

export function addClient(state: AppState, input: NewClient): Result {
    if (!input.name.trim()) return ok(state, 'A client needs a name.', 'bad')
    const client = {
        id: uid('c'),
        name: input.name.trim(),
        contact: input.contact.trim(),
        email: input.email.trim(),
        phone: input.phone.trim(),
        billingRate: input.billingRate || 110,
    }
    return ok(
        log({ ...state, clients: [...state.clients, client] }, 'system', `Client added: ${client.name}.`),
        `${client.name} added.`,
    )
}

export function setIntegration(state: AppState, id: IntegrationId, connected: boolean): Result {
    const current = state.integrations.find((item) => item.id === id)
    if (!current) return ok(state, 'Integration not found.', 'bad')
    const integrations = state.integrations.map((item) => (item.id === id ? { ...item, connected } : item))
    return ok(
        log(
            { ...state, integrations },
            'system',
            `${current.name} ${connected ? 'connected' : 'disconnected'} in this demo.`,
        ),
        connected ? `${current.name} connected on this device.` : `${current.name} disconnected.`,
    )
}

export function pushIntegration(state: AppState, id: IntegrationId): Result {
    const current = state.integrations.find((item) => item.id === id)
    if (!current?.connected) return ok(state, `Connect ${current?.name ?? 'the integration'} first.`, 'bad')
    const now = new Date().toISOString()
    const integrations = state.integrations.map((item) => (item.id === id ? { ...item, lastSync: now } : item))
    if (id === 'gps') {
        let next = { ...state, integrations }
        for (const vehicle of state.vehicles) {
            next = pingVehicle(next, vehicle.id).state
        }
        return ok(log(next, 'system', 'GPS telematics pinged every truck.'), 'Fleet pinged.')
    }
    if (id === 'employment-hero') {
        const rows = payrollRows(state)
        if (!rows.length) return ok({ ...state, integrations }, 'No approved dockets to send to payroll yet.', 'warn')
        return ok(
            log(
                { ...state, integrations },
                'closeout-bot',
                `Payroll export prepared for Employment Hero. ${rows.length} approved lines.`,
            ),
            'Payroll CSV downloaded. Employment Hero is marked synced in this demo.',
            'ok',
            'payroll',
        )
    }
    if (id === 'xero') {
        const drafts = invoiceDrafts(state)
        const invoices = state.invoices
        if (!drafts.length && !invoices.length) {
            return ok({ ...state, integrations }, 'Approve dockets and create invoices before exporting to Xero.', 'warn')
        }
        const stamped = invoices.map((invoice) => ({ ...invoice, status: 'exported' as const }))
        return ok(
            log(
                { ...state, integrations, invoices: stamped },
                'closeout-bot',
                'Invoice CSV prepared for Xero.',
            ),
            'Invoice CSV downloaded. Xero is marked synced in this demo.',
            'ok',
            'invoices',
        )
    }
    const onboarding = state.people.filter((person) => person.status === 'onboarding')
    const message = onboarding.length
        ? `${onboarding.map((person) => person.name).join(', ')} still onboarding.`
        : 'No one is waiting on HR checks.'
    return ok(log({ ...state, integrations }, 'system', `HR onboarding sync. ${message}`), message, onboarding.length ? 'warn' : 'ok')
}

export function setOffline(state: AppState, offline: boolean): Result {
    return ok(
        log({ ...state, offline }, 'field-sync', offline ? 'Field app went offline.' : 'Field app is back online.'),
        offline ? 'Offline. Dockets will queue on this device.' : 'Back online.',
        offline ? 'warn' : 'ok',
    )
}

export type DocketInput = {
    bookingId: string
    personId: string
    start: string
    end: string
    breakMins: number
    notes: string
    signedBy: string
    nearMiss: string
    photoName: string
}

export function submitDocket(state: AppState, input: DocketInput): Result {
    if (!input.signedBy.trim()) return ok(state, 'Type your name to sign the docket.', 'bad')
    const booking = state.bookings.find((item) => item.id === input.bookingId)
    if (!booking) return ok(state, 'Job not found.', 'bad')
    const existing = state.dockets.find(
        (docket) => docket.bookingId === input.bookingId && docket.personId === input.personId && docket.status !== 'queried',
    )
    if (existing) return ok(state, 'A docket is already in for this job.', 'warn')
    const docket: Docket = {
        id: uid('doc'),
        bookingId: input.bookingId,
        personId: input.personId,
        start: input.start,
        end: input.end,
        breakMins: input.breakMins || 0,
        notes: input.notes.trim(),
        signedBy: input.signedBy.trim(),
        nearMiss: input.nearMiss.trim(),
        photoName: input.photoName,
        status: state.offline ? 'queued' : 'submitted',
        submittedAt: new Date().toISOString(),
        queryNote: '',
    }
    if (state.offline) {
        return ok(
            log(
                { ...state, outbox: [...state.outbox, docket] },
                'field-sync',
                `Docket queued offline for ${booking.title}.`,
            ),
            'Docket queued. It will sync when Field Sync runs.',
            'warn',
        )
    }
    const person = findPerson(state, input.personId)
    let next = log(
        { ...state, dockets: [...state.dockets, { ...docket, status: 'submitted' }] },
        'field-sync',
        `${person?.name ?? 'Crew'} submitted a docket for ${booking.title}.`,
    )
    if (input.nearMiss.trim()) {
        next = {
            ...next,
            safetyNotes: [
                {
                    id: uid('safe'),
                    personId: input.personId,
                    bookingId: input.bookingId,
                    note: input.nearMiss.trim(),
                    photoName: input.photoName,
                    at: new Date().toISOString(),
                    status: 'logged',
                },
                ...next.safetyNotes,
            ],
        }
    }
    return ok(next, `Docket submitted for ${booking.title}.`)
}

export function syncField(state: AppState): Result {
    if (state.offline) return ok(state, 'You are still offline. Switch back online to sync.', 'bad')
    if (!state.outbox.length && !state.safetyNotes.some((note) => note.status === 'queued')) {
        return ok(state, 'Nothing waiting in the field outbox.', 'warn')
    }
    const dockets = [
        ...state.dockets,
        ...state.outbox.map((docket) => ({ ...docket, status: 'submitted' as const })),
    ]
    const fromDockets = state.outbox
        .filter((docket) => docket.nearMiss.trim())
        .map((docket) => ({
            id: uid('safe'),
            personId: docket.personId,
            bookingId: docket.bookingId,
            note: docket.nearMiss,
            photoName: docket.photoName,
            at: docket.submittedAt,
            status: 'logged' as const,
        }))
    const safetyNotes = [
        ...fromDockets,
        ...state.safetyNotes.map((note) => (note.status === 'queued' ? { ...note, status: 'logged' as const } : note)),
    ]
    const count = state.outbox.length
    const notes = state.safetyNotes.filter((note) => note.status === 'queued').length + fromDockets.length
    return ok(
        log(
            { ...state, dockets, outbox: [], safetyNotes },
            'field-sync',
            `Field Sync pushed ${count} docket${count === 1 ? '' : 's'} and ${notes} near miss${notes === 1 ? '' : 'es'}.`,
        ),
        `Field Sync pushed ${count} docket${count === 1 ? '' : 's'}.`,
    )
}

export function addSafetyNote(
    state: AppState,
    input: { personId: string; bookingId: string | null; note: string; photoName: string },
): Result {
    if (!input.note.trim()) return ok(state, 'Describe the near miss before sending it.', 'bad')
    const note = {
        id: uid('safe'),
        personId: input.personId,
        bookingId: input.bookingId,
        note: input.note.trim(),
        photoName: input.photoName,
        at: new Date().toISOString(),
        status: state.offline ? ('queued' as const) : ('logged' as const),
    }
    return ok(
        log(
            { ...state, safetyNotes: [note, ...state.safetyNotes] },
            'field-sync',
            state.offline ? 'Near miss stored on the phone.' : 'Near miss logged to the database.',
        ),
        state.offline ? 'Near miss saved on this phone. It will sync later.' : 'Near miss logged.',
        state.offline ? 'warn' : 'ok',
    )
}

export function approveDocket(state: AppState, docketId: string): Result {
    const docket = state.dockets.find((item) => item.id === docketId)
    if (!docket) return ok(state, 'Docket not found.', 'bad')
    if (!docket.signedBy) return ok(state, 'A docket needs a signature before approval.', 'bad')
    const dockets = state.dockets.map((item) =>
        item.id === docketId ? { ...item, status: 'approved' as const, queryNote: '' } : item,
    )
    const booking = state.bookings.find((item) => item.id === docket.bookingId)
    return ok(
        log({ ...state, dockets }, 'closeout-bot', `Docket approved for ${booking?.title ?? 'a job'}.`),
        'Docket approved.',
    )
}

export function queryDocket(state: AppState, docketId: string, reason: string): Result {
    const docket = state.dockets.find((item) => item.id === docketId)
    if (!docket) return ok(state, 'Docket not found.', 'bad')
    if (!reason.trim()) return ok(state, 'Add a reason for the query.', 'bad')
    const dockets = state.dockets.map((item) =>
        item.id === docketId ? { ...item, status: 'queried' as const, queryNote: reason.trim() } : item,
    )
    const booking = state.bookings.find((item) => item.id === docket.bookingId)
    return ok(
        log({ ...state, dockets }, 'closeout-bot', `Docket queried on ${booking?.title ?? 'a job'}: ${reason.trim()}`),
        'Docket sent back as a query.',
        'warn',
    )
}

export function approveClean(state: AppState, date: string): Result {
    let count = 0
    const dockets = state.dockets.map((docket) => {
        const booking = state.bookings.find((item) => item.id === docket.bookingId)
        if (!booking || booking.date !== date || docket.status !== 'submitted' || !docket.signedBy) return docket
        const rostered = shiftHours(booking.start, booking.end)
        const actual = shiftHours(docket.start, docket.end)
        if (Math.abs(actual - rostered) > 0.5) return docket
        count += 1
        return { ...docket, status: 'approved' as const }
    })
    if (!count) return ok(state, 'No clean dockets to approve. Check hours and signatures.', 'warn')
    return ok(
        log({ ...state, dockets }, 'closeout-bot', `Close-out bot approved ${count} clean docket${count === 1 ? '' : 's'} for ${date}.`),
        `Approved ${count} clean docket${count === 1 ? '' : 's'}. Hours that do not match the roster were left for review.`,
    )
}

export function applySuggestions(state: AppState, date: string, depot: string): Result {
    const plan = rosterPlan(state, date, depot)
    if (!plan.suggestions.length) {
        return ok(
            state,
            plan.gaps.length
                ? `Roster bot could not fill ${plan.gaps.length} slot${plan.gaps.length === 1 ? '' : 's'} without breaking a rule.`
                : 'Nothing empty for the roster bot to fill.',
            'warn',
        )
    }
    let next = state
    for (const suggestion of plan.suggestions) {
        const result = assignPerson(next, suggestion.bookingId, suggestion.slotId, suggestion.personId)
        next = result.state
    }
    const names = plan.suggestions.map((suggestion) => findPerson(next, suggestion.personId)?.name ?? 'crew')
    return ok(
        log(
            next,
            'roster-bot',
            `Roster bot offered ${plan.suggestions.length} place${plan.suggestions.length === 1 ? '' : 's'}: ${names.join(', ')}.${plan.gaps.length ? ` ${plan.gaps.length} left open.` : ''}`,
        ),
        plan.gaps.length
            ? `Roster bot filled ${plan.suggestions.length} slots. ${plan.gaps.length} still open.`
            : `Roster bot filled ${plan.suggestions.length} slots.`,
        plan.gaps.length ? 'warn' : 'ok',
    )
}

export function recordCloseout(state: AppState, date: string, summary: string): Result {
    return ok(log(state, 'closeout-bot', summary), `Close-out review for ${date} posted to the activity log.`)
}

export function createInvoices(state: AppState): Result {
    const drafts = invoiceDrafts(state)
    if (!drafts.length) return ok(state, 'No approved jobs are waiting to be invoiced.', 'warn')
    const createdAt = new Date().toISOString()
    const invoices = [...state.invoices]
    let bookings = state.bookings
    drafts.forEach((draft, index) => {
        const id = uid('inv')
        invoices.unshift({
            id,
            number: `INV-${1040 + state.invoices.length + index + 1}`,
            clientId: draft.clientId,
            bookingIds: draft.bookingIds,
            hours: draft.hours,
            wages: draft.wages,
            amount: round1(draft.amount),
            status: 'draft',
            createdAt,
        })
        bookings = bookings.map((booking) =>
            draft.bookingIds.includes(booking.id) ? { ...booking, invoiceId: id } : booking,
        )
    })
    return ok(
        log(
            { ...state, invoices, bookings },
            'closeout-bot',
            `Created ${drafts.length} invoice${drafts.length === 1 ? '' : 's'} from approved dockets.`,
        ),
        `Created ${drafts.length} invoice${drafts.length === 1 ? '' : 's'}.`,
    )
}

export function updateSettings(state: AppState, patch: Partial<AppState['settings']>): Result {
    return ok({ ...state, settings: { ...state.settings, ...patch } }, 'Rules saved. The board is using them now.')
}

export function addDepot(state: AppState, name: string): Result {
    const depot = name.trim()
    if (!depot) return ok(state, 'Depot name is required.', 'bad')
    if (state.settings.depots.includes(depot)) return ok(state, 'That depot already exists.', 'warn')
    return ok(
        { ...state, settings: { ...state.settings, depots: [...state.settings.depots, depot] } },
        `${depot} added.`,
    )
}

export function completeOnboarding(state: AppState, personId: string, itemId: string): Result {
    const person = findPerson(state, personId)
    if (!person) return ok(state, 'Person not found.', 'bad')
    const onboarding = person.onboarding.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item))
    let nextPerson: Person = { ...person, onboarding }
    let notice = `${person.name} checklist updated.`
    let tone: NoticeTone = 'ok'
    if (onboarding.length > 0 && onboarding.every((item) => item.done)) {
        const hasTicket = nextPerson.skills.some((skill) => skill.name === 'Traffic Controller')
        nextPerson = {
            ...nextPerson,
            status: 'active',
            skills: hasTicket
                ? nextPerson.skills
                : [
                    ...nextPerson.skills,
                    {
                        id: uid('sk'),
                        name: 'Traffic Controller',
                        expires: addDays(todayIso(), 365),
                        document: 'TC-onboarding.pdf',
                    },
                ],
        }
        notice = `${person.name} finished onboarding and can be rostered.`
    } else if (person.status === 'active') {
        nextPerson = { ...nextPerson, status: 'onboarding' }
        tone = 'warn'
        notice = `${person.name} is back in onboarding and cannot be rostered.`
    }
    return ok(
        log(
            { ...state, people: state.people.map((item) => (item.id === personId ? nextPerson : item)) },
            'system',
            notice,
        ),
        notice,
        tone,
    )
}

export type DemoInput = {
    name: string
    company: string
    email: string
    phone: string
    crewSize: string
    note: string
}

export function bookDemo(state: AppState, input: DemoInput): Result {
    if (!input.name.trim() || !input.email.trim() || !input.company.trim()) {
        return ok(state, 'Name, company and email are required.', 'bad')
    }
    const request = { id: uid('demo'), ...input, at: new Date().toISOString() }
    return ok(
        log(
            { ...state, demoRequests: [request, ...state.demoRequests] },
            'system',
            `Demo request from ${input.name} at ${input.company}.`,
        ),
        `Thanks ${input.name}. The request is in the office inbox.`,
    )
}
