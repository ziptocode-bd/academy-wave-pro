// Lightweight video progress tracking using localStorage.
// Key: vp_{userId}_{videoId} -> { time, duration, updatedAt }

export interface VideoProgress {
  time: number;
  duration: number;
  updatedAt: number;
}

const KEY_PREFIX = "vp_";

function key(userId: string, videoId: string) {
  return `${KEY_PREFIX}${userId}_${videoId}`;
}

export function saveProgress(userId: string, videoId: string, time: number, duration: number) {
  if (!userId || !videoId || !duration || !isFinite(duration)) return;
  try {
    const data: VideoProgress = { time, duration, updatedAt: Date.now() };
    localStorage.setItem(key(userId, videoId), JSON.stringify(data));
  } catch {
    /* quota - ignore */
  }
}

export function getProgress(userId: string, videoId: string): VideoProgress | null {
  if (!userId || !videoId) return null;
  try {
    const raw = localStorage.getItem(key(userId, videoId));
    if (!raw) return null;
    return JSON.parse(raw) as VideoProgress;
  } catch {
    return null;
  }
}

export function clearProgress(userId: string, videoId: string) {
  try {
    localStorage.removeItem(key(userId, videoId));
  } catch {
    /* ignore */
  }
}

// Returns 0..1 ratio watched, or 0 if unknown.
export function getProgressRatio(userId: string, videoId: string): number {
  const p = getProgress(userId, videoId);
  if (!p || !p.duration) return 0;
  return Math.min(1, p.time / p.duration);
}

export function isCompleted(userId: string, videoId: string, threshold = 0.8): boolean {
  return getProgressRatio(userId, videoId) >= threshold;
}
