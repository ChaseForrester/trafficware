import { handleXeroStatus } from '../server/xero.mjs'

export default function handler(req, res) {
    return handleXeroStatus(req, res)
}
