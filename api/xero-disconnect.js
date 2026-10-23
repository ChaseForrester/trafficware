import { handleXeroDisconnect } from '../server/xero.mjs'

export default function handler(req, res) {
    return handleXeroDisconnect(req, res)
}
