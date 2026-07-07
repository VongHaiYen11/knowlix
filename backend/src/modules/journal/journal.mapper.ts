export function journalRow(row: any) {
  return { date: row.date, weekday: row.weekday, summary: row.summary, entries: row.entries, learnings: row.learnings, connections: row.connections }
}
