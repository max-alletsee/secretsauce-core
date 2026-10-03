export function pythonWeekday(jsWeekday: number): number {
  return (jsWeekday + 6) % 7
}

export function weekdayName(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en', { weekday: 'long' })
}
