import { Link } from 'react-router-dom'
import { Icon, IconKicker } from '../../components/Icons.tsx'
import type { IconName } from '../../components/Icons.tsx'
import { usePair } from '../../lib/pair.tsx'
import { useStore } from '../../lib/store.tsx'

const LINKS: { to: string; title: string; detail: string; icon: IconName }[] = [
    { to: '/app/closeout', title: 'Close-out', detail: 'Dockets, pay and invoices', icon: 'closeout' },
    { to: '/app/fleet', title: 'Fleet and gear', detail: 'Trucks, cones and towers', icon: 'fleet' },
    { to: '/app/clients', title: 'Clients', detail: 'Who the jobs are for', icon: 'clients' },
    { to: '/app/integrations', title: 'Exports', detail: 'Payroll and invoice files', icon: 'integrations' },
    { to: '/app/settings', title: 'Rules', detail: 'Hours, rest, depots, sample week', icon: 'rules' },
    { to: '/', title: 'About the product', detail: 'The public site', icon: 'product' },
]

export function More() {
    const { state } = useStore()
    const pair = usePair()
    const people = [...state.people].sort((a, b) => a.name.localeCompare(b.name))

    return (
        <div className="page-pad">
            <header className="page-title">
                <div>
                    <IconKicker name="more">More</IconKicker>
                    <h1>The two of you</h1>
                </div>
            </header>
            <section className="card">
                <p>This app is shared by two people. Pick who those two are. The name highlighted in the top bar is holding the phone, and Field opens on their jobs.</p>
                <div className="form-row">
                    <label className="field">
                        First
                        <select value={pair.primaryId} onChange={(event) => pair.setPrimary(event.target.value)}>
                            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                        </select>
                    </label>
                    <label className="field">
                        Second
                        <select value={pair.partnerId} onChange={(event) => pair.setPartner(event.target.value)}>
                            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                        </select>
                    </label>
                </div>
            </section>
            <div className="more-list">
                {LINKS.map((link) => (
                    <Link key={link.to} to={link.to} className="more-link">
                        <Icon name={link.icon} />
                        <strong>{link.title}</strong>
                        <span>{link.detail}</span>
                    </Link>
                ))}
            </div>
            <section className="card">
                <h2>On your phone</h2>
                <p>In Safari or Chrome, use Share or the browser menu and choose Add to Home Screen. It opens full screen, like an app, and the last screen stays available if the signal drops.</p>
            </section>
        </div>
    )
}
