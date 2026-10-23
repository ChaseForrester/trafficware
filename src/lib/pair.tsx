import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Person } from '../types.ts'
import { useStore } from './store.tsx'

const KEY = 'trafficware.pair'

export type PairState = {
    primaryId: string
    partnerId: string
    holderId: string
}

type PairValue = PairState & {
    primary: Person | undefined
    partner: Person | undefined
    holder: Person | undefined
    setPrimary: (id: string) => void
    setPartner: (id: string) => void
    setHolder: (id: string) => void
}

const PairContext = createContext<PairValue | null>(null)

function defaults(people: Person[]): PairState {
    const active = people.filter((person) => person.status === 'active')
    const primary = active[0] ?? people[0]
    const partner = active.find((person) => person.id !== primary?.id) ?? people.find((person) => person.id !== primary?.id) ?? primary
    return {
        primaryId: primary?.id ?? '',
        partnerId: partner?.id ?? '',
        holderId: primary?.id ?? '',
    }
}

function repair(saved: PairState | null, people: Person[]): PairState {
    const base = defaults(people)
    if (!saved) return base
    const ids = new Set(people.map((person) => person.id))
    const primaryId = ids.has(saved.primaryId) ? saved.primaryId : base.primaryId
    let partnerId = ids.has(saved.partnerId) ? saved.partnerId : base.partnerId
    if (partnerId === primaryId) partnerId = base.partnerId
    const holderId = ids.has(saved.holderId) ? saved.holderId : primaryId
    return { primaryId, partnerId, holderId }
}

function readSaved(): PairState | null {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as PairState
        if (!parsed || typeof parsed.primaryId !== 'string') return null
        return parsed
    } catch {
        return null
    }
}

export function PairProvider({ children }: { children: ReactNode }) {
    const { state } = useStore()
    const [choice, setChoice] = useState<PairState | null>(() => readSaved())
    const pair = repair(choice, state.people)

    useEffect(() => {
        localStorage.setItem(KEY, JSON.stringify({
            primaryId: pair.primaryId,
            partnerId: pair.partnerId,
            holderId: pair.holderId,
        }))
    }, [pair.primaryId, pair.partnerId, pair.holderId])

    const primary = state.people.find((person) => person.id === pair.primaryId)
    const partner = state.people.find((person) => person.id === pair.partnerId)
    const holder = state.people.find((person) => person.id === pair.holderId)
    const value: PairValue = {
        ...pair,
        primary,
        partner,
        holder,
        setPrimary: (id) => setChoice((current) => {
            const base = repair(current, state.people)
            const partnerId = base.partnerId === id ? base.primaryId : base.partnerId
            const holderId = base.holderId === base.primaryId ? id : base.holderId
            return { primaryId: id, partnerId, holderId }
        }),
        setPartner: (id) => setChoice((current) => {
            const base = repair(current, state.people)
            const primaryId = base.primaryId === id ? base.partnerId : base.primaryId
            const holderId = base.holderId === base.partnerId ? id : base.holderId
            return { primaryId, partnerId: id, holderId }
        }),
        setHolder: (id) => setChoice((current) => {
            const base = repair(current, state.people)
            return { ...base, holderId: id }
        }),
    }

    return <PairContext.Provider value={value}>{children}</PairContext.Provider>
}

export function usePair() {
    const value = useContext(PairContext)
    if (!value) throw new Error('usePair must be used inside PairProvider')
    return value
}
