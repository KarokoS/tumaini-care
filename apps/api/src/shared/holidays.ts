// Kenya Public Holidays — updated annually
// Format: MM-DD (month-day, year-independent) + specific year dates

export function isKenyaPublicHoliday(date: Date): boolean {
  const year  = date.getFullYear()
  const month = date.getMonth() + 1
  const day   = date.getDate()
  const md    = `${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`

  // Fixed annual holidays
  const fixed = [
    "01-01", // New Year's Day
    "05-01", // Labour Day
    "06-01", // Madaraka Day
    "10-10", // Huduma Day
    "10-20", // Mashujaa Day
    "12-12", // Jamhuri Day
    "12-25", // Christmas Day
    "12-26", // Boxing Day
  ]

  if (fixed.includes(md)) return true

  // Good Friday and Easter Monday (variable — calculated per year)
  const easterDates: Record<number, { goodFriday: string; easterMonday: string }> = {
    2024: { goodFriday: "03-29", easterMonday: "04-01" },
    2025: { goodFriday: "04-18", easterMonday: "04-21" },
    2026: { goodFriday: "04-03", easterMonday: "04-06" },
    2027: { goodFriday: "03-26", easterMonday: "03-29" },
    2028: { goodFriday: "04-14", easterMonday: "04-17" },
    2029: { goodFriday: "03-30", easterMonday: "04-02" },
    2030: { goodFriday: "04-19", easterMonday: "04-22" },
  }

  const easter = easterDates[year]
  if (easter && (md === easter.goodFriday || md === easter.easterMonday)) return true

  // Idd ul Fitr and Idd ul Adha (approximate — gazetted annually)
  // These are approximate; actual dates depend on moon sighting
  const idds: Record<number, string[]> = {
    2024: ["04-10", "06-17"],
    2025: ["03-31", "06-07"],
    2026: ["03-20", "05-27"],
    2027: ["03-09", "05-17"],
    2028: ["02-26", "05-05"],
  }

  const iddDates = idds[year] ?? []
  if (iddDates.includes(md)) return true

  return false
}

export function generateRecurringDates(
  startDate:   Date,
  pattern:     "WEEKLY" | "FORTNIGHTLY" | "CUSTOM",
  customDays:  number[], // 0=Sun,1=Mon,...,6=Sat — used for CUSTOM
  weeks:       number    // how many weeks to generate (12 = one term)
): Date[] {
  const dates: Date[] = []
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + weeks * 7)

  if (pattern === "WEEKLY") {
    const current = new Date(startDate)
    while (current <= endDate) {
      if (!isKenyaPublicHoliday(current)) {
        dates.push(new Date(current))
      }
      current.setDate(current.getDate() + 7)
    }
  }

  if (pattern === "FORTNIGHTLY") {
    const current = new Date(startDate)
    let count = 0
    while (current <= endDate) {
      if (!isKenyaPublicHoliday(current)) {
        dates.push(new Date(current))
      }
      current.setDate(current.getDate() + 14)
      count++
    }
  }

  if (pattern === "CUSTOM" && customDays.length > 0) {
    const current = new Date(startDate)
    current.setDate(current.getDate() - current.getDay()) // go to Sunday of start week
    while (current <= endDate) {
      for (const dayOfWeek of customDays) {
        const candidate = new Date(current)
        candidate.setDate(current.getDate() + dayOfWeek)
        if (candidate >= startDate && candidate <= endDate && !isKenyaPublicHoliday(candidate)) {
          dates.push(new Date(candidate))
        }
      }
      current.setDate(current.getDate() + 7)
    }
    dates.sort((a, b) => a.getTime() - b.getTime())
  }

  return dates
}