/**
 * Serialises a read-modify-write among contexts of one origin (all idealo tabs; all extension
 * pages) through the Web Locks API; runs `task` unguarded where it is missing. Content scripts and
 * extension pages have different origins, so a lock does not span both.
 */
export const withLock = async <T>(name: string, task: () => Promise<T>): Promise<T> =>
  globalThis.navigator?.locks ? await navigator.locks.request(name, task) : task();
