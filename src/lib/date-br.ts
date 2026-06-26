const TIME_ZONE = "America/Sao_Paulo";

// The server runs in UTC, but the business operates in Brazil time. Using UTC dates directly
// makes "today" roll over up to 3 hours early (e.g. 21:00 BRT already counts as tomorrow in UTC),
// which silently zeroes out "today" stats right when people are checking them at night.
export function dateBR(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

export function todayBR(): string {
  return dateBR(new Date());
}
