import { Link } from 'react-router-dom'
import { BotMark } from './BotMark.tsx'
import type { BotId } from './botPlays.ts'

type Box = {
    href: string
    play: string
    kicker: string
    title: string
    tone: string
    items: string[]
}

const BOXES: Record<'admin' | 'board' | 'integrations' | 'mobile', Box> = {
    admin: {
        href: '/app/people',
        play: '/#roster-alerts',
        kicker: 'Super admin',
        title: 'Web platform',
        tone: 'arch-admin',
        items: ['People profiles', 'Skills and documents', 'Employment status', 'Configurations', 'Payroll rates'],
    },
    board: {
        href: '/app/board',
        play: '/#board-checks',
        kicker: 'Booking board',
        title: 'Employee roster',
        tone: 'arch-board',
        items: ['Drag-and-drop scheduling', 'Conflict and fatigue checks', 'Skill validation', 'Real-time availability'],
    },
    integrations: {
        href: '/app/integrations',
        play: '/#closeout',
        kicker: 'Integrations',
        title: 'Accounts and HR',
        tone: 'arch-integrations',
        items: ['Xero / accounting', 'Employment Hero / payroll', 'GPS telematics', 'HR onboarding'],
    },
    mobile: {
        href: '/field',
        play: '/#field-docket',
        kicker: 'Mobile',
        title: 'Field crew',
        tone: 'arch-mobile',
        items: ['Job requests, accept or decline', 'Digital dockets and forms', 'Photos and near misses', 'Offline documents'],
    },
}

export function Architecture({ playLinks = false }: { playLinks?: boolean }) {
    return (
        <div className="arch">
            <ArchCard box={BOXES.admin} playLinks={playLinks} />
            <BotLink
                bot="roster"
                name="Roster bot"
                play="/#roster-suggest"
                duties={['Auto-suggest assignments', 'Expiry alerts, status checks']}
            />
            <ArchCard box={BOXES.board} playLinks={playLinks} />
            <BotLink
                bot="closeout"
                name="Close-out bot"
                play="/#closeout"
                duties={['Timesheet review', 'Payroll export', 'Invoice generation']}
            />
            <Link to={playLinks ? '/#how' : '/app'} className="arch-card arch-cloud">
                <span className="kicker">Single source of truth</span>
                <strong>Central database</strong>
                <span>Jobs, people, trucks and dockets. The bots read and write this record. They do not keep a second copy.</span>
            </Link>
            <BotLink
                bot="field"
                name="Field sync bot"
                play="/#field-push"
                duties={['Push jobs', 'Accept and decline', 'Docket validation']}
            />
            <ArchCard box={BOXES.integrations} playLinks={playLinks} />
            <p className="arch-note">Every arrow is the same yard.</p>
            <ArchCard box={BOXES.mobile} playLinks={playLinks} />
        </div>
    )
}

function ArchCard({ box, playLinks }: { box: Box; playLinks: boolean }) {
    return (
        <Link to={playLinks ? box.play : box.href} className={`arch-card ${box.tone}`}>
            <span className="kicker">{box.kicker}</span>
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
}: {
    bot: BotId
    name: string
    play: string
    duties: string[]
}) {
    return (
        <Link to={play} className={`arch-bot arch-bot-${bot}`}>
            <BotMark bot={bot} size={64} />
            <strong>{name}</strong>
            {duties.map((duty) => (
                <span key={duty}>{duty}</span>
            ))}
        </Link>
    )
}
