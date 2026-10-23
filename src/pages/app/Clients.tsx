import { useState } from 'react'
import type { FormEvent } from 'react'
import { IconKicker } from '../../components/Icons.tsx'
import { money, prettyDate } from '../../lib/format.ts'
import { statusFor } from '../../lib/rules.ts'
import { useStore } from '../../lib/store.tsx'

export function Clients() {
    const { state, addClient } = useStore()
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState({ name: '', contact: '', email: '', phone: '', billingRate: 110 })

    function onSubmit(event: FormEvent) {
        event.preventDefault()
        const result = addClient(form)
        if (result.tone !== 'bad') {
            setOpen(false)
            setForm({ name: '', contact: '', email: '', phone: '', billingRate: 110 })
        }
    }

    return (
        <div className="page-pad">
            <header className="page-title">
                <div>
                    <IconKicker name="clients">Clients</IconKicker>
                    <h1>Who the jobs are for</h1>
                </div>
                <button type="button" className="btn btn-primary btn-small" onClick={() => setOpen((value) => !value)}>
                    {open ? 'Close' : 'Add client'}
                </button>
            </header>
            {open && (
                <form className="card form" onSubmit={onSubmit}>
                    <div className="form-row">
                        <label className="field">Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
                        <label className="field">Contact<input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} /></label>
                    </div>
                    <div className="form-row">
                        <label className="field">Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                        <label className="field">Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                        <label className="field">Charge-out $/h<input type="number" min="0" value={form.billingRate} onChange={(event) => setForm({ ...form, billingRate: Number(event.target.value) })} /></label>
                    </div>
                    <button type="submit" className="btn btn-amber btn-small">Save client</button>
                </form>
            )}
            <div className="grid-2">
                {state.clients.map((client) => {
                    const jobs = state.bookings.filter((booking) => booking.clientId === client.id)
                    const invoiced = state.invoices.filter((invoice) => invoice.clientId === client.id)
                    return (
                        <article key={client.id} className="card">
                            <IconKicker name="clients">{money(client.billingRate)} / hour charge-out</IconKicker>
                            <h2>{client.name}</h2>
                            <p className="muted">{client.contact} · {client.email} · {client.phone}</p>
                            <ul className="feed">
                                {jobs.map((job) => (
                                    <li key={job.id}>
                                        <span>
                                            <strong>{job.title}</strong>
                                            <small>{prettyDate(job.date)} · {job.start}–{job.end} · {statusFor(state, job)}</small>
                                        </span>
                                    </li>
                                ))}
                                {!jobs.length && <li>No jobs yet.</li>}
                            </ul>
                            {invoiced.length > 0 && <p className="muted">{invoiced.length} invoice{invoiced.length === 1 ? '' : 's'} on file.</p>}
                        </article>
                    )
                })}
            </div>
        </div>
    )
}
