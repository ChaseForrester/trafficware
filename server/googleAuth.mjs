import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'

let cached = null

export function loadServiceAccount() {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
        return JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8'))
    }
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    }
    try {
        return JSON.parse(readFileSync(new URL('../.secrets/firebase-admin.json', import.meta.url), 'utf8'))
    } catch {
        return null
    }
}

export async function googleAccessToken(scope) {
    const account = loadServiceAccount()
    if (!account) return null
    const now = Math.floor(Date.now() / 1000)
    if (cached && cached.scope === scope && cached.exp > now + 60) return cached.token
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
    const claim = Buffer.from(JSON.stringify({
        iss: account.client_email,
        scope,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    })).toString('base64url')
    const signer = createSign('RSA-SHA256')
    signer.update(`${header}.${claim}`)
    signer.end()
    const signature = signer.sign(account.private_key).toString('base64url')
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: `${header}.${claim}.${signature}`,
        }),
    })
    const payload = await response.json()
    if (!response.ok || !payload.access_token) {
        throw new Error(payload.error_description || payload.error || 'Google token failed')
    }
    cached = { token: payload.access_token, exp: now + 3600, scope }
    return payload.access_token
}
