const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar date as YYYY-MM-DD (not UTC, so streaks roll over at local midnight). */
export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayStr = () => toDateStr(new Date())

export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (s: string, n: number) => {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

export const diffDays = (a: string, b: string) =>
  Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / 86_400_000)

/** Inclusive list of dates ending at `end`, `n` days long. */
export const lastNDays = (n: number, end = todayStr()) =>
  Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)))

export const shortDate = (s: string) =>
  parseDate(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

export const weekday = (s: string) =>
  parseDate(s).toLocaleDateString(undefined, { weekday: 'short' })

export const fmtMinutes = (m: number) => {
  const h = Math.floor(m / 60)
  const r = Math.round(m % 60)
  if (h === 0) return `${r}m`
  return r === 0 ? `${h}h` : `${h}h ${r}m`
}
