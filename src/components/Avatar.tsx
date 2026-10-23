import { useState } from 'react'
import { cx, initials } from '../lib/format.ts'

const PHOTOS = new Set([
    'p-maya',
    'p-jack',
    'p-aisha',
    'p-tom',
    'p-priya',
    'p-luke',
    'p-sam',
    'p-elena',
    'p-ben',
    'p-hannah',
    'p-noah',
])

export function Avatar({
    person,
    size = 'md',
}: {
    person: { id: string; name: string; color: string }
    size?: 'sm' | 'md' | 'lg'
}) {
    const [off, setOff] = useState(false)
    const photo = PHOTOS.has(person.id) && !off

    return (
        <span
            className={cx('avatar', size === 'sm' && 'sm', size === 'lg' && 'lg', photo && 'avatar-photo')}
            style={{ background: person.color }}
            aria-hidden="true"
        >
            {photo ? (
                <img src={`/avatars/${person.id}.jpg`} alt="" onError={() => setOff(true)} />
            ) : (
                initials(person.name)
            )}
        </span>
    )
}
