import { handleSession } from '../server/auth.mjs'

export default function handler(req, res) {
    return handleSession(req, res)
}
