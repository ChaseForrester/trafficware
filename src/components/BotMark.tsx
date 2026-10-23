import { cx } from '../lib/format.ts'
import type { BotId } from './botPlays.ts'

export function BotMark({
    bot,
    working = false,
    size = 72,
}: {
    bot: BotId
    working?: boolean
    size?: number
}) {
    return (
        <span
            className={cx('bot-mark', `bot-mark-${bot}`, working && 'is-working')}
            style={{ width: size, height: size }}
            aria-hidden="true"
        >
            <span className="bot-mark-ring" />
            <img src="/brand/logo-mark.png" alt="" />
            <span className="bot-mark-scan" />
        </span>
    )
}
