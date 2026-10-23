import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { BotId } from './botPlays.ts'
import { Icon } from './Icons.tsx'
import type { IconName } from './Icons.tsx'
import { cx } from '../lib/format.ts'

type BoxId = 'admin' | 'board' | 'integrations' | 'mobile' | 'cloud'
type NodeId = BoxId | BotId

type Box = {
    href: string
    play: string
    kicker: string
    title: string
    tone: string
    icon: IconName
    items: string[]
}

const BOT_COLOR: Record<BotId, string> = {
    roster: '#3b6cff',
    closeout: '#7a4dff',
    field: '#1f9d55',
}

const LINKS: Record<BotId, BoxId[]> = {
    roster: ['admin', 'board', 'cloud'],
    closeout: ['cloud', 'integrations'],
    field: ['board', 'cloud', 'mobile'],
}

const BOXES: Record<Exclude<BoxId, 'cloud'>, Box> = {
    admin: {
        href: '/app/people',
        play: '/#roster-alerts',
        kicker: 'Super admin',
        title: 'Web platform',
        tone: 'arch-admin',
        icon: 'office',
        items: ['People profiles', 'Skills and documents', 'Employment status', 'Configurations', 'Payroll rates'],
    },
    board: {
        href: '/app/board',
        play: '/#board-checks',
        kicker: 'Booking board',
        title: 'Employee roster',
        tone: 'arch-board',
        icon: 'board',
        items: ['Drag-and-drop scheduling', 'Conflict and fatigue checks', 'Skill validation', 'Real-time availability'],
    },
    integrations: {
        href: '/app/integrations',
        play: '/#closeout',
        kicker: 'Integrations',
        title: 'Accounts and HR',
        tone: 'arch-integrations',
        icon: 'integrations',
        items: ['Xero / accounting', 'Employment Hero / payroll', 'GPS telematics', 'HR onboarding'],
    },
    mobile: {
        href: '/field',
        play: '/#field-docket',
        kicker: 'Mobile',
        title: 'Field crew',
        tone: 'arch-mobile',
        icon: 'field',
        items: ['Job requests, accept or decline', 'Digital dockets and forms', 'Photos and near misses', 'Offline documents'],
    },
}

type Line = { key: string; bot: BotId; d: string }

export function Architecture({ playLinks = false }: { playLinks?: boolean }) {
    const rootRef = useRef<HTMLDivElement>(null)
    const [active, setActive] = useState<BotId | null>(null)
    const [frame, setFrame] = useState<{ w: number; h: number; lines: Line[] }>({ w: 0, h: 0, lines: [] })

    useEffect(() => {
        const root = rootRef.current
        if (!root) return
        function measure(node: HTMLDivElement) {
            const width = node.clientWidth
            if (width < 900) {
                setFrame({ w: 0, h: 0, lines: [] })
                return
            }
            const base = node.getBoundingClientRect()
            const spot = (id: NodeId) => {
                const target = node.querySelector(`[data-arch="${id}"]`)
                if (!target) return null
                const rect = target.getBoundingClientRect()
                return {
                    left: rect.left - base.left,
                    top: rect.top - base.top,
                    right: rect.right - base.left,
                    bottom: rect.bottom - base.top,
                    cx: rect.left - base.left + rect.width / 2,
                    cy: rect.top - base.top + rect.height / 2,
                }
            }
            const lines: Line[] = []
            for (const bot of Object.keys(LINKS) as BotId[]) {
                const from = spot(bot)
                if (!from) continue
                for (const target of LINKS[bot]) {
                    const to = spot(target)
                    if (!to) continue
                    lines.push({ key: `${bot}-${target}`, bot, d: connector(from, to) })
                }
            }
            setFrame({ w: width, h: node.clientHeight, lines })
        }
        measure(root)
        const observer = new ResizeObserver(() => measure(root))
        observer.observe(root)
        return () => observer.disconnect()
    }, [])

    function choose(bot: BotId) {
        setActive((current) => (current === bot ? null : bot))
    }

    return (
        <div className="arch" ref={rootRef}>
            {frame.w > 0 && (
                <svg className="arch-lines" viewBox={`0 0 ${frame.w} ${frame.h}`} width={frame.w} height={frame.h} aria-hidden="true">
                    {frame.lines.map((line) => (
                        <path
                            key={line.key}
                            d={line.d}
                            className={cx('arch-line', active === line.bot && 'is-hot', active && active !== line.bot && 'is-dim')}
                            style={{ stroke: BOT_COLOR[line.bot] }}
                        />
                    ))}
                </svg>
            )}
            <ArchCard box={BOXES.admin} id="admin" playLinks={playLinks} active={active} />
            <BotLink
                bot="roster"
                name="Roster bot"
                play="/#roster-suggest"
                duties={['Auto-suggest assignments', 'Expiry alerts, status checks']}
                playLinks={playLinks}
                on={active === 'roster'}
                onChoose={choose}
            />
            <ArchCard box={BOXES.board} id="board" playLinks={playLinks} active={active} />
            <BotLink
                bot="closeout"
                name="Close-out bot"
                play="/#closeout"
                duties={['Timesheet review', 'Payroll export', 'Invoice generation']}
                playLinks={playLinks}
                on={active === 'closeout'}
                onChoose={choose}
            />
            <Link
                to={playLinks ? '/#how' : '/app'}
                className={cx('arch-card', 'arch-cloud', active && LINKS[active].includes('cloud') && 'is-linked')}
                data-arch="cloud"
                style={active ? { '--link': BOT_COLOR[active] } as CSSProperties : undefined}
            >
                <span className="kicker"><Icon name="cloud" /> Single source of truth</span>
                <strong>Central database</strong>
                <span>Jobs, people, trucks and dockets. The bots read and write this record. They do not keep a second copy.</span>
            </Link>
            <BotLink
                bot="field"
                name="Field sync bot"
                play="/#field-push"
                duties={['Push jobs', 'Accept and decline', 'Docket validation']}
                playLinks={playLinks}
                on={active === 'field'}
                onChoose={choose}
            />
            <ArchCard box={BOXES.integrations} id="integrations" playLinks={playLinks} active={active} />
            <p className="arch-note">Click a bot. The lines are what it reads and writes.</p>
            <ArchCard box={BOXES.mobile} id="mobile" playLinks={playLinks} active={active} />
        </div>
    )
}

function ArchCard({ box, id, playLinks, active }: { box: Box; id: BoxId; playLinks: boolean; active: BotId | null }) {
    const linked = active ? LINKS[active].includes(id) : false
    return (
        <Link
            to={playLinks ? box.play : box.href}
            className={cx('arch-card', box.tone, linked && 'is-linked')}
            data-arch={id}
            style={linked && active ? { '--link': BOT_COLOR[active] } as CSSProperties : undefined}
        >
            <span className="kicker"><Icon name={box.icon} /> {box.kicker}</span>
            <strong>{box.title}</strong>
            <ul>
                {box.items.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </Link>
    )
}

function BotLink({
    bot,
    name,
    play,
    duties,
    playLinks,
    on,
    onChoose,
}: {
    bot: BotId
    name: string
    play: string
    duties: string[]
    playLinks: boolean
    on: boolean
    onChoose: (bot: BotId) => void
}) {
    return (
        <div className={cx('arch-bot', `arch-bot-${bot}`, on && 'is-on')} data-arch={bot}>
            <button type="button" aria-pressed={on} onClick={() => onChoose(bot)}>
                <span className="arch-glyph">
                    {bot === 'roster' && <RosterGlyph hot={on} />}
                    {bot === 'closeout' && <CloseGlyph hot={on} />}
                    {bot === 'field' && <FieldGlyph hot={on} />}
                </span>
                <strong>{name}</strong>
            </button>
            {duties.map((duty) => (
                <span key={duty}>{duty}</span>
            ))}
            {playLinks && <Link to={play}>Watch it run</Link>}
        </div>
    )
}

function RosterGlyph({ hot }: { hot: boolean }) {
    const dur = hot ? '1.1s' : '2.6s'
    return (
        <svg viewBox="0 0 48 48" aria-hidden="true" key={dur}>
            <rect x="7" y="8" width="34" height="32" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M7 18h34M24 18v22" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <circle r="3.2" fill="currentColor">
                <animateMotion dur={dur} repeatCount="indefinite" path="M15.5,28 L32.5,28 L32.5,35 L15.5,35 Z" />
            </circle>
        </svg>
    )
}

function CloseGlyph({ hot }: { hot: boolean }) {
    const dur = hot ? '0.9s' : '2.2s'
    return (
        <svg viewBox="0 0 48 48" aria-hidden="true" key={dur}>
            <path d="M14 8h14l8 8v24H14V8Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M28 8v8h8" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="19" x2="33" y1="24" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <animate attributeName="y1" values="22;36;22" dur={dur} repeatCount="indefinite" />
                <animate attributeName="y2" values="22;36;22" dur={dur} repeatCount="indefinite" />
            </line>
        </svg>
    )
}

function FieldGlyph({ hot }: { hot: boolean }) {
    const dur = hot ? '1s' : '2.2s'
    return (
        <svg viewBox="0 0 48 48" aria-hidden="true" key={dur}>
            <rect x="16" y="6" width="16" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M22 32h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M10 16c2-4 6-6 8-6M38 16c-2-4-6-6-8-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <animate attributeName="opacity" values="0.15;1;0.15" dur={dur} repeatCount="indefinite" />
            </path>
            <path d="M7 22c3-8 9-12 11-12M41 22c-3-8-9-12-11-12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <animate attributeName="opacity" values="1;0.15;1" dur={dur} repeatCount="indefinite" />
            </path>
        </svg>
    )
}

function connector(from: { left: number; top: number; right: number; bottom: number; cx: number; cy: number }, to: typeof from) {
    const dx = to.cx - from.cx
    const dy = to.cy - from.cy
    let x1: number
    let y1: number
    let x2: number
    let y2: number
    if (Math.abs(dx) >= Math.abs(dy)) {
        x1 = dx >= 0 ? from.right : from.left
        x2 = dx >= 0 ? to.left : to.right
        y1 = from.cy
        y2 = to.cy
    } else {
        y1 = dy >= 0 ? from.bottom : from.top
        y2 = dy >= 0 ? to.top : to.bottom
        x1 = from.cx
        x2 = to.cx
    }
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`
}
