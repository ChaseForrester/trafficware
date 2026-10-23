import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AU_STATES } from './conduct.ts'
import type { AuState } from './conduct.ts'

const KEY = 'trafficware.session'

export type WorkspaceRole = 'super-admin' | 'field'

export type WorkspaceSession = {
    role: WorkspaceRole
    personName: string
    companyName: string
    abn: string
    state: AuState
    personId: string | null
    email?: string
}

type SessionValue = {
    session: WorkspaceSession | null
    enter: (next: WorkspaceSession) => void
    clear: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

function read(): WorkspaceSession | null {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as WorkspaceSession
        if (parsed?.role !== 'super-admin' && parsed?.role !== 'field') return null
        if (!parsed.personName || !parsed.companyName) return null
        if (parsed.role === 'field' && !parsed.personId) return null
        if (!AU_STATES.includes(parsed.state)) return null
        return parsed
    } catch {
        return null
    }
}

export function SessionProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<WorkspaceSession | null>(() => read())

    useEffect(() => {
        if (session) localStorage.setItem(KEY, JSON.stringify(session))
        else localStorage.removeItem(KEY)
    }, [session])

    const value: SessionValue = {
        session,
        enter: (next) => setSession(next),
        clear: () => setSession(null),
    }

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
    const value = useContext(SessionContext)
    if (!value) throw new Error('useSession must be used inside SessionProvider')
    return value
}
