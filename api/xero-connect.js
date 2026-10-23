import { handleXeroConnect } from '../server/xero.mjs'

export default function handler(req, res) {
    return handleXeroConnect(req, res)
}
