export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh'

function vietnamParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
  }
}

export function vietnamDateString() {
  const { year, month, day } = vietnamParts()
  return `${year}-${month}-${day}`
}

export function vietnamTimeString() {
  const { hour, minute } = vietnamParts()
  return `${hour}:${minute}`
}

export function vietnamHour() {
  return Number(vietnamParts().hour)
}
