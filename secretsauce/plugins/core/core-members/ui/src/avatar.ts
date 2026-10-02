const palette = ['blue', 'emerald', 'violet', 'rose', 'amber', 'cyan', 'indigo', 'teal']
/** Stable per member, independent of theme and legacy avatar_color. */
export function memberAvatarColor(memberId: string): string {
  let hash = 0
  for (const char of memberId) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0
  return `var(--p-${palette[hash % palette.length]}-700)`
}
