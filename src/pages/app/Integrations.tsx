import { invoiceDrafts, payrollRows } from '../../lib/bots.ts'
import { downloadCsv, prettyWhen } from '../../lib/format.ts'
import { useStore } from '../../lib/store.tsx'
import type { IntegrationId } from '../../types.ts'

export function Integrations() {
    const store = useStore()
    const { state } = store

    function push(id: IntegrationId) {
        const result = store.pushIntegration(id)
        if (result.download === 'payroll') {
            const rows = payrollRows(result.state)
            downloadCsv('trafficware-payroll.csv', [
                ['Employee', 'Email', 'Date', 'Site', 'Start', 'End', 'Break mins', 'Hours', 'Rate type', 'Rate', 'Gross'],
                ...rows.map((row) => [row.name, row.email, row.date, row.site, row.start, row.end, String(row.breakMins), String(row.hours), row.rateType, String(row.rate), String(row.gross)]),
            ])
        }
        if (result.download === 'invoices') {
            const drafts = invoiceDrafts(result.state)
            const lines = result.state.invoices.length
                ? result.state.invoices.map((invoice) => {
                    const client = result.state.clients.find((item) => item.id === invoice.clientId)
                    return [invoice.number, client?.name ?? '', client?.email ?? '', invoice.createdAt.slice(0, 10), String(invoice.hours), String(invoice.amount), invoice.status]
                })
                : drafts.map((draft) => ['DRAFT', draft.clientName, draft.email, '', String(draft.hours), String(draft.amount), draft.lines.join(' | ')])
            downloadCsv('trafficware-invoices.csv', [
                ['Number', 'Client', 'Email', 'Date', 'Hours', 'Amount', 'Detail'],
                ...lines,
            ])
        }
    }

    return (
        <div className="page-pad">
            <header className="page-title">
                <div>
                    <p className="kicker">Integrations and APIs</p>
                    <h1>Hand the work to the next system</h1>
                </div>
            </header>
            <p className="muted">Connecting here is a demo switch stored on this device. Downloads are real CSV files.</p>
            <div className="grid-2">
                {state.integrations.map((item) => (
                    <article key={item.id} className="card">
                        <p className="kicker">{item.connected ? 'Connected' : 'Not connected'}</p>
                        <h2>{item.name}</h2>
                        <p>{item.blurb}</p>
                        <p className="muted">{item.lastSync ? `Last sync ${prettyWhen(item.lastSync)}` : 'No sync yet'}</p>
                        <div className="hero-actions">
                            <button type="button" className="btn btn-ghost btn-small" onClick={() => store.setIntegration(item.id, !item.connected)}>
                                {item.connected ? 'Disconnect' : 'Connect'}
                            </button>
                            <button type="button" className="btn btn-amber btn-small" onClick={() => push(item.id)}>
                                {item.id === 'gps' ? 'Ping fleet' : item.id === 'hr-onboarding' ? 'Sync starters' : 'Export now'}
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    )
}
