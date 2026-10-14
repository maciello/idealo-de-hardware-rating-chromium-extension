import { useEffect, useState } from "react";

/** Structural slice of a WxtStorageItem, so options code is independent of its metadata type. */
export interface StoredItem<T> {
  getValue(): Promise<T>;
  setValue(value: T): Promise<void>;
  removeValue(): Promise<void>;
  watch(callback: (value: T) => void): () => void;
}

/**
 * Live value of a storage item (`undefined` until the first read completes) plus an optimistic
 * setter: the UI updates immediately, storage and other contexts follow.
 */
export function useStorageItem<T>(
  item: StoredItem<T>,
): readonly [T | undefined, (next: T) => void] {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    let active = true;
    let watched = false;
    void item.getValue().then((initial) => {
      if (active && !watched) setValue(initial);
    });
    const unwatch = item.watch((next) => {
      watched = true;
      setValue(next);
    });
    return () => {
      active = false;
      unwatch();
    };
  }, [item]);
  const set = (next: T): void => {
    setValue(next);
    void item.setValue(next);
  };
  return [value, set];
}
