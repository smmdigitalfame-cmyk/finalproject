// Keep image conversion and network transfers bounded across all upload surfaces.
export function createUploadQueue(limit = 2) {
  let active = 0;
  const waiting: Array<() => void> = [];
  return async function run<T>(work: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>(resolve => waiting.push(resolve));
    else active++;
    try { return await work(); }
    finally {
      const next = waiting.shift();
      if (next) next(); else active--;
    }
  };
}

export function isTransientUploadError(error: { statusCode?: string | number; status?: number; message?: string }) {
  const status = Number(error.statusCode ?? error.status);
  return status === 429 || status >= 500 && status <= 599 || (!Number.isFinite(status) && /network|failed to fetch|fetch failed/i.test(error.message ?? ""));
}