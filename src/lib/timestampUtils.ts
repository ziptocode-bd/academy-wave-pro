import { Timestamp } from "firebase/firestore";

/**
 * Safely convert any timestamp-like value to a JS Date.
 * Handles: Firestore Timestamp, plain objects from cache ({seconds, nanoseconds}), Date, number (ms).
 */
export function safeToDate(ts: any): Date | null {
  if (!ts) return null;
  // Native Firestore Timestamp
  if (ts instanceof Timestamp) return ts.toDate();
  if (typeof ts?.toDate === "function") return ts.toDate();
  // Plain object from localStorage cache
  if (typeof ts === "object" && "seconds" in ts) {
    return new Date(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6);
  }
  // Already a Date
  if (ts instanceof Date) return ts;
  // Number (milliseconds)
  if (typeof ts === "number") return new Date(ts);
  // ISO string
  if (typeof ts === "string") return new Date(ts);
  return null;
}

/**
 * Safely get milliseconds from any timestamp-like value.
 */
export function safeToMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts?.toMillis === "function") return ts.toMillis();
  const date = safeToDate(ts);
  return date ? date.getTime() : 0;
}
