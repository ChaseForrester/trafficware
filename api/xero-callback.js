import { handleXeroCallback } from '../server/xero.mjs'

export default function handler(req, res) {
    return handleXeroCallback(req, res)
}
