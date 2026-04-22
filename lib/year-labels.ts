/**
 * Curriculum labels used to live in the DB as "Year One: Deep Learning",
 * "Year Two: Wisdom Coaching", "Year Three: Community of Practice".
 *
 * The UI now treats the part after the colon as the canonical label (the
 * "Year N:" prefix is redundant in every place it was shown). This helper
 * strips that prefix for display, while the underlying DB rows are left
 * untouched so admin rename flows continue to work against `years.title`.
 */
export function stripYearPrefix(title: string | null | undefined): string {
  if (!title) return ''
  // Matches: "Year One:", "Year 1:", "Year  Three :", case-insensitive.
  const match = title.match(/^\s*year\s+[\w-]+\s*:\s*(.+)$/i)
  return (match ? match[1] : title).trim()
}
