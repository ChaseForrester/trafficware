import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export type ThemeName = 'day' | 'night'

const KEY = 'trafficware.theme'

type ThemeValue = {
    theme: ThemeName
    toggle: () => void
}

const ThemeContext = createContext<ThemeValue | null>(null)

function readTheme(): ThemeName {
    const current = document.documentElement.dataset.theme
    if (current === 'night' || current === 'day') return current
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day'
}

function paint(theme: ThemeName) {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'night' ? '#12151b' : '#f34f27')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<ThemeName>(readTheme)

    useEffect(() => {
        paint(theme)
    }, [theme])

    const value: ThemeValue = {
        theme,
        toggle: () => {
            setTheme((current) => {
                const next = current === 'day' ? 'night' : 'day'
                localStorage.setItem(KEY, next)
                return next
            })
        },
    }

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    const value = useContext(ThemeContext)
    if (!value) throw new Error('useTheme must be used inside ThemeProvider')
    return value
}
