export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh'

function vietnamDateParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  return {
    year: parts.find((part) => part.type === 'year')?.value ?? '',
    month: parts.find((part) => part.type === 'month')?.value ?? '',
    day: parts.find((part) => part.type === 'day')?.value ?? '',
  }
}

export function todayIsoDate(): string {
  const { year, month, day } = vietnamDateParts()
  return `${year}-${month}-${day}`
}

export function todayLabel(): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: VIETNAM_TIME_ZONE }).format(new Date())
}

export function nowIsoTimestamp(): string {
  return new Date().toISOString()
}
