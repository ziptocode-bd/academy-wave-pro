import { collection, getDocs, getDoc, doc, query, where, QueryConstraint, Firestore, DocumentData, Timestamp } from "firebase/firestore";

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

// Default TTLs in milliseconds
const TTL = {
  courses: 10 * 60 * 1000,
  videos: 5 * 60 * 1000,
  settings: 30 * 60 * 1000,
  users: 2 * 60 * 1000,
  exams: 5 * 60 * 1000,
  enrollRequests: 2 * 60 * 1000,
  default: 5 * 60 * 1000,
};

const memoryCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<any>>();

function getCacheTTL(collectionName: string): number {
  return TTL[collectionName as keyof typeof TTL] || TTL.default;
}

function getLocalStorageKey(key: string): string {
  return `fsc_${key}`;
}

// Serialize Firestore Timestamp -> tagged plain object before JSON.stringify
function serializeData(data: any): any {
  if (data === null || data === undefined) return data;
  if (data instanceof Timestamp) {
    return { __ts: true, seconds: data.seconds, nanoseconds: data.nanoseconds };
  }
  if (Array.isArray(data)) return data.map(serializeData);
  if (typeof data === "object") {
    // Already-tagged or plain timestamp-like obj
    if (data.__ts) return data;
    const out: any = {};
    for (const k of Object.keys(data)) out[k] = serializeData(data[k]);
    return out;
  }
  return data;
}

// Deserialize tagged plain object -> Firestore Timestamp after JSON.parse
function deserializeData(data: any): any {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(deserializeData);
  if (typeof data === "object") {
    if (data.__ts && typeof data.seconds === "number") {
      return new Timestamp(data.seconds, data.nanoseconds || 0);
    }
    // Backward-compat: untagged {seconds,nanoseconds} from old caches
    if (
      typeof data.seconds === "number" &&
      typeof data.nanoseconds === "number" &&
      Object.keys(data).length === 2
    ) {
      return new Timestamp(data.seconds, data.nanoseconds);
    }
    const out: any = {};
    for (const k of Object.keys(data)) out[k] = deserializeData(data[k]);
    return out;
  }
  return data;
}

function getFromLocalStorage<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(getLocalStorageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { timestamp: parsed.timestamp, data: deserializeData(parsed.data) };
  } catch {
    return null;
  }
}

function setToLocalStorage<T>(key: string, data: T): void {
  try {
    const entry = { data: serializeData(data), timestamp: Date.now() };
    localStorage.setItem(getLocalStorageKey(key), JSON.stringify(entry));
  } catch {
    clearOldCache();
  }
}

function clearOldCache(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith("fsc_"));
  keys.forEach(k => localStorage.removeItem(k));
}

function isFresh(entry: CacheEntry | null, collectionName: string): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < getCacheTTL(collectionName);
}

export async function getCachedCollection<T extends { id: string }>(
  dbInstance: Firestore,
  collectionName: string,
  constraints?: QueryConstraint[],
  cacheKeySuffix?: string
): Promise<T[]> {
  const cacheKey = `col_${collectionName}${cacheKeySuffix ? `_${cacheKeySuffix}` : ""}`;

  const memEntry = memoryCache.get(cacheKey);
  if (isFresh(memEntry, collectionName)) {
    return memEntry!.data as T[];
  }

  const lsEntry = getFromLocalStorage<T[]>(cacheKey);
  if (isFresh(lsEntry, collectionName)) {
    memoryCache.set(cacheKey, lsEntry!);
    return lsEntry!.data;
  }

  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const ref = collection(dbInstance, collectionName);
      const q = constraints?.length ? query(ref, ...constraints) : ref;
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as T));

      const entry: CacheEntry<T[]> = { data, timestamp: Date.now() };
      memoryCache.set(cacheKey, entry);
      setToLocalStorage(cacheKey, data);

      return data;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export async function getCachedDoc<T>(
  dbInstance: Firestore,
  collectionName: string,
  docId: string
): Promise<T | null> {
  const cacheKey = `doc_${collectionName}_${docId}`;

  const memEntry = memoryCache.get(cacheKey);
  if (isFresh(memEntry, collectionName)) {
    return memEntry!.data as T;
  }

  const lsEntry = getFromLocalStorage<T>(cacheKey);
  if (isFresh(lsEntry, collectionName)) {
    memoryCache.set(cacheKey, lsEntry!);
    return lsEntry!.data;
  }

  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const snap = await getDoc(doc(dbInstance, collectionName, docId));
      if (!snap.exists()) return null;
      const data = { id: snap.id, ...snap.data() } as T;

      const entry: CacheEntry<T> = { data, timestamp: Date.now() };
      memoryCache.set(cacheKey, entry);
      setToLocalStorage(cacheKey, data);

      return data;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export function invalidateCache(collectionName?: string): void {
  if (collectionName) {
    const prefixes = [`col_${collectionName}`, `doc_${collectionName}`];
    for (const key of memoryCache.keys()) {
      if (prefixes.some(p => key.startsWith(p))) {
        memoryCache.delete(key);
      }
    }
    const lsKeys = Object.keys(localStorage).filter(k =>
      prefixes.some(p => k.startsWith(`fsc_${p}`))
    );
    lsKeys.forEach(k => localStorage.removeItem(k));
  } else {
    memoryCache.clear();
    clearOldCache();
  }
}

export function prewarmCache(dbInstance: Firestore, collections: string[]): void {
  collections.forEach(col => {
    getCachedCollection(dbInstance, col).catch(() => {});
  });
}
