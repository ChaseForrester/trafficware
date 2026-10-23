import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTitle } from '../components/useTitle.ts'
import { signIn } from '../lib/auth.ts'
import { AU_STATES } from '../lib/conduct.ts'
import type { AuState } from '../lib/conduct.ts'
import { usePair } from '../lib/pair.tsx'
import { useSession } from '../lib/session.tsx'
import { useStore } from '../lib/store.tsx'

export function StartCompany() {
    useTitle('Start your company · Trafficware')
    const { state } = useStore()
    const { enter } = useSession()
    const navigate = useNavigate()
    const [companyName, setCompanyName] = useState(state.settings.companyName)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [abn, setAbn] = useState('')
    const [region, setRegion] = useState<AuState>('VIC')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    async function onSubmit(event: FormEvent) {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
            const profile = await signIn(email, password, 'super-admin')
            enter({
                ...profile,
                companyName: companyName.trim(),
                abn: abn.trim(),
                state: region,
                personId: null,
            })
            navigate('/app')
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Sign-in did not complete.')
            setBusy(false)
        }
    }

    return (
        <main className="wrap page enter-page">
            <p className="kicker">Super Admin</p>
            <h1>Open the office for your company.</h1>
            <p className="lede">You get the desktop board, people, rates, close-out and the docket pack. Sign in with the Super Admin account.</p>
            <form className="card form" onSubmit={onSubmit}>
                <label className="field">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
                <label className="field">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
                <label className="field">Company<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required /></label>
                <label className="field">ABN<input value={abn} onChange={(event) => setAbn(event.target.value)} inputMode="numeric" placeholder="Optional, printed on dockets" /></label>
                <label className="field">
                    Home state
                    <select value={region} onChange={(event) => setRegion(event.target.value as AuState)}>
                        {AU_STATES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                </label>
                {error ? <p className="form-error" role="alert">{error}</p> : null}
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Checking…' : 'Enter the office'}</button>
            </form>
            <p><Link to="/business">What the office page covers</Link> · <Link to="/join">I work on the tools instead</Link></p>
        </main>
    )
}

export function JoinCompany() {
    useTitle('Join a company · Trafficware')
    const { state } = useStore()
    const { enter } = useSession()
    const pair = usePair()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    async function onSubmit(event: FormEvent) {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
            const profile = await signIn(email, password, 'field')
            const person = state.people.find((item) => item.id === profile.personId)
            enter({
                ...profile,
                personName: person?.name || profile.personName,
            })
            if (profile.personId) pair.setHolder(profile.personId)
            navigate('/field')
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Sign-in did not complete.')
            setBusy(false)
        }
    }

    return (
        <main className="wrap page enter-page">
            <p className="kicker">Field</p>
            <h1>Join the crew.</h1>
            <p className="lede">You see your own jobs, tickets and dockets. Pay rates, the booking board and invoices stay in the office. Sign in with the client account.</p>
            <form className="card form" onSubmit={onSubmit}>
                <label className="field">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
                <label className="field">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
                {error ? <p className="form-error" role="alert">{error}</p> : null}
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Checking…' : 'Open my jobs'}</button>
            </form>
            <p><Link to="/crew">What the crew page covers</Link> · <Link to="/start">I run the company instead</Link></p>
        </main>
    )
}
