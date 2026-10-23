import { handleYard } from '../server/yard.mjs'

export default function handler(req, res) {
    return handleYard(req, res)
}
