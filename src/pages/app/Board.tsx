import { useState } from 'react'
import type { FormEvent } from 'react'
import { IconKicker } from '../../components/Icons.tsx'
import { RosterBoard } from '../../components/RosterBoard.tsx'
import { WeekRoster } from '../../components/WeekRoster.tsx'
import { ROLES } from '../../types.ts'
import { useStore } from '../../lib/store.tsx'

export function BoardPage() {
    const { state, today, createBooking } = useStore()
    const [focus, setFocus] = useState(today)
    const [open, setOpen] = useState(false)
    const [roles, setRoles] = useState<string[]>(['Team Leader', 'Traffic Controller'])
    const [form, setForm] = useState({
        title: '',
        clientId: state.clients[0]?.id ?? '',
        site: '',
        depot: state.settings.depots[0] ?? 'West',
        date: today,
        start: '07:00',
        end: '15:30',
        notes: '',
        vehicleId: '',
    })

    function onSubmit(event: FormEvent) {
        event.preventDefault()
        const result = createBooking({ ...form, roles, vehicleId: form.vehicleId || null })
        if (result.tone !== 'bad') {
            setOpen(false)
            setForm({ ...form, title: '', site: '', notes: '' })
        }
    }

    return (
        <div className="page-pad">
            <header className="page-title">
                <div>
                    <IconKicker name="board">Drag-and-drop rostering</IconKicker>
                    <h1>Week view, then the day board</h1>
                </div>
                <button type="button" className="btn btn-primary btn-small" onClick={() => setOpen((value) => !value)}>
                    {open ? 'Close form' : 'New job'}
                </button>
            </header>
            <WeekRoster date={focus} onDate={setFocus} />
            {open && (
                <form className="card form" onSubmit={onSubmit}>
                    <div className="form-row">
                        <label className="field">
                            Job name
                            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
                        </label>
                        <label className="field">
                            Client
                            <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}>
                                {state.clients.map((client) => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label className="field">
                        Site
                        <input value={form.site} onChange={(event) => setForm({ ...form, site: event.target.value })} required />
                    </label>
                    <div className="form-row">
                        <label className="field">
                            Depot
                            <select value={form.depot} onChange={(event) => setForm({ ...form, depot: event.target.value })}>
                                {state.settings.depots.map((depot) => (
                                    <option key={depot}>{depot}</option>
                                ))}
                            </select>
                        </label>
                        <label className="field">
                            Date
                            <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
                        </label>
                        <label className="field">
                            Start
                            <input type="time" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} required />
                        </label>
                        <label className="field">
                            End
                            <input type="time" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} required />
                        </label>
                    </div>
                    <div className="form-row">
                        <label className="field">
                            Vehicle
                            <select value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}>
                                <option value="">None</option>
                                {state.vehicles.map((vehicle) => (
                                    <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
                                ))}
                            </select>
                        </label>
                        <label className="field">
                            Notes
                            <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
                        </label>
                    </div>
                    <fieldset className="roles">
                        <legend>Slots</legend>
                        {roles.map((role, index) => (
                            <div key={`${role}-${index}`} className="role-line">
                                <select
                                    value={role}
                                    onChange={(event) => setRoles(roles.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
                                >
                                    {ROLES.map((item) => (
                                        <option key={item}>{item}</option>
                                    ))}
                                </select>
                                <button type="button" className="text-btn" onClick={() => setRoles(roles.filter((_, itemIndex) => itemIndex !== index))}>
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button type="button" className="btn btn-ghost btn-small" onClick={() => setRoles([...roles, 'Traffic Controller'])}>
                            Add slot
                        </button>
                    </fieldset>
                    <button type="submit" className="btn btn-amber">Put it on the board</button>
                </form>
            )}
            <RosterBoard focusDate={focus} onFocusDate={setFocus} />
        </div>
    )
}
