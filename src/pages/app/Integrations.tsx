import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { invoiceDrafts, payrollRows } from '../../lib/bots.ts'
import { downloadCsv, prettyWhen } from '../../lib/format.ts'
import { loadPin } from '../../lib/grok.ts'
import { useStore } from '../../lib/store.tsx'
import { disconnectXero, pushXero, xeroStatus } from '../../lib/yardCloud.ts'
import type { XeroInvoice, XeroStatus } from '../../lib/yardCloud.ts'
import type { IntegrationId } from '../../types.ts'
import { IconKicker } from '../../components/Icons.tsx'
import { IntegrationMark } from '../../components/Marks.tsx'

export function Integrations() {
    const store = useStore()
    const { state } = store
    const [xero, setXero] = useState<XeroStatus>({ configured: false, linked: false })
    const [code, setCode] = useState(loadPin())
    const [cloudMessage, setCloudMessage] = useState('')

    useEffect(() => {
        void xeroStatus().then(setXero)
    }, [])

    function invoiceRows(): XeroInvoice[] {
        if (state.invoices.length) {
            return state.invoices.map((invoice) => {
                const client = state.clients.find((item) => item.id === invoice.clientId)
                return {
                    number: invoice.number,
                    contact: client?.name ?? 'Traffic client',
                    email: client?.email ?? '',
                    hours: invoice.hours,
                    amount: invoice.amount,
                    description: `${invoice.number} · ${invoice.hours} hours`,
                }
            })
        }
        return invoiceDrafts(state).map((draft, index) => ({
            number: `DRAFT-${index + 1}`,
            contact: draft.clientName,
            email: draft.email,
            hours: draft.hours,
            amount: draft.amount,
            description: draft.lines.join(' · '),
        }))
    }

    function downloadInvoices(rows: XeroInvoice[]) {
        downloadCsv('trafficware-invoices.csv', [
            ['Number', 'Client', 'Email', 'Hours', 'Amount', 'Detail'],
            ...rows.map((row) => [row.number, row.contact, row.email, String(row.hours), String(row.amount), row.description]),
        ])
    }

    async function push(id: IntegrationId) {
        if (id === 'xero') {
            const rows = invoiceRows()
            if (!rows.length) {
                setCloudMessage('Approve dockets and create an invoice in close-out, then send it.')
                return
            }
            downloadInvoices(rows)
            const linked = (await xeroStatus()).linked
            if (!linked) {
                setCloudMessage('The CSV downloaded. Connect the Xero organisation before the draft can be created there.')
                return
            }
            try {
                const numbers = await pushXero(rows)
                store.setIntegration(id, true)
                store.pushIntegration(id)
                setCloudMessage(numbers.length ? `Xero drafts ${numbers.join(', ')}. The CSV downloaded too.` : 'Xero accepted the drafts. The CSV downloaded too.')
            } catch (error) {
                setCloudMessage(error instanceof Error ? error.message : 'Xero did not accept the invoices.')
            }
            return
        }
        const result = store.pushIntegration(id)
        if (result.download === 'payroll') {
            const rows = payrollRows(result.state)
            downloadCsv('trafficware-payroll.csv', [
                ['Employee', 'Email', 'Date', 'Site', 'Start', 'End', 'Break mins', 'Hours', 'Rate type', 'Rate', 'Gross'],
                ...rows.map((row) => [row.name, row.email, row.date, row.site, row.start, row.end, String(row.breakMins), String(row.hours), row.rateType, String(row.rate), String(row.gross)]),
            ])
        }
    }

    async function openCloud(event: FormEvent) {
        event.preventDefault()
        const text = await store.linkCloud(code)
        setCloudMessage(text)
    }

    return (
        <div className="page-pad">
            <header className="page-title">
                <div>
                    <IconKicker name="integrations">Integrations and APIs</IconKicker>
                    <h1>Hand the work to the next system</h1>
                </div>
            </header>
            <section className="card setup-card">
                <IconKicker name="cloud">Shared yard</IconKicker>
                <h2>Firestore holds one yard for both of you</h2>
                <p>{store.cloudNote}</p>
                <p className="muted">The project is trafficware-yard, in Sydney, on the Blaze plan. Email sign-in is on for the Super Admin and the client. The server key still reads and writes the yard, and this access code is the lock. The same code unlocks Grok.</p>
                <form className="hero-actions" onSubmit={openCloud}>
                    <label className="field">Access code
                        <input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" />
                    </label>
                    <button type="submit" className="btn btn-primary">Open the shared yard</button>
                </form>
                {cloudMessage ? <p role="status">{cloudMessage}</p> : null}
            </section>
            <section className="card setup-card">
                <IntegrationMark name="Xero" />
                <p className="kicker">{xero.linked ? 'Xero linked' : xero.configured ? 'Xero ready to link' : 'Xero keys not on the server'}</p>
                <h2>Draft invoices, Australian dollars</h2>
                <p>Connect creates draft sales invoices in the Xero organisation. Trafficware still calculates the hours and the rates. A CSV copy downloads either way.</p>
                <ol className="setup-steps">
                    <li>In Xero, open the developer portal and create a web app.</li>
                    <li>Redirect URI: <code>https://trafficware.vercel.app/api/xero-callback</code></li>
                    <li>Scopes: offline access, accounting invoices, accounting contacts.</li>
                    <li>Put the client id and secret on Vercel as <code>XERO_CLIENT_ID</code> and <code>XERO_CLIENT_SECRET</code>.</li>
                    <li>Optional <code>XERO_SALES_ACCOUNT</code> if the chart of accounts needs a code. Leave it blank to send the line without one.</li>
                    <li>Redeploy, then use Connect Xero on this page and approve the organisation.</li>
                </ol>
                <div className="hero-actions">
                    {xero.linked ? (
                        <button type="button" className="btn btn-ghost" onClick={() => void disconnectXero().then(() => setXero({ ...xero, linked: false }))}>Disconnect Xero</button>
                    ) : xero.configured ? (
                        <a className="btn btn-primary" href="/api/xero-connect">Connect Xero</a>
                    ) : (
                        <button type="button" className="btn btn-primary" onClick={() => setCloudMessage('Add XERO_CLIENT_ID and XERO_CLIENT_SECRET on Vercel, then redeploy, then connect.')}>Connect Xero</button>
                    )}
                    <button type="button" className="btn btn-amber" onClick={() => void push('xero')}>Send invoices</button>
                </div>
            </section>
            <div className="grid-2">
                {state.integrations.filter((item) => item.id !== 'xero').map((item) => (
                    <article key={item.id} className="card">
                        <IntegrationMark name={item.id === 'employment-hero' ? 'Employment Hero' : item.name.startsWith('GPS') ? 'GPS' : 'HR onboarding'} />
                        <p className="kicker">{item.connected ? 'Connected' : 'Not connected'}</p>
                        <h2>{item.name}</h2>
                        <p>{item.blurb}</p>
                        <p className="muted">{item.lastSync ? `Last sync ${prettyWhen(item.lastSync)}` : 'No sync yet'}</p>
                        <div className="hero-actions">
                            <button type="button" className="btn btn-ghost btn-small" onClick={() => store.setIntegration(item.id, !item.connected)}>
                                {item.connected ? 'Disconnect' : 'Connect'}
                            </button>
                            <button type="button" className="btn btn-amber btn-small" onClick={() => void push(item.id)}>
                                {item.id === 'gps' ? 'Ping fleet' : item.id === 'hr-onboarding' ? 'Sync starters' : 'Export now'}
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    )
}
