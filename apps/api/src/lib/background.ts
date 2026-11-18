/**
 * Work that runs after the response was sent (e.g. push notifications).
 * The user never waits for it and it never fails their request, but we keep track of it
 * so that a server shutdown — or the end of a test — can wait until it has finished.
 */
export class BackgroundTasks {
  private readonly running = new Set<Promise<void>>();

  constructor(private readonly onError: (error: unknown) => void) {}

  run(work: Promise<void>): void {
    const task = work.catch(this.onError).finally(() => this.running.delete(task));
    this.running.add(task);
  }

  /** Resolves when everything started so far has finished. */
  async drain(): Promise<void> {
    while (this.running.size > 0) {
      await Promise.allSettled([...this.running]);
    }
  }
}
