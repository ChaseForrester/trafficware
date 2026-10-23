import { Link } from 'react-router-dom'
import { AU_STATES, conductFor } from '../lib/conduct.ts'
import type { AuState } from '../lib/conduct.ts'
import { useStore } from '../lib/store.tsx'
import { IconKicker } from './Icons.tsx'

export function StatePack() {
    const { state, updateSettings } = useStore()
    const region = state.settings.homeState
    const conduct = conductFor(region)

    return (
        <section className="card">
            <IconKicker name="rules">{conduct.authority}</IconKicker>
            <h2>Paperwork for {conduct.name}</h2>
            <label className="field">
                State on the docket
                <select
                    value={region}
                    onChange={(event) => {
                        const next = event.target.value as AuState
                        if ((AU_STATES as readonly string[]).includes(next)) updateSettings({ homeState: next })
                    }}
                >
                    {AU_STATES.map((item) => (
                        <option key={item} value={item}>{item}</option>
                    ))}
                </select>
            </label>
            <p>{conduct.instrument}</p>
            <p className="muted">
                The board still refuses a name when the ticket is expired, the week is over {state.settings.maxWeekHours} hours,
                or the gap since the last shift is under {state.settings.minRestHours} hours. Those limits live in the yard settings.
            </p>
            <p><Link to="/dockets/codes">State codes on the docket</Link> · <Link to="/guides">How the checks are written</Link></p>
        </section>
    )
}
