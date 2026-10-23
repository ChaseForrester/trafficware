import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGrok } from '../../components/GrokDock.tsx'
import { closeoutReview, invoiceDrafts, payrollRows } from '../../lib/bots.ts'
import { downloadCsv, money, prettyDate, round1 } from '../../lib/format.ts'
import { findPerson, statusFor } from '../../lib/rules.ts'
import { useStore } from '../../lib/store.tsx'

export function Closeout() {
    const store = useStore()
    const grok = useGrok()
    const { state, today } = store
    const [date, setDate] = useState(today)
    const [reasons, setReasons] = useState<Record<string, string>>({})
    const review = useMemo(() => closeoutReview(state, date), [state, date])
    const rows = payrollRows(state, date)
    const drafts = invoiceDrafts(state)
    const jobs = state.bookings.filter((booking) => booking.date === date)

    function exportPayroll() {
        const all = payrollRows(state)
        if (!all.length) return
        downloadCsv('trafficware-payroll.csv', [
            ['Employee', 'Email', 'Date', 'Site', 'Start', 'End', 'Break mins', 'Hours', 'Rate type', 'Rate', 'Gross'],
            ...all.map((row) => [
                row.name, row.email, row.date, row.site, row.start, row.end, String(row.breakMins),
                String(row.hours), row.rateType, String(row.rate), String(row.gross),
            ]),
        ])
    }

    const bad = review.filter((item) => item.level === 'bad').length
    const warn = review.filter((item) => item.level === 'warn').length

    return (
        <div className="page-pad">
            <header className="page-title">
                <div>
                    <p className="kicker">Close-out bot</p>
                    <h1>Dockets, payroll, invoices</h1>
                </div>
                <label className="field inline">
                    Day
                    <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </label>
            </header>
            <section className="card">
                <p className="kicker">{prettyDate(date)}</p>
                <h2>{bad} blockers · {warn} warnings</h2>
                <ul className="feed">
                    {review.map((item, index) => (
                        <li key={`${item.bookingId}-${index}`}>
                            <em className={`dot dot-${item.level === 'ok' ? 'ok' : item.level === 'warn' ? 'warn' : 'bad'}`} />
                            <span>{item.message}</span>
                        </li>
                    ))}
                </ul>
                <div className="hero-actions">
                    <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => store.recordCloseout(date, `Close-out review for ${date}: ${bad} blockers, ${warn} warnings.`)}
                    >
                        Post review to the log
                    </button>
                    <button type="button" className="btn btn-amber btn-small" onClick={() => store.approveClean(date)}>
                        Approve clean dockets
                    </button>
                    <Link to={`/dockets?date=${date}`} className="btn btn-ghost btn-small">Print the day pack</Link>
                    <button
                        type="button"
                        className="btn btn-primary btn-small"
                        onClick={() => grok.openWith(`Write a short close-out note for ${date}. Name blockers first, then what is ready to approve. Use only the yard snapshot.`)}
                    >
                        Ask Grok to write it
                    </button>
                </div>
            </section>
            <div className="grid-2 page-gap">
                {jobs.map((job) => {
                    const status = statusFor(state, job)
                    const dockets = state.dockets.filter((docket) => docket.bookingId === job.id)
                    return (
                        <article key={job.id} className="card">
                            <p className="kicker">{status}</p>
                            <h2>{job.title}</h2>
                            <p className="muted">{job.start}–{job.end} · {job.site}</p>
                            {dockets.map((docket) => {
                                const person = findPerson(state, docket.personId)
                                const hours = round1(Math.max(0, duration(docket.start, docket.end) - docket.breakMins / 60))
                                return (
                                    <div key={docket.id} className="docket">
                                        <strong>{person?.name}</strong>
                                        <p className="muted">{docket.start}–{docket.end} · break {docket.breakMins}m · {hours}h pay · {docket.status}</p>
                                        {docket.notes && <p>{docket.notes}</p>}
                                        {docket.nearMiss && <p className="issue warn">Near miss: {docket.nearMiss}{docket.photoName ? ` · ${docket.photoName}` : ''}</p>}
                                        {docket.queryNote && <p className="issue bad">Query: {docket.queryNote}</p>}
                                        <p className="muted">Signed {docket.signedBy || '—'}</p>
                                        <Link to={`/docket/${docket.id}`}>Print this docket</Link>
                                        {docket.status !== 'approved' && (
                                            <div className="hero-actions">
                                                <button type="button" className="btn btn-primary btn-small" onClick={() => store.approveDocket(docket.id)}>Approve</button>
                                                <input
                                                    value={reasons[docket.id] ?? ''}
                                                    placeholder="Query reason"
                                                    onChange={(event) => setReasons({ ...reasons, [docket.id]: event.target.value })}
                                                />
                                                <button type="button" className="btn btn-ghost btn-small" onClick={() => store.queryDocket(docket.id, reasons[docket.id] ?? '')}>
                                                    Query
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            {!dockets.length && <p className="muted">No docket has reached the office for this job.</p>}
                        </article>
                    )
                })}
            </div>
            <section className="card page-gap">
                <div className="job-head">
                    <div>
                        <p className="kicker">Payroll</p>
                        <h2>Approved hours on {prettyDate(date)}</h2>
                    </div>
                    <button type="button" className="btn btn-ghost btn-small" onClick={exportPayroll}>Download payroll CSV</button>
                </div>
                {rows.length === 0 && <p className="muted">Nothing approved for this day yet. Yesterday&apos;s Footscray dockets are waiting, and Ballarat Road is already approved.</p>}
                <div className="table">
                    {rows.map((row) => (
                        <div key={row.docketId} className="table-row">
                            <strong>{row.name}</strong>
                            <span>{row.rateType}</span>
                            <span>{row.hours}h</span>
                            <span>{money(row.gross)}</span>
                        </div>
                    ))}
                </div>
            </section>
            <section className="card page-gap">
                <div className="job-head">
                    <div>
                        <p className="kicker">Invoices</p>
                        <h2>Charge-out against wage cost</h2>
                    </div>
                    <button type="button" className="btn btn-amber btn-small" onClick={() => store.createInvoices()}>Create invoices</button>
                </div>
                {drafts.map((draft) => (
                    <article key={draft.clientId} className="docket">
                        <strong>{draft.clientName}</strong>
                        <p>{draft.lines.join(' · ')}</p>
                        <p className="muted">{draft.hours}h · wages {money(draft.wages)} · invoice {money(draft.amount)} · margin {money(draft.amount - draft.wages)}</p>
                    </article>
                ))}
                {!drafts.length && <p className="muted">No approved jobs are waiting. Approve a day, then create the invoice.</p>}
                {state.invoices.map((invoice) => {
                    const client = state.clients.find((item) => item.id === invoice.clientId)
                    return (
                        <article key={invoice.id} className="docket">
                            <strong>{invoice.number} · {client?.name}</strong>
                            <p className="muted">{invoice.status} · {invoice.hours}h · {money(invoice.amount)}</p>
                        </article>
                    )
                })}
            </section>
        </div>
    )
}

function duration(start: string, end: string) {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    let mins = eh * 60 + em - (sh * 60 + sm)
    if (mins <= 0) mins += 24 * 60
    return mins / 60
}
