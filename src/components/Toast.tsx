import { useEffect } from 'react'
import { useStore } from '../lib/store.tsx'

export function Toast() {
    const { notice, dismissNotice } = useStore()

    useEffect(() => {
        if (!notice) return
        const timer = window.setTimeout(dismissNotice, 5600)
        return () => window.clearTimeout(timer)
    }, [notice, dismissNotice])

    if (!notice) return null

    return (
        <div className={`toast toast-${notice.tone}`} role="status">
            <p>{notice.text}</p>
            <button type="button" onClick={dismissNotice} aria-label="Dismiss">
                Close
            </button>
        </div>
    )
}
