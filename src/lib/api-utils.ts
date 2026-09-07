const MAX_LIMIT = 5000;

export function parseLimit(searchParams: URLSearchParams, defaultValue = 50): number {
  const raw = parseInt(searchParams.get("limit") ?? String(defaultValue));
  if (!Number.isFinite(raw) || raw <= 0) return defaultValue;
  return Math.min(raw, MAX_LIMIT);
}
