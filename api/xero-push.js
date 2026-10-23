import { handleXeroPush } from '../server/xero.mjs'

export default function handler(req, res) {
    return handleXeroPush(req, res)
}
