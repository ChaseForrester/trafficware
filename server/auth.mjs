import { createPublicKey, createVerify } from 'node:crypto'

const PROJECT = 'trafficware-yard'
const ISSUER = `https://securetoken.google.com/${PROJECT}`
const CERTS = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'

let cachedCerts = null
let certsUntil = 0

function send(res, status, payload) {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(payload))
}

async function readBody(req) {
    if (req.body && typeof req.body === 'object') return req.body
    if (typeof req.body === 'string' && req.body) return JSON.parse(req.body)
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const raw = Buffer.concat(chunks).toString('utf8')
    return raw ? JSON.parse(raw) : {}
}

async function certificates() {
    const now = Date.now()
    if (cachedCerts && now < certsUntil) return cachedCerts
    const response = await fetch(CERTS)
    if (!response.ok) throw new Error('Could not load the sign-in keys.')
    const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('cache-control') || '')?.[1] || 3600)
    cachedCerts = await response.json()
    certsUntil = now + maxAge * 1000
    return cachedCerts
}

function decode(part) {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
}

export async function verifyIdToken(token) {
    const parts = String(token || '').split('.')
    if (parts.length !== 3) throw new Error('Sign-in token was not valid.')
    const [encodedHeader, encodedPayload, encodedSignature] = parts
    const header = decode(encodedHeader)
    const payload = decode(encodedPayload)
    const pem = (await certificates())[header.kid]
    if (!pem) throw new Error('Sign-in token was not valid.')
    const verifier = createVerify('RSA-SHA256')
    verifier.update(`${encodedHeader}.${encodedPayload}`)
    verifier.end()
    const valid = verifier.verify(createPublicKey(pem), Buffer.from(encodedSignature, 'base64url'))
    const now = Math.floor(Date.now() / 1000)
    if (!valid || payload.aud !== PROJECT || payload.iss !== ISSUER || payload.exp <= now) {
        throw new Error('Sign-in token was not valid.')
    }
    if (payload.role !== 'super-admin' && payload.role !== 'field') {
        throw new Error('This account has no Trafficware role.')
    }
    if (payload.role === 'field' && !payload.personId) {
        throw new Error('This crew account is not linked to a person.')
    }
    return {
        role: payload.role,
        personName: payload.personName || payload.name || payload.email,
        companyName: payload.companyName || 'Trafficware',
        abn: '',
        state: payload.state || 'VIC',
        personId: payload.role === 'field' ? payload.personId : null,
        email: payload.email || '',
    }
}

export async function handleSession(req, res) {
    if (req.method !== 'POST') {
        send(res, 405, { error: 'Use POST' })
        return
    }
    try {
        const body = await readBody(req)
        const session = await verifyIdToken(body.idToken)
        send(res, 200, { session })
    } catch (error) {
        const message = error instanceof SyntaxError ? 'Sign-in token was not valid.' : error.message
        send(res, 401, { error: message || 'Sign-in did not complete.' })
    }
}
