export function grokStatus(
    apiKey: string | undefined,
    pin: string,
): { configured: boolean; locked: boolean }

export function handleGrok(
    body: unknown,
    apiKey: string | undefined,
    pin: string,
    givenPin: string | undefined,
): Promise<{
    text: string
    calls: { call_id: string; name: string; arguments: string }[]
    actor: { role: 'super-admin' | 'field'; name: string; personId: string | null } | null
}>
