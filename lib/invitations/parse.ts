/**
 * Parsers for bulk-invite input.
 *
 * Two supported formats:
 *  - Plain list: one entry per line. Each line accepts:
 *      email
 *      Name <email>
 *      email,Full Name
 *      email,Full Name,Title
 *  - CSV: a header row with at least an `email` column. Optional columns:
 *      `full_name` (or `name`), `title`, `cohort`.
 */

export type ParsedInvite = {
  email: string
  full_name?: string
  title?: string
  cohort?: string
}

export type ParsedInviteRow = {
  line: number
  raw: string
  ok: boolean
  data?: ParsedInvite
  error?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function tryParseLine(raw: string, line: number): ParsedInviteRow {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { line, raw, ok: false, error: "empty" }
  }

  // "Name <email>"
  const angle = trimmed.match(/^(.*?)<\s*([^>]+?)\s*>$/)
  if (angle) {
    const name = angle[1].trim().replace(/^["']|["']$/g, "")
    const email = normalizeEmail(angle[2])
    if (!EMAIL_RE.test(email)) {
      return { line, raw, ok: false, error: `invalid email: ${email || "(empty)"}` }
    }
    return {
      line,
      raw,
      ok: true,
      data: { email, full_name: emptyToUndefined(name) },
    }
  }

  // CSV-style: email[,name[,title]]
  if (trimmed.includes(",")) {
    const parts = splitCsvLine(trimmed)
    const email = normalizeEmail(parts[0] ?? "")
    if (!EMAIL_RE.test(email)) {
      return { line, raw, ok: false, error: `invalid email: ${email || "(empty)"}` }
    }
    return {
      line,
      raw,
      ok: true,
      data: {
        email,
        full_name: emptyToUndefined(parts[1]),
        title: emptyToUndefined(parts[2]),
      },
    }
  }

  // Plain email
  const email = normalizeEmail(trimmed)
  if (!EMAIL_RE.test(email)) {
    return { line, raw, ok: false, error: `invalid email: ${email}` }
  }
  return { line, raw, ok: true, data: { email } }
}

export function parsePastedList(input: string): ParsedInviteRow[] {
  const lines = input.split(/\r?\n/)
  const rows: ParsedInviteRow[] = []
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw.trim()) continue
    rows.push(tryParseLine(raw, i + 1))
  }
  return dedupe(rows)
}

/**
 * Tiny CSV splitter that handles quoted fields and embedded commas. Not a full
 * RFC4180 parser, but sufficient for invite lists.
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current)
  return result.map((s) => s.trim())
}

export function parseCsv(input: string): ParsedInviteRow[] {
  const lines = input.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const idx = (name: string) => header.indexOf(name)
  const emailIdx = idx("email")
  if (emailIdx === -1) {
    // No header - fall back to plain list parsing on the whole input
    return parsePastedList(input)
  }
  const nameIdx = idx("full_name") !== -1 ? idx("full_name") : idx("name")
  const titleIdx = idx("title")
  const cohortIdx = idx("cohort")

  const rows: ParsedInviteRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i]
    const cols = splitCsvLine(raw)
    const email = normalizeEmail(cols[emailIdx] ?? "")
    if (!email) {
      rows.push({ line: i + 1, raw, ok: false, error: "missing email" })
      continue
    }
    if (!EMAIL_RE.test(email)) {
      rows.push({ line: i + 1, raw, ok: false, error: `invalid email: ${email}` })
      continue
    }
    rows.push({
      line: i + 1,
      raw,
      ok: true,
      data: {
        email,
        full_name: nameIdx !== -1 ? emptyToUndefined(cols[nameIdx]) : undefined,
        title: titleIdx !== -1 ? emptyToUndefined(cols[titleIdx]) : undefined,
        cohort: cohortIdx !== -1 ? emptyToUndefined(cols[cohortIdx]) : undefined,
      },
    })
  }
  return dedupe(rows)
}

function dedupe(rows: ParsedInviteRow[]): ParsedInviteRow[] {
  const seen = new Set<string>()
  return rows.map((row) => {
    if (!row.ok || !row.data) return row
    const key = row.data.email
    if (seen.has(key)) {
      return { ...row, ok: false, error: `duplicate of earlier row: ${key}` }
    }
    seen.add(key)
    return row
  })
}
