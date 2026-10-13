/**
 * Keeps game objects for reuse, so a big horde doesn't create and destroy sprites every frame.
 * `take` hands out a free object (making one only when none is free); `release` puts it back.
 */
export class Pool<T extends { alive: boolean }> {
  /** Every object the pool has made, alive or free. */
  readonly all: T[] = [];
  private free: T[] = [];

  constructor(
    private make: () => T,
    private onRelease: (item: T) => void,
  ) {}

  take(): T {
    const item = this.free.pop() ?? this.add();
    item.alive = true;
    return item;
  }

  release(item: T) {
    if (!item.alive) return;
    item.alive = false;
    this.onRelease(item);
    this.free.push(item);
  }

  /** The objects in play. */
  live() {
    return this.all.filter((item) => item.alive);
  }

  private add() {
    const item = this.make();
    this.all.push(item);
    return item;
  }
}
