/**
 * Tiny ICS (iCalendar) generator. Used by the "Add to calendar"
 * button on Community events.
 *
 * Why not pull a library? An event line in ICS is ~10 lines of
 * formatted text and we only need DTSTART/DTEND/SUMMARY/DESCRIPTION/
 * LOCATION/UID. Adding a dependency for that is overkill, and we
 * keep the generator pure so it works in both the server (for
 * future direct downloads) and the client.
 *
 * Time format: we use UTC ("Z") to sidestep timezone identifier
 * compatibility - every modern calendar app handles UTC correctly.
 */

export interface IcsEvent {
  uid: string
  title: string
  description?: string | null
  location?: string | null
  url?: string | null
  start: Date
  /** Optional. Falls back to start + 1h if omitted. */
  end?: Date | null
}

/** RFC5545 escapes: backslash -> \\, comma/semicolon -> \, , newline -> \n */
function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function fmt(d: Date): string {
  // YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function buildIcs(event: IcsEvent): string {
  const end = event.end ?? new Date(event.start.getTime() + 60 * 60 * 1000)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Leadership Fellowship//Community//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(event.uid)}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(event.start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
  ]
  if (event.description) lines.push(`DESCRIPTION:${escapeIcs(event.description)}`)
  if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`)
  if (event.url) lines.push(`URL:${escapeIcs(event.url)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

/**
 * Trigger a browser download of an ICS file. No-ops on the server.
 */
export function downloadIcs(filename: string, ics: string) {
  if (typeof window === 'undefined') return
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
