import { randomBytes } from 'node:crypto'

function send(res, status, payload) {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(payload))
}

function cookies(req) {
    const raw = req.headers.cookie || ''
    const out = {}
    for (const part of raw.split(';')) {
        const index = part.indexOf('=')
        if (index < 0) continue
        out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim())
    }
    return out
}

function origin(req) {
    if (process.env.XERO_REDIRECT_URI) {
        return process.env.XERO_REDIRECT_URI.replace(/\/api\/xero-callback$/, '')
    }
    const proto = req.headers['x-forwarded-proto'] || 'http'
    const host = req.headers['x-forwarded-host'] || req.headers.host
    return `${proto}://${host}`
}

function redirectUri(req) {
    return process.env.XERO_REDIRECT_URI || `${origin(req)}/api/xero-callback`
}

function writeCookies(res, pairs) {
    const secure = process.env.VERCEL ? '; Secure' : ''
    const list = pairs.map(([name, value, maxAge]) => (
        `${name}=${encodeURIComponent(value)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
    ))
    res.setHeader('Set-Cookie', list)
}

function configured() {
    return Boolean(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET)
}

async function readBody(req) {
    if (req.body && typeof req.body === 'object') return req.body
    if (typeof req.body === 'string' && req.body) return JSON.parse(req.body)
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const raw = Buffer.concat(chunks).toString('utf8')
    return raw ? JSON.parse(raw) : {}
}

async function tokenRequest(body) {
    const id = process.env.XERO_CLIENT_ID
    const secret = process.env.XERO_CLIENT_SECRET
    const response = await fetch('https://identity.xero.com/connect/token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(body),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
        throw new Error(payload.error_description || payload.error || 'Xero token request failed')
    }
    return payload
}

async function accessFor(req, res) {
    const jar = cookies(req)
    if (!jar.xero_refresh || !jar.xero_tenant) return null
    const payload = await tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: jar.xero_refresh,
    })
    if (payload.refresh_token) {
        writeCookies(res, [
            ['xero_refresh', payload.refresh_token, 60 * 60 * 24 * 60],
            ['xero_tenant', jar.xero_tenant, 60 * 60 * 24 * 60],
        ])
    }
    return { access: payload.access_token, tenant: jar.xero_tenant }
}

export function handleXeroStatus(req, res) {
    const jar = cookies(req)
    send(res, 200, {
        configured: configured(),
        linked: Boolean(jar.xero_refresh && jar.xero_tenant),
    })
}

export function handleXeroConnect(req, res) {
    if (!configured()) {
        send(res, 501, {
            error: 'Add XERO_CLIENT_ID and XERO_CLIENT_SECRET on the server, then open Connect again.',
        })
        return
    }
    const state = randomBytes(16).toString('hex')
    writeCookies(res, [['xero_state', state, 600]])
    const url = new URL('https://login.xero.com/identity/connect/authorize')
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', process.env.XERO_CLIENT_ID)
    url.searchParams.set('redirect_uri', redirectUri(req))
    url.searchParams.set('scope', 'offline_access accounting.invoices accounting.contacts')
    url.searchParams.set('state', state)
    res.statusCode = 302
    res.setHeader('Location', url.toString())
    res.end()
}

export async function handleXeroCallback(req, res) {
    try {
        const url = new URL(req.url || '/', origin(req))
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const jar = cookies(req)
        if (!code || !state || state !== jar.xero_state) {
            res.statusCode = 302
            res.setHeader('Location', '/app/integrations?xero=denied')
            res.end()
            return
        }
        const payload = await tokenRequest({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri(req),
        })
        const connections = await fetch('https://api.xero.com/connections', {
            headers: { Authorization: `Bearer ${payload.access_token}` },
        })
        const tenants = await connections.json()
        const tenant = Array.isArray(tenants) ? tenants[0]?.tenantId : ''
        if (!connections.ok || !tenant || !payload.refresh_token) {
            throw new Error('Xero did not return an organisation.')
        }
        writeCookies(res, [
            ['xero_refresh', payload.refresh_token, 60 * 60 * 24 * 60],
            ['xero_tenant', tenant, 60 * 60 * 24 * 60],
            ['xero_state', '', 0],
        ])
        res.statusCode = 302
        res.setHeader('Location', '/app/integrations?xero=linked')
        res.end()
    } catch (error) {
        send(res, 502, { error: error instanceof Error ? error.message : 'Xero connection failed' })
    }
}

export function handleXeroDisconnect(req, res) {
    writeCookies(res, [
        ['xero_refresh', '', 0],
        ['xero_tenant', '', 0],
    ])
    send(res, 200, { linked: false })
}

export async function handleXeroPush(req, res) {
    if (!configured()) {
        send(res, 501, { error: 'Xero app keys are not on the server yet.' })
        return
    }
    try {
        const session = await accessFor(req, res)
        if (!session) {
            send(res, 401, { error: 'Connect the Xero organisation first.' })
            return
        }
        const body = await readBody(req)
        const invoices = Array.isArray(body.invoices) ? body.invoices : []
        if (!invoices.length) {
            send(res, 400, { error: 'Create an invoice in close-out before sending it to Xero.' })
            return
        }
        const account = process.env.XERO_SALES_ACCOUNT || ''
        const payload = {
            Invoices: invoices.slice(0, 20).map((invoice) => {
                const hours = Number(invoice.hours) || 0
                const amount = Number(invoice.amount) || 0
                const quantity = hours > 0 ? hours : 1
                const unit = hours > 0 ? Math.round((amount / hours) * 100) / 100 : amount
                const line = {
                    Description: String(invoice.description || invoice.number || 'Traffic control').slice(0, 4000),
                    Quantity: quantity,
                    UnitAmount: unit,
                }
                if (account) line.AccountCode = account
                return {
                    Type: 'ACCREC',
                    Status: 'DRAFT',
                    InvoiceNumber: String(invoice.number || '').slice(0, 255),
                    CurrencyCode: 'AUD',
                    Contact: {
                        Name: String(invoice.contact || 'Traffic client').slice(0, 255),
                        EmailAddress: String(invoice.email || ''),
                    },
                    LineItems: [line],
                }
            }),
        }
        const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${session.access}`,
                'Xero-Tenant-Id': session.tenant,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
            const message = result.Message || result.Detail || result.Elements?.[0]?.ValidationErrors?.[0]?.Message || 'Xero rejected the invoice.'
            send(res, response.status, { error: message })
            return
        }
        const numbers = (result.Invoices || []).map((invoice) => invoice.InvoiceNumber).filter(Boolean)
        send(res, 200, { ok: true, numbers })
    } catch (error) {
        send(res, 502, { error: error instanceof Error ? error.message : 'Xero push failed' })
    }
}
