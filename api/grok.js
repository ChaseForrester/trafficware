import { grokStatus, handleGrok } from '../server/grok.mjs'

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

export default async function handler(req, res) {
    const apiKey = process.env.XAI_API_KEY
    const pin = process.env.TRAFFICWARE_PIN || ''

    if (req.method === 'GET') {
        send(res, 200, grokStatus(apiKey, pin))
        return
    }
    if (req.method !== 'POST') {
        send(res, 405, { error: 'Use POST' })
        return
    }

    try {
        const body = await readBody(req)
        const givenPin = req.headers['x-trafficware-pin']
        const result = await handleGrok(body, apiKey, pin, Array.isArray(givenPin) ? givenPin[0] : givenPin)
        send(res, 200, result)
    } catch (error) {
        const status = error.status || (error instanceof SyntaxError ? 400 : 500)
        send(res, status, { error: error.message || 'Grok failed' })
    }
}
