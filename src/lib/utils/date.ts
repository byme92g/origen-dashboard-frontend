const LIMA = 'America/Lima';

// Format a datetime string from the backend as Lima date + time (e.g. "14/05/26 02:21 p. m.")
export function fmtDatetime(s: string | null | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: LIMA })
    + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: LIMA });
}

// Format a datetime string from the backend as Lima date only (e.g. "14/05/26")
export function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: LIMA });
}

// Format a datetime string from the backend as Lima time only (e.g. "02:21 p. m.")
export function fmtTime(s: string | null | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: LIMA });
}

// Format a date-only field (e.g. egreso.fecha stored as "2026-05-14T00:00:00")
// Extracts the date part directly without timezone conversion to avoid day shifts.
export function fmtDateField(s: string | null | undefined): string {
  if (!s) return '—';
  const part = String(s).split('T')[0];
  const [y, m, d] = part.split('-');
  if (!y || !m || !d) return String(s);
  return `${d}/${m}/${y.slice(-2)}`;
}

// Today's date in Lima as YYYY-MM-DD (for use as API filter defaults)
export function limaTodayStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: LIMA });
}

// Date N days ago in Lima as YYYY-MM-DD
export function limaDaysAgoStr(days: number): string {
  return new Date(Date.now() - days * 86400000).toLocaleDateString('en-CA', { timeZone: LIMA });
}

// Current hour in Lima (0-23)
export function limaHour(): number {
  return parseInt(new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: false, timeZone: LIMA }).format(new Date()), 10);
}

// Milliseconds until 6 PM Lima time today (0 if already past 6 PM)
export function msUntilLima6PM(): number {
  const limaToday = limaTodayStr();
  const lima6PM = new Date(`${limaToday}T18:00:00-05:00`);
  return Math.max(0, lima6PM.getTime() - Date.now());
}

// YYYY-MM-DD string for a Lima date computed from a Date object
export function limaDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: LIMA });
}
