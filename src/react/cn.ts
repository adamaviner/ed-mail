/**
 * Joins class names, leaving out the falsy ones. There is no tailwind-merge here, so a class passed
 * in is added to the primitive's own rather than replacing a conflicting one.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
