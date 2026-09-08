// Sets/sessions dated before this are hidden from the UI (data stays in the
// database — this is a display-only cutoff for old, messy early logging).
export const PRESENTATION_CUTOFF_DATE = "2026-03-01";

export function isBeforeCutoff(dateStr) {
  return dateStr < PRESENTATION_CUTOFF_DATE;
}
