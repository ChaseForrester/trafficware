import type { IncomingMessage, ServerResponse } from 'node:http'

export function handleSession(req: IncomingMessage, res: ServerResponse): Promise<void>
