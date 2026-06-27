/**
 * Lightweight client-side in-memory data store for dashboard tabs.
 * Allows instant navigation between tabs without triggering full-page loading spinners.
 */

const cacheStore = new Map<string, { data: any; timestamp: number }>();

export const dashboardCache = {
  get<T>(key: string, maxAgeMs = 60000): T | null {
    const entry = cacheStore.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > maxAgeMs) {
      // Expired, but return stale data if requested or return null to trigger fresh fetch
      return entry.data as T;
    }
    return entry.data as T;
  },

  set(key: string, data: any) {
    cacheStore.set(key, { data, timestamp: Date.now() });
  },

  clear(key?: string) {
    if (key) {
      cacheStore.delete(key);
    } else {
      cacheStore.clear();
    }
  },
};
