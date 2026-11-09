export type ClosetSummary = { likedCount: number; cartCount: number };
export type ClosetCountState = "loading" | "unavailable" | "stale" | "refreshing" | "current";

// Matches the maximum current catalog, not the 1,000-row collection page cap.
const MAX_CATALOG_PRODUCTS = 5_000;

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0 &&
    (value as number) <= MAX_CATALOG_PRODUCTS;
}

export function parseClosetSummary(value: unknown): ClosetSummary {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("My Closet counts are unavailable.");
  }
  const { likedCount, cartCount } = value as Record<string, unknown>;
  if (!isCount(likedCount) || !isCount(cartCount)) {
    throw new Error("My Closet counts are unavailable.");
  }
  return { likedCount, cartCount };
}

export function getClosetCountState(
  summary: ClosetSummary | undefined,
  failed: boolean,
  fetching: boolean,
): ClosetCountState {
  if (failed) return summary ? "stale" : "unavailable";
  if (!summary) return "loading";
  return fetching ? "refreshing" : "current";
}

export function getClosetCountLabel(
  label: string,
  count: number | undefined,
  state: ClosetCountState,
): string {
  if (count === undefined) {
    return `${label}, count ${state === "loading" ? "loading" : "unavailable"}`;
  }
  const qualifier = state === "stale" || state === "refreshing"
    ? ", last known count"
    : "";
  return `${label}, ${count} ${count === 1 ? "item" : "items"}${qualifier}`;
}
