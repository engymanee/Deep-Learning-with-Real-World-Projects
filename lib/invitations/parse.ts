/**
 * Parsers for the bulk-invite flow.
 *
 * Both pasted entries and uploaded CSVs use the same positional
 * column order:
 *
 *     School Name, First Name, Last Name, Title, Email Address
 *
 * Required per row: First Name, Last Name, Email Address.
 * Optional per row: School Name, Title.
 *
 * For CSV uploads, the file MUST start with a header row containing
 * (at minimum) those five column names. The order of columns in the
 * file is flexible because we resolve them by name; pasted entries
 * are strictly positional.
 */

export type ParsedInvite = {
  email: string
  first_name: string
  last_name: string
  full_name: string
  title?: string
  school_name?: string
}

export type ParsedInviteRow = {
  line: number
  raw: string
  ok: boolean
  data?: ParsedInvite
  error?: string
}

export type CsvParseResult = {
  rows: ParsedInviteRow[]
  /** Header-level error (e.g. missing required column). When set,
   * `rows` will be empty - the file is unusable as-is. */
  headerError?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const REQUIRED_HEADERS = [
  'school name',
  'first name',
  'last name',
  'title',
  'email address',
] as const

const REQUIRED_PER_ROW = ['first name', 'last name', 'email address'] as const

/** Exact header row that the "Download CSV Template" button writes
 * out, and that the spec requires admins to see in the upload UI. */
export const CSV_TEMPLATE_HEADER =
  'School Name,First Name,Last Name,Title,Email Address'

export const CSV_TEMPLATE_CONTENT = `${CSV_TEMPLATE_HEADER}\n`

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function joinName(first: string, last: string): string {
  return [first.trim(), last.trim()].filter(Boolean).join(' ').trim()
}

function prettyHeader(h: string): string {
  return h.replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Tiny CSV splitter that handles double-quoted fields (with escaped
 * quotes via `""`) and embedded commas. Sufficient for invite lists.
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
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
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result.map((s) => s.trim())
}

/**
 * Parse a single positional row (paste mode) of the form
 *   School Name, First Name, Last Name, Title, Email Address
 *
 * The five fields are required to all be present (as commas) even
 * when the optional values are blank. We deliberately don't try to
 * be clever about fewer-than-5 columns because that's how the email
 * silently lands in the wrong field.
 */
function parsePositionalLine(raw: string, line: number): ParsedInviteRow {
  const trimmed = raw.trim()
  if (!trimmed) return { line, raw, ok: false, error: 'empty row' }

  const cols = splitCsvLine(trimmed)
  if (cols.length !== 5) {
    return {
      line,
      raw,
      ok: false,
      error: `expected 5 fields (School Name, First Name, Last Name, Title, Email Address) but got ${cols.length}`,
    }
  }

  const [schoolNameRaw, firstNameRaw, lastNameRaw, titleRaw, emailRaw] = cols
  const firstName = firstNameRaw.trim()
  const lastName = lastNameRaw.trim()
  const email = normalizeEmail(emailRaw)

  if (!firstName) return { line, raw, ok: false, error: 'First Name is required' }
  if (!lastName) return { line, raw, ok: false, error: 'Last Name is required' }
  if (!email) return { line, raw, ok: false, error: 'Email Address is required' }
  if (!EMAIL_RE.test(email)) {
    return { line, raw, ok: false, error: `invalid email: ${email}` }
  }

  return {
    line,
    raw,
    ok: true,
    data: {
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: joinName(firstName, lastName),
      title: emptyToUndefined(titleRaw),
      school_name: emptyToUndefined(schoolNameRaw),
    },
  }
}

export function parsePastedList(input: string): ParsedInviteRow[] {
  const lines = input.split(/\r?\n/)
  const rows: ParsedInviteRow[] = []
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw.trim()) continue
    rows.push(parsePositionalLine(raw, i + 1))
  }
  return dedupe(rows)
}

export function parseCsv(input: string): CsvParseResult {
  const lines = input.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { rows: [] }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase())

  const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h))
  if (missing.length > 0) {
    return {
      rows: [],
      headerError: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing
        .map(prettyHeader)
        .join(', ')}. Download the template for the correct format.`,
    }
  }

  const colIdx = (name: string) => header.indexOf(name)
  const schoolIdx = colIdx('school name')
  const firstIdx = colIdx('first name')
  const lastIdx = colIdx('last name')
  const titleIdx = colIdx('title')
  const emailIdx = colIdx('email address')

  const rows: ParsedInviteRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i]
    const cols = splitCsvLine(raw)

    const firstName = (cols[firstIdx] ?? '').trim()
    const lastName = (cols[lastIdx] ?? '').trim()
    const email = normalizeEmail(cols[emailIdx] ?? '')

    if (!firstName) {
      rows.push({ line: i + 1, raw, ok: false, error: 'First Name is required' })
      continue
    }
    if (!lastName) {
      rows.push({ line: i + 1, raw, ok: false, error: 'Last Name is required' })
      continue
    }
    if (!email) {
      rows.push({ line: i + 1, raw, ok: false, error: 'Email Address is required' })
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
        first_name: firstName,
        last_name: lastName,
        full_name: joinName(firstName, lastName),
        title: emptyToUndefined(cols[titleIdx]),
        school_name: emptyToUndefined(cols[schoolIdx]),
      },
    })
  }

  // Reference: REQUIRED_PER_ROW is enforced inline above; kept exported
  // for the dialog's helper-text generator.
  void REQUIRED_PER_ROW
  return { rows: dedupe(rows) }
}

function dedupe(rows: ParsedInviteRow[]): ParsedInviteRow[] {
  const seen = new Set<string>()
  return rows.map((row) => {
    if (!row.ok || !row.data) return row
    const key = row.data.email
    if (seen.has(key)) {
      return { ...row, ok: false, error: `duplicate email: ${key}` }
    }
    seen.add(key)
    return row
  })
}
