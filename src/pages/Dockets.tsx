import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { TechStack } from '../components/Icons.tsx'
import { useTitle } from '../components/useTitle.ts'
import { AU_STATES, NATIONAL, conductFor, type AuState } from '../lib/conduct.ts'
import { conductIndexHtml, docketInnerHtml, docketPackHtml, docketStandaloneHtml, downloadHtml, type DocketModel } from '../lib/docketDocument.ts'
import { prettyDate, round1, shiftHours } from '../lib/format.ts'
import { findClient, findPerson, findVehicle } from '../lib/rules.ts'
import { useSession } from '../lib/session.tsx'
import { useStore } from '../lib/store.tsx'
import type { AppState, Docket } from '../types.ts'

function companyOf(state: AppState, session: { companyName: string; abn: string } | null) {
    return {
        companyName: session?.companyName || state.settings.companyName,
        abn: session?.abn || '',
    }
}

function toDocketModel(state: AppState, docket: Docket, region: AuState, session: { companyName: string; abn: string } | null): DocketModel {
    const booking = state.bookings.find((item) => item.id === docket.bookingId)
    const person = findPerson(state, docket.personId)
    const client = booking ? findClient(state, booking.clientId) : null
    const vehicle = booking ? findVehicle(state, booking.vehicleId) : null
    const slot = booking?.slots.find((item) => item.personId === docket.personId)
    const gear = (booking?.equipment ?? []).map((item) => {
        const piece = state.equipment.find((gearItem) => gearItem.id === item.id)
        return `${piece?.name ?? item.id} × ${item.qty}`
    })
    const hours = round1(Math.max(0, shiftHours(docket.start, docket.end) - docket.breakMins / 60))
    const tickets = (person?.skills ?? []).map((skill) => ({ name: skill.name, expires: skill.expires, document: skill.document }))
    const onDate = booking?.date ?? ''
    const company = companyOf(state, session)
    return {
        ...company,
        state: region,
        number: docket.id.toUpperCase(),
        job: booking?.title ?? 'Job',
        site: booking?.site ?? '',
        client: client?.name ?? '',
        date: onDate,
        roster: booking ? `${booking.start}–${booking.end}` : '',
        actualStart: docket.start,
        actualEnd: docket.end,
        breakMins: String(docket.breakMins),
        hours: String(hours),
        role: slot?.role ?? person?.title ?? '',
        worker: person?.name ?? docket.signedBy,
        phone: person?.phone ?? '',
        signedBy: docket.signedBy,
        notes: [docket.notes, docket.queryNote ? `Office query: ${docket.queryNote}` : ''].filter(Boolean).join(' '),
        nearMiss: docket.nearMiss,
        photo: docket.photoName,
        status: docket.status,
        vehicle: vehicle ? `${vehicle.name} · ${vehicle.rego}` : '',
        gear,
        tickets,
        ticketOk: tickets.length > 0 && tickets.every((ticket) => ticket.expires >= onDate),
        signed: Boolean(docket.signedBy),
    }
}

function blankModel(companyName: string, abn: string, region: AuState): DocketModel {
    return {
        companyName,
        abn,
        state: region,
        number: 'BLANK',
        job: '',
        site: '',
        client: '',
        date: '',
        roster: '',
        actualStart: '',
        actualEnd: '',
        breakMins: '',
        hours: '',
        role: '',
        worker: '',
        phone: '',
        signedBy: '',
        notes: '',
        nearMiss: '',
        photo: '',
        status: 'Blank',
        vehicle: '',
        gear: [],
        tickets: [],
        ticketOk: false,
        signed: false,
    }
}

function DocketScreen({ children }: { children: ReactNode }) {
    return (
        <main className="docket-page">
            <div className="stack-bar no-print">
                <TechStack />
            </div>
            {children}
        </main>
    )
}

function findDocket(state: AppState, id: string) {
    return state.dockets.find((item) => item.id === id) ?? state.outbox.find((item) => item.id === id) ?? null
}

function StateSelect({ value, onChange }: { value: AuState; onChange: (next: AuState) => void }) {
    return (
        <label className="field">
            State on this sheet
            <select value={value} onChange={(event) => onChange(event.target.value as AuState)}>
                {AU_STATES.map((item) => <option key={item}>{item}</option>)}
            </select>
        </label>
    )
}

function Sheet({ model }: { model: DocketModel }) {
    const html = useMemo(() => docketInnerHtml(model), [model])
    return <article className="docket-sheet" dangerouslySetInnerHTML={{ __html: html }} />
}

export function DocketSheet() {
    const { id = '' } = useParams()
    const { state } = useStore()
    const { session } = useSession()
    const docket = findDocket(state, id)
    const [region, setRegion] = useState<AuState>(session?.state ?? 'VIC')
    useTitle(docket ? `Docket ${docket.id} · Trafficware` : 'Docket · Trafficware')

    if (!docket) {
        return (
            <DocketScreen>
                <p>That docket is not on this device.</p>
                <Link to="/dockets">Back to the pack</Link>
            </DocketScreen>
        )
    }

    if (session?.role === 'field' && docket.personId !== session.personId) {
        return (
            <DocketScreen>
                <h1>This docket is not yours.</h1>
                <p>Field access shows only the dockets you signed.</p>
                <Link to="/field">Back to my jobs</Link>
            </DocketScreen>
        )
    }

    const model = toDocketModel(state, docket, region, session)
    const back = session?.role === 'field' ? '/field' : '/app/closeout'

    return (
        <DocketScreen>
            <div className="docket-tools no-print">
                <Link to={back}>Back</Link>
                <StateSelect value={region} onChange={setRegion} />
                <button type="button" className="btn btn-primary btn-small" onClick={() => window.print()}>Print</button>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => downloadHtml(`${model.number}.html`, docketStandaloneHtml(model))}>
                    Download
                </button>
            </div>
            <Sheet model={model} />
        </DocketScreen>
    )
}

export function DocketPack() {
    useTitle('Docket pack · Trafficware')
    const { state, today } = useStore()
    const { session } = useSession()
    const [params] = useSearchParams()
    const [date, setDate] = useState(params.get('date') || today)
    const [region, setRegion] = useState<AuState>(session?.state ?? 'VIC')
    const mine = session?.role === 'field' ? session.personId : null
    const seen = new Set<string>()
    const dockets = [...state.dockets, ...state.outbox].filter((docket) => {
        if (seen.has(docket.id)) return false
        seen.add(docket.id)
        const booking = state.bookings.find((item) => item.id === docket.bookingId)
        if (!booking || booking.date !== date) return false
        if (mine && docket.personId !== mine) return false
        return true
    })
    const models = dockets.map((docket) => toDocketModel(state, docket, region, session))
    const company = companyOf(state, session)

    return (
        <DocketScreen>
            <div className="docket-tools no-print">
                <Link to={mine ? '/field' : '/app/closeout'}>Back</Link>
                <label className="field">
                    Day
                    <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </label>
                <StateSelect value={region} onChange={setRegion} />
                <button type="button" className="btn btn-primary btn-small" onClick={() => window.print()} disabled={!models.length}>Print this day</button>
                <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    disabled={!models.length}
                    onClick={() => downloadHtml(`trafficware-dockets-${date}-${region}.html`, docketPackHtml(models))}
                >
                    Download this day
                </button>
                <Link className="btn btn-ghost btn-small" to="/dockets/blank">Blank sheet</Link>
                <Link className="btn btn-ghost btn-small" to="/dockets/codes">All state codes</Link>
            </div>
            <p className="no-print muted">
                {mine ? 'Your dockets only. ' : 'Office pack. '}
                {prettyDate(date)} · {conductFor(region).name}. The sheet names the ACCC and the {region} instrument. It is not a copy of the manual.
            </p>
            {models.map((model) => <Sheet key={model.number} model={model} />)}
            {!models.length && <p>No docket is filed for {prettyDate(date)}.</p>}
            <p className="no-print"><button type="button" className="btn btn-ghost btn-small" onClick={() => downloadHtml(`${company.companyName}-codes.html`, conductIndexHtml(company.companyName))}>Download the code index</button></p>
        </DocketScreen>
    )
}

export function DocketBlank() {
    useTitle('Blank docket · Trafficware')
    const { state } = useStore()
    const { session } = useSession()
    const [region, setRegion] = useState<AuState>(session?.state ?? 'VIC')
    const company = companyOf(state, session)
    const model = blankModel(company.companyName, company.abn, region)

    return (
        <DocketScreen>
            <div className="docket-tools no-print">
                <Link to="/dockets">Back</Link>
                <StateSelect value={region} onChange={setRegion} />
                <button type="button" className="btn btn-primary btn-small" onClick={() => window.print()}>Print</button>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => downloadHtml(`trafficware-blank-${region}.html`, docketStandaloneHtml(model))}>
                    Download
                </button>
            </div>
            <Sheet model={model} />
        </DocketScreen>
    )
}

export function DocketCodes() {
    useTitle('Codes on a docket · Trafficware')
    const { state } = useStore()
    const { session } = useSession()
    const company = companyOf(state, session)

    return (
        <DocketScreen>
            <div className="docket-tools no-print">
                <Link to="/dockets">Back</Link>
                <button type="button" className="btn btn-primary btn-small" onClick={() => window.print()}>Print</button>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => downloadHtml(`${company.companyName}-codes.html`, conductIndexHtml(company.companyName))}>
                    Download
                </button>
            </div>
            <article className="docket-sheet">
                <p className="ds-kicker">Print index</p>
                <h1>{company.companyName}</h1>
                <p>Each job docket names the national rules and the instrument for the state the job was worked in. This page lists every state.</p>
                <h2>National, on every docket</h2>
                <p>{NATIONAL.standard}</p>
                <p>{NATIONAL.austroads}</p>
                <p><strong>Fair trading.</strong> {NATIONAL.acl}</p>
                <p className="ds-note">These sheets name the rules. They are not copies of the state manuals.</p>
                {AU_STATES.map((id) => {
                    const conduct = conductFor(id)
                    return (
                        <section key={id}>
                            <h2>{conduct.id} · {conduct.name}</h2>
                            <p><strong>{conduct.authority}.</strong> {conduct.instrument}</p>
                            <p><strong>Road law.</strong> {conduct.law}</p>
                            <p><strong>Safety.</strong> {conduct.whs}</p>
                        </section>
                    )
                })}
            </article>
        </DocketScreen>
    )
}
