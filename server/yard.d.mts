import type { IncomingMessage, ServerResponse } from 'node:http'

export function handleYard(req: IncomingMessage, res: ServerResponse): Promise<void>
