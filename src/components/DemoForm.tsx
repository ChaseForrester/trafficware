import { useState } from 'react'
import type { FormEvent } from 'react'
import { useStore } from '../lib/store.tsx'

const empty = { name: '', company: '', email: '', phone: '', crewSize: '15-40', note: '' }

export function DemoForm() {
    const { bookDemo } = useStore()
    const [form, setForm] = useState(empty)
    const [sent, setSent] = useState(false)

    function onSubmit(event: FormEvent) {
        event.preventDefault()
        const result = bookDemo(form)
        if (result.tone !== 'bad') {
            setSent(true)
            setForm(empty)
        }
    }

    if (sent) {
        return (
            <div className="card">
                <p className="kicker">Request received</p>
                <h3>It is in the office inbox.</h3>
                <p className="muted">Open Today in the platform and you will see the request sitting with the live jobs.</p>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setSent(false)}>
                    Send another
                </button>
            </div>
        )
    }

    return (
        <form className="form" onSubmit={onSubmit}>
            <div className="form-row">
                <label className="field">
                    Name
                    <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                </label>
                <label className="field">
                    Company
                    <input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} required />
                </label>
            </div>
            <div className="form-row">
                <label className="field">
                    Email
                    <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
                </label>
                <label className="field">
                    Phone
                    <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                </label>
            </div>
            <label className="field">
                Crew size
                <select value={form.crewSize} onChange={(event) => setForm({ ...form, crewSize: event.target.value })}>
                    <option>Under 15</option>
                    <option>15-40</option>
                    <option>40-80</option>
                    <option>More than 80</option>
                </select>
            </label>
            <label className="field">
                What do you want to see?
                <textarea rows={4} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
            </label>
            <button type="submit" className="btn btn-primary">
                Book a demo
            </button>
        </form>
    )
}
