import { useEffect } from 'react'

export function Splash({ onDone }: { onDone: () => void }) {
    useEffect(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const timer = window.setTimeout(onDone, reduce ? 500 : 2400)
        return () => window.clearTimeout(timer)
    }, [onDone])

    return (
        <div className="splash" role="dialog" aria-label="Trafficware">
            <button type="button" className="splash-skip" onClick={onDone}>Skip</button>
            <div className="splash-lockup">
                <img className="splash-mark" src="/brand/logo-mark.png" alt="" />
                <p className="splash-word">Trafficware</p>
                <p className="splash-tag">Office and field, one yard</p>
            </div>
        </div>
    )
}
