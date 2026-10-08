export function visibleStreak(count: number, lastActivityDate: string | null, now = new Date()): number {
  if (!lastActivityDate || count < 1) return 0
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const lastActivity = new Date(`${lastActivityDate}T00:00:00.000Z`).getTime()
  const daysSince = Math.floor((today - lastActivity) / 86_400_000)
  return daysSince >= 0 && daysSince <= 1 ? count : 0
}
