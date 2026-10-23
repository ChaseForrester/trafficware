import { googleAccessToken, loadServiceAccount } from './googleAuth.mjs'

const DOC = 'https://firestore.googleapis.com/v1/projects/trafficware-yard/databases/%28default%29/documents/yards/main'

function send(res, status, payload) {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(payload))
}

function pinOf(req) {
    const header = req.headers['x-trafficware-pin']
    return Array.isArray(header) ? header[0] : header || ''
}

async function readBody(req) {
    if (req.body && typeof req.body === 'object') return req.body
    if (typeof req.body === 'string' && req.body) return JSON.parse(req.body)
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const raw = Buffer.concat(chunks).toString('utf8')
    return raw ? JSON.parse(raw) : {}
}

function validYard(state) {
    return Boolean(
        state
        && state.version === 1
        && Array.isArray(state.people)
        && Array.isArray(state.bookings)
        && state.settings
        && Array.isArray(state.integrations),
    )
}

export async function handleYard(req, res) {
    const pin = process.env.TRAFFICWARE_PIN || ''
    if (!loadServiceAccount()) {
        send(res, 200, { mode: 'off', detail: 'The Firebase key is not on this server yet. This browser keeps the yard.' })
        return
    }
    if (!pin) {
        send(res, 200, { mode: 'off', detail: 'Set TRAFFICWARE_PIN on the server. The shared yard stays closed until that code exists.' })
        return
    }
    if (pinOf(req) !== pin) {
        send(res, 401, { mode: 'locked', detail: 'Enter the access code to open the shared yard.' })
        return
    }

    try {
        const token = await googleAccessToken('https://www.googleapis.com/auth/datastore')
        if (req.method === 'GET') {
            const response = await fetch(DOC, { headers: { Authorization: `Bearer ${token}` } })
            if (response.status === 404) {
                send(res, 200, { mode: 'empty', detail: 'Firestore has no yard yet.' })
                return
            }
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error?.message || 'Firestore read failed')
            const raw = payload.fields?.json?.stringValue
            const state = raw ? JSON.parse(raw) : null
            if (!validYard(state)) {
                send(res, 200, { mode: 'empty', detail: 'The cloud yard was empty.' })
                return
            }
            send(res, 200, { mode: 'cloud', state })
            return
        }
        if (req.method === 'PUT') {
            const body = await readBody(req)
            if (!validYard(body.state)) {
                send(res, 400, { error: 'That was not a Trafficware yard.' })
                return
            }
            const response = await fetch(`${DOC}?updateMask.fieldPaths=json&updateMask.fieldPaths=updatedAt`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fields: {
                        json: { stringValue: JSON.stringify(body.state) },
                        updatedAt: { timestampValue: new Date().toISOString() },
                    },
                }),
            })
            const payload = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(payload.error?.message || 'Firestore write failed')
            send(res, 200, { mode: 'cloud' })
            return
        }
        send(res, 405, { error: 'Use GET or PUT' })
    } catch (error) {
        send(res, 502, { mode: 'off', detail: error instanceof Error ? error.message : 'Cloud yard failed' })
    }
}
