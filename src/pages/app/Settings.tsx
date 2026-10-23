import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useStore } from '../../lib/store.tsx'

export function Settings() {
    const { state, updateSettings, addDepot, resetDemo } = useStore()
    const [draft, setDraft] = useState(state.settings)
    const [depot, setDepot] = useState('')
    const [confirming, setConfirming] = useState(false)

    useEffect(() => {
        setDraft(state.settings)
    }, [state.settings])

    function onSubmit(event: FormEvent) {
        event.preventDefault()
        updateSettings({
            companyName: draft.companyName,
            maxShiftHours: Number(draft.maxShiftHours),
            maxWeekHours: Number(draft.maxWeekHours),
            minRestHours: Number(draft.minRestHours),
            expiryWarningDays: Number(draft.expiryWarningDays),
            defaultOrdinary: Number(draft.defaultOrdinary),
            defaultNight: Number(draft.defaultNight),
            defaultWeekend: Number(draft.defaultWeekend),
        })
    }

    return (
        <div className="page-pad">
            <header className="page-title">
                <div>
                    <p className="kicker">Configurations</p>
                    <h1>Rules the board enforces</h1>
                </div>
            </header>
            <form className="card form" onSubmit={onSubmit}>
                <label className="field">
                    Company name
                    <input value={draft.companyName} onChange={(event) => setDraft({ ...draft, companyName: event.target.value })} />
                </label>
                <div className="form-row">
                    <label className="field">Max shift hours<input type="number" min="1" step="0.5" value={draft.maxShiftHours} onChange={(event) => setDraft({ ...draft, maxShiftHours: Number(event.target.value) })} /></label>
                    <label className="field">Max hours in 7 days<input type="number" min="1" step="1" value={draft.maxWeekHours} onChange={(event) => setDraft({ ...draft, maxWeekHours: Number(event.target.value) })} /></label>
                    <label className="field">Minimum rest hours<input type="number" min="0" step="0.5" value={draft.minRestHours} onChange={(event) => setDraft({ ...draft, minRestHours: Number(event.target.value) })} /></label>
                    <label className="field">Ticket warning days<input type="number" min="1" step="1" value={draft.expiryWarningDays} onChange={(event) => setDraft({ ...draft, expiryWarningDays: Number(event.target.value) })} /></label>
                </div>
                <div className="form-row">
                    <label className="field">Default ordinary<input type="number" min="0" value={draft.defaultOrdinary} onChange={(event) => setDraft({ ...draft, defaultOrdinary: Number(event.target.value) })} /></label>
                    <label className="field">Default night<input type="number" min="0" value={draft.defaultNight} onChange={(event) => setDraft({ ...draft, defaultNight: Number(event.target.value) })} /></label>
                    <label className="field">Default weekend<input type="number" min="0" value={draft.defaultWeekend} onChange={(event) => setDraft({ ...draft, defaultWeekend: Number(event.target.value) })} /></label>
                </div>
                <button type="submit" className="btn btn-primary btn-small">Save rules</button>
                <p className="muted">Fatigue uses rostered start to finish, before meal breaks. Raise the weekly limit if you want Aisha Rahman to clear a shift.</p>
            </form>
            <section className="card page-gap">
                <h2>Depots</h2>
                <p>{state.settings.depots.join(' · ')}</p>
                <form
                    className="form-row"
                    onSubmit={(event) => {
                        event.preventDefault()
                        const result = addDepot(depot)
                        if (result.tone !== 'bad') setDepot('')
                    }}
                >
                    <label className="field">
                        New depot
                        <input value={depot} onChange={(event) => setDepot(event.target.value)} />
                    </label>
                    <button type="submit" className="btn btn-ghost btn-small">Add depot</button>
                </form>
            </section>
            <section className="card page-gap">
                <p className="kicker">Central database</p>
                <h2>Saved in this browser</h2>
                <p>
                    Firebase is not connected. The store reads and writes through <code>src/lib/persistence.ts</code>.
                    Swap that file when the cloud database is ready. GitHub and Vercel can host this build as a static site.
                </p>
                {!confirming && (
                    <button type="button" className="btn btn-danger btn-small" onClick={() => setConfirming(true)}>
                        Restore sample week
                    </button>
                )}
                {confirming && (
                    <div className="hero-actions">
                        <p>This replaces people, jobs, dockets and invoices on this device.</p>
                        <button type="button" className="btn btn-danger btn-small" onClick={() => resetDemo()}>Restore</button>
                        <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirming(false)}>Cancel</button>
                    </div>
                )}
            </section>
        </div>
    )
}
