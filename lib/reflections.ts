/**
 * Shared reflection rules. Used by both the server actions
 * (`submitReflection`, `toggleContentCompletion`) and the client
 * `<ReflectionForm>` so the gate behaves identically on both sides.
 */

/**
 * Minimum word count for a reflection to be considered "submitted".
 * Anything shorter is rejected by the server and disables the
 * "Mark as complete and continue" button on the client.
 */
export const MIN_REFLECTION_WORDS = 50

/**
 * Count words by splitting on any whitespace run after trimming.
 * Empty strings return 0. Filters out empties so trailing spaces
 * don't inflate the count.
 */
export function countWords(input: string): number {
  const trimmed = input.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

/**
 * True when the response meets the minimum word count required to
 * unlock completion.
 */
export function reflectionMeetsMinimum(response: string | null): boolean {
  if (!response) return false
  return countWords(response) >= MIN_REFLECTION_WORDS
}
