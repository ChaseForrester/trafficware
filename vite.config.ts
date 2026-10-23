import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { handleSession } from './server/auth.mjs'
import { grokStatus, handleGrok } from './server/grok.mjs'
import { handleYard } from './server/yard.mjs'
import {
  handleXeroCallback,
  handleXeroConnect,
  handleXeroDisconnect,
  handleXeroPush,
  handleXeroStatus,
} from './server/xero.mjs'

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function send(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

function grokApi(apiKey: string | undefined, pin: string): Plugin {
  return {
    name: 'grok-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path === '/api/yard') {
          void handleYard(req, res)
          return
        }
        if (path === '/api/session') {
          void handleSession(req, res)
          return
        }
        if (path === '/api/xero-status') {
          handleXeroStatus(req, res)
          return
        }
        if (path === '/api/xero-connect') {
          handleXeroConnect(req, res)
          return
        }
        if (path === '/api/xero-callback') {
          void handleXeroCallback(req, res)
          return
        }
        if (path === '/api/xero-disconnect') {
          handleXeroDisconnect(req, res)
          return
        }
        if (path === '/api/xero-push') {
          void handleXeroPush(req, res)
          return
        }
        if (path !== '/api/grok') {
          next()
          return
        }
        if (req.method === 'GET') {
          send(res, 200, grokStatus(apiKey, pin))
          return
        }
        if (req.method !== 'POST') {
          send(res, 405, { error: 'Use POST' })
          return
        }
        readBody(req)
          .then(async (raw) => {
            const body = raw ? JSON.parse(raw) : {}
            const header = req.headers['x-trafficware-pin']
            const given = Array.isArray(header) ? header[0] : header
            const result = await handleGrok(body, apiKey, pin, given)
            send(res, 200, result)
          })
          .catch((error: { status?: number; message?: string }) => {
            const status = error.status || (error instanceof SyntaxError ? 400 : 500)
            send(res, status, { error: error.message || 'Grok failed' })
          })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of [
    'TRAFFICWARE_PIN',
    'FIREBASE_SERVICE_ACCOUNT_B64',
    'XERO_CLIENT_ID',
    'XERO_CLIENT_SECRET',
    'XERO_SALES_ACCOUNT',
    'XERO_REDIRECT_URI',
  ]) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }
  return {
    plugins: [react(), grokApi(env.XAI_API_KEY, env.TRAFFICWARE_PIN || '')],
  }
})
