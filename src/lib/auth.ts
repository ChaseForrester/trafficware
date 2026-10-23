import type { WorkspaceRole, WorkspaceSession } from './session.tsx'

const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY
const AUTH_KEY = 'trafficware.auth'

type StoredAuth = {
    idToken: string
    refreshToken: string
    expiresAt: number
}

function messageFor(code: string) {
    if (
        code.includes('INVALID_LOGIN_CREDENTIALS')
        || code.includes('EMAIL_NOT_FOUND')
        || code.includes('INVALID_PASSWORD')
        || code.includes('INVALID_EMAIL')
    ) {
        return 'That email or password does not match.'
    }
    if (code.includes('TOO_MANY_ATTEMPTS')) return 'Too many attempts. Wait a minute and try again.'
    if (code.includes('USER_DISABLED')) return 'This account is turned off.'
    return 'Sign-in did not complete. Try again.'
}

function readAuth(): StoredAuth | null {
    try {
        const raw = sessionStorage.getItem(AUTH_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as StoredAuth
        if (!parsed?.idToken || !parsed.expiresAt) return null
        return parsed
    } catch {
        return null
    }
}

function writeAuth(auth: StoredAuth) {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(auth))
}

export function hasStoredAuth() {
    return Boolean(readAuth())
}

export function clearAuth() {
    sessionStorage.removeItem(AUTH_KEY)
}

export async function currentIdToken() {
    const stored = readAuth()
    if (!stored || !API_KEY) return ''
    if (stored.expiresAt > Date.now() + 60_000) return stored.idToken
    if (!stored.refreshToken) {
        clearAuth()
        return ''
    }
    const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: stored.refreshToken }),
    })
    const payload = await response.json() as { id_token?: string; refresh_token?: string; expires_in?: string }
    if (!response.ok || !payload.id_token) {
        clearAuth()
        return ''
    }
    const next: StoredAuth = {
        idToken: payload.id_token,
        refreshToken: payload.refresh_token || stored.refreshToken,
        expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
    }
    writeAuth(next)
    return next.idToken
}

export async function signIn(email: string, password: string, expect: WorkspaceRole): Promise<WorkspaceSession> {
    if (!API_KEY) throw new Error('Firebase sign-in is not on this build yet.')
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, returnSecureToken: true }),
    })
    const payload = await response.json() as {
        idToken?: string
        refreshToken?: string
        expiresIn?: string
        error?: { message?: string }
    }
    if (!response.ok || !payload.idToken) throw new Error(messageFor(payload.error?.message || ''))

    const check = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: payload.idToken }),
    })
    const profile = await check.json() as { session?: WorkspaceSession; error?: string }
    if (!check.ok || !profile.session) throw new Error(profile.error || 'Sign-in did not complete.')
    if (profile.session.role !== expect) {
        const door = profile.session.role === 'super-admin' ? '/start' : '/join'
        throw new Error(profile.session.role === 'super-admin'
            ? `This is the Super Admin account. Open ${door}.`
            : `This is the client account. Open ${door}.`)
    }
    writeAuth({
        idToken: payload.idToken,
        refreshToken: payload.refreshToken || '',
        expiresAt: Date.now() + Number(payload.expiresIn || 3600) * 1000,
    })
    return profile.session
}
