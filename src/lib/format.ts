export function uid(prefix: string) {
  const rand = crypto.randomUUID().slice(0, 8)
  return `${prefix}-${rand}`
}

export function todayIso() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function prettyDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function prettyLong(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function prettyWhen(isoDateTime: string) {
  return new Date(isoDateTime).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function money(value: number) {
  return value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function minutesOf(hhmm: string) {
  const [hours, mins] = hhmm.split(':').map(Number)
  return hours * 60 + mins
}

export function shiftHours(start: string, end: string) {
  let mins = minutesOf(end) - minutesOf(start)
  if (mins <= 0) mins += 24 * 60
  return mins / 60
}

export function intervalMs(date: string, start: string, end: string): [number, number] {
  const origin = new Date(`${date}T00:00:00`).getTime()
  const startMs = origin + minutesOf(start) * 60000
  let endMs = origin + minutesOf(end) * 60000
  if (endMs <= startMs) endMs += 24 * 60 * 60000
  return [startMs, endMs]
}

export function rangesOverlap(a: [number, number], b: [number, number]) {
  return a[0] < b[1] && b[0] < a[1]
}

export function round1(value: number) {
  return Math.round(value * 10) / 10
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function startOfWeek(iso: string) {
  const date = new Date(`${iso}T12:00:00`)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(iso, diff)
}
