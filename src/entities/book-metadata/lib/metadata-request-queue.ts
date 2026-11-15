interface QueuedRequest<T> {
  priority: number;
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export class MetadataRequestQueue {
  private readonly pending: Array<QueuedRequest<unknown>> = [];
  private active = 0;
  private peak = 0;

  constructor(private readonly concurrency: number) {}

  enqueue<T>(run: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.push({
        priority,
        run,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.pending.sort((left, right) => right.priority - left.priority);
      this.drain();
    });
  }

  get activeCount() { return this.active; }
  get peakActiveCount() { return this.peak; }

  private drain() {
    while (this.active < this.concurrency && this.pending.length > 0) {
      const request = this.pending.shift();
      if (!request) return;
      this.active += 1;
      this.peak = Math.max(this.peak, this.active);
      void request.run()
        .then(request.resolve, request.reject)
        .finally(() => {
          this.active -= 1;
          this.drain();
        });
    }
  }
}

export const metadataRequestQueue = new MetadataRequestQueue(3);

export function queuedJsonRequest<T>(url: string, priority: number): Promise<T> {
  return metadataRequestQueue.enqueue(async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Metadata request failed with HTTP ${response.status}`);
      return await response.json() as T;
    } finally {
      window.clearTimeout(timeout);
    }
  }, priority);
}
