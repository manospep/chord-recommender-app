import { useState, useCallback } from "react";

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const v = typeof value === "function" ? (value as (prev: T) => T)(stored) : value;
      setStored(v);
      if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(v));
      }
    } catch {}
  }, [key, stored]);

  return [stored, setValue];
}
