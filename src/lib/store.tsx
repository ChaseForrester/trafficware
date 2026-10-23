import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppState, IntegrationId, Notice, Person } from '../types.ts'
import { todayIso, uid } from './format.ts'
import {
    addClient,
    addPerson,
    addSafetyNote,
    addSkill,
    applySuggestions,
    approveClean,
    approveDocket,
    assignPerson,
    bookDemo,
    completeOnboarding,
    createBooking,
    createInvoices,
    queryDocket,
    recordCloseout,
    removeSkill,
    respond,
    setIntegration,
    setLeave,
    setOffline,
    setVehicle,
    setVehicleStatus,
    submitDocket,
    syncField,
    unassignPerson,
    updatePerson,
    updateSettings,
    addDepot,
    pingVehicle,
    pushIntegration,
    type DemoInput,
    type DocketInput,
    type NewBooking,
    type NewClient,
    type NewPerson,
    type Result,
} from './mutate.ts'
import { loadState, saveState } from './persistence.ts'
import { seed } from './seed.ts'

type StoreValue = {
    state: AppState
    notice: Notice | null
    today: string
    dismissNotice: () => void
    resetDemo: () => void
    assignPerson: (bookingId: string, slotId: string, personId: string) => Result
    unassignPerson: (bookingId: string, slotId: string) => Result
    respond: (bookingId: string, slotId: string, response: 'accepted' | 'declined') => Result
    setVehicle: (bookingId: string, vehicleId: string | null) => Result
    createBooking: (input: NewBooking) => Result
    addPerson: (input: NewPerson) => Result
    updatePerson: (id: string, patch: Partial<Person>) => Result
    addSkill: (personId: string, name: string, expires: string) => Result
    removeSkill: (personId: string, skillId: string) => Result
    setLeave: (personId: string, date: string, on: boolean) => Result
    setVehicleStatus: (id: string, status: 'available' | 'maintenance') => Result
    pingVehicle: (id: string) => Result
    addClient: (input: NewClient) => Result
    setIntegration: (id: IntegrationId, connected: boolean) => Result
    pushIntegration: (id: IntegrationId) => Result
    setOffline: (offline: boolean) => Result
    submitDocket: (input: DocketInput) => Result
    syncField: () => Result
    addSafetyNote: (input: { personId: string; bookingId: string | null; note: string; photoName: string }) => Result
    approveDocket: (id: string) => Result
    queryDocket: (id: string, reason: string) => Result
    approveClean: (date: string) => Result
    applySuggestions: (date: string, depot: string) => Result
    recordCloseout: (date: string, summary: string) => Result
    createInvoices: () => Result
    updateSettings: (patch: Partial<AppState['settings']>) => Result
    addDepot: (name: string) => Result
    completeOnboarding: (personId: string, itemId: string) => Result
    bookDemo: (input: DemoInput) => Result
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AppState>(() => loadState() ?? seed())
    const [notice, setNotice] = useState<Notice | null>(null)
    const stateRef = useRef(state)
    stateRef.current = state
    const today = todayIso()

    useEffect(() => {
        saveState(state)
    }, [state])

    const dismissNotice = useCallback(() => setNotice(null), [])

    const commit = useCallback((result: Result) => {
        stateRef.current = result.state
        setState(result.state)
        setNotice({ id: uid('n'), tone: result.tone, text: result.notice })
        return result
    }, [])

    const value: StoreValue = {
        state,
        notice,
        today,
        dismissNotice,
        resetDemo: () => {
            const next = seed()
            stateRef.current = next
            setState(next)
            setNotice({ id: uid('n'), tone: 'ok', text: 'Demo workspace restored.' })
        },
        assignPerson: (bookingId, slotId, personId) => commit(assignPerson(stateRef.current, bookingId, slotId, personId)),
        unassignPerson: (bookingId, slotId) => commit(unassignPerson(stateRef.current, bookingId, slotId)),
        respond: (bookingId, slotId, response) => commit(respond(stateRef.current, bookingId, slotId, response)),
        setVehicle: (bookingId, vehicleId) => commit(setVehicle(stateRef.current, bookingId, vehicleId)),
        createBooking: (input) => commit(createBooking(stateRef.current, input)),
        addPerson: (input) => commit(addPerson(stateRef.current, input)),
        updatePerson: (id, patch) => commit(updatePerson(stateRef.current, id, patch)),
        addSkill: (personId, name, expires) => commit(addSkill(stateRef.current, personId, name, expires)),
        removeSkill: (personId, skillId) => commit(removeSkill(stateRef.current, personId, skillId)),
        setLeave: (personId, date, on) => commit(setLeave(stateRef.current, personId, date, on)),
        setVehicleStatus: (id, status) => commit(setVehicleStatus(stateRef.current, id, status)),
        pingVehicle: (id) => commit(pingVehicle(stateRef.current, id)),
        addClient: (input) => commit(addClient(stateRef.current, input)),
        setIntegration: (id, connected) => commit(setIntegration(stateRef.current, id, connected)),
        pushIntegration: (id) => commit(pushIntegration(stateRef.current, id)),
        setOffline: (offline) => commit(setOffline(stateRef.current, offline)),
        submitDocket: (input) => commit(submitDocket(stateRef.current, input)),
        syncField: () => commit(syncField(stateRef.current)),
        addSafetyNote: (input) => commit(addSafetyNote(stateRef.current, input)),
        approveDocket: (id) => commit(approveDocket(stateRef.current, id)),
        queryDocket: (id, reason) => commit(queryDocket(stateRef.current, id, reason)),
        approveClean: (date) => commit(approveClean(stateRef.current, date)),
        applySuggestions: (date, depot) => commit(applySuggestions(stateRef.current, date, depot)),
        recordCloseout: (date, summary) => commit(recordCloseout(stateRef.current, date, summary)),
        createInvoices: () => commit(createInvoices(stateRef.current)),
        updateSettings: (patch) => commit(updateSettings(stateRef.current, patch)),
        addDepot: (name) => commit(addDepot(stateRef.current, name)),
        completeOnboarding: (personId, itemId) => commit(completeOnboarding(stateRef.current, personId, itemId)),
        bookDemo: (input) => commit(bookDemo(stateRef.current, input)),
    }

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
    const value = useContext(StoreContext)
    if (!value) throw new Error('useStore must be used inside StoreProvider')
    return value
}
