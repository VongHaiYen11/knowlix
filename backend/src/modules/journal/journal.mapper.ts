import { VIETNAM_TIME_ZONE } from '../../utils/date.js'

function dateString(value: string | Date) {
  return String(value).slice(0, 10)
}

export function journalEntryRow(row: any) {
  return {
    id: row.id,
    time: row.entry_time,
    text: row.text,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

export function weekdayForDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: VIETNAM_TIME_ZONE }).format(new Date(`${date}T00:00:00+07:00`))
}

export function journalDay(date: string, entries: any[]) {
  return {
    date,
    weekday: weekdayForDate(date),
    entries: entries.map(journalEntryRow),
  }
}

export function journalEntryDate(row: any) {
  return dateString(row.entry_date)
}
