import type { IncomingMessage, ServerResponse } from 'node:http'

export function handleXeroStatus(req: IncomingMessage, res: ServerResponse): void
export function handleXeroConnect(req: IncomingMessage, res: ServerResponse): void
export function handleXeroCallback(req: IncomingMessage, res: ServerResponse): Promise<void>
export function handleXeroDisconnect(req: IncomingMessage, res: ServerResponse): void
export function handleXeroPush(req: IncomingMessage, res: ServerResponse): Promise<void>
